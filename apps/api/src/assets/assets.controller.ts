import {
  BadRequestException,
  Body,
  Controller,
  Inject,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { PrismaService } from "../prisma.service.js";
import { LlmService } from "../generate/llm.service.js";

@Controller("articles/:id/assets")
export class AssetsController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  @Post()
  @UseInterceptors(
    FilesInterceptor("files", 10, {
      storage: diskStorage({
        destination: join(process.cwd(), "uploads"),
        filename: (_req, file, cb) => cb(null, randomUUID() + extname(file.originalname || ".bin")),
      }),
    }),
  )
  async upload(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const article = await this.prisma.article.findFirst({ where: { id, userId: req.user.sub } });
    if (!article) throw new BadRequestException("找不到这篇稿");
    const existing = await this.prisma.asset.findMany({ where: { articleId: id } });
    const incoming = files ?? [];
    const newImages = incoming.filter((f) => !f.mimetype.startsWith("video")).length;
    const newVideos = incoming.filter((f) => f.mimetype.startsWith("video")).length;
    const imageCount = existing.filter((a) => a.kind === "image").length + newImages;
    const videoCount = existing.filter((a) => a.kind === "video").length + newVideos;
    if (imageCount > 9) throw new BadRequestException("图片最多 9 张");
    if (videoCount > 1) throw new BadRequestException("短视频最多 1 条");
    const created = [];
    const baseSort = existing.length;
    for (const [i, file] of incoming.entries()) {
      const kind = file.mimetype.startsWith("video") ? "video" : "image";
      const analysis = await this.analyze(kind, file);
      const row = await this.prisma.asset.create({
        data: {
          articleId: id,
          kind,
          path: file.filename,
          mime: file.mimetype,
          analysis,
          sort: baseSort + i,
        },
      });
      created.push(row);
    }
    return { items: created };
  }

  @Post("reorder")
  async reorder(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body() body: { ids: string[] },
  ) {
    const article = await this.prisma.article.findFirst({ where: { id, userId: req.user.sub } });
    if (!article) throw new BadRequestException("找不到这篇稿");
    const ids = body.ids ?? [];
    await this.prisma.$transaction(
      ids.map((assetId, sort) =>
        this.prisma.asset.updateMany({ where: { id: assetId, articleId: id }, data: { sort } }),
      ),
    );
    return { ok: true };
  }

  @Post(":assetId/confirm")
  async confirm(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Param("assetId") assetId: string,
    @Body() body: { asAnchor?: boolean },
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, article: { id, userId: req.user.sub } },
    });
    if (!asset) throw new Error("找不到素材");
    await this.prisma.asset.update({ where: { id: assetId }, data: { confirmed: true } });
    if (body.asAnchor) {
      const article = await this.prisma.article.findUniqueOrThrow({ where: { id } });
      const anchors = (article.anchors as { id: string; text: string; confirmed: boolean; fromAssetId?: string }[]) ?? [];
      const text =
        (asset.analysis as { caption?: string } | null)?.caption ||
        `这是我拍的${asset.kind === "video" ? "短视频" : "现场照片"}，画面里的东西我确认过。`;
      const next = [...anchors];
      const empty = next.find((a) => !a.text.trim());
      if (empty) {
        empty.text = text;
        empty.confirmed = true;
        empty.fromAssetId = asset.id;
      } else {
        next.push({ id: `m-${asset.id}`, text, confirmed: true, fromAssetId: asset.id });
      }
      await this.prisma.article.update({ where: { id }, data: { anchors: next } });
    }
    return { ok: true };
  }

  private async analyze(kind: string, file: Express.Multer.File) {
    let image: Buffer | undefined;
    if (kind === "image" && file.size < 4_000_000) {
      try {
        image = await readFile(file.path);
      } catch {
        image = undefined;
      }
    }
    const hinted = await this.llm.complete(
      "vision",
      `用一两句中文描述用户上传的${kind === "video" ? "短视频封面帧" : "照片"}里看得见的东西。看不见的文字、对话、数字不要写。`,
      image,
    );
    return {
      caption:
        hinted ||
        (kind === "video"
          ? "短视频（未跑视觉分析，请自己确认画面里有什么）"
          : "照片（未跑视觉分析，请自己确认画面里有什么）"),
      ocr: "",
    };
  }
}
