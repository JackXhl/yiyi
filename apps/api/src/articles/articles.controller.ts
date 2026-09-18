import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Inject,
} from "@nestjs/common";
import { ARTICLE_STATUS_LABEL, Anchor, canCopy, canGenerate } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";
import { GenerateService } from "../generate/generate.service.js";

function statusLabel(status: string) {
  return ARTICLE_STATUS_LABEL[status as keyof typeof ARTICLE_STATUS_LABEL] ?? "草稿";
}

@Controller("articles")
export class ArticlesController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GenerateService) private readonly generate: GenerateService,
  ) {}

  @Get()
  async list(@Req() req: { user: { sub: string } }, @Query("status") status?: string) {
    const where: { userId: string; status?: string } = { userId: req.user.sub };
    if (status === "草稿") where.status = "draft";
    if (status === "已成稿") where.status = "ready";
    const items = await this.prisma.article.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { assets: { take: 1, orderBy: { sort: "asc" } } },
    });
    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title || "未命名",
        status: statusLabel(a.status),
        cover: a.assets[0] ? `/uploads/${a.assets[0].path}` : null,
        updatedAt: a.updatedAt,
      })),
    };
  }

  @Post()
  async create(@Req() req: { user: { sub: string } }) {
    const article = await this.prisma.article.create({
      data: {
        userId: req.user.sub,
        anchors: [
          { id: "a1", text: "", confirmed: false },
          { id: "a2", text: "", confirmed: false },
        ],
      },
    });
    return this.detailPayload(article.id, req.user.sub);
  }

  @Get(":id")
  async detail(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    return this.detailPayload(id, req.user.sub);
  }

  @Patch(":id")
  async patch(
    @Req() req: { user: { sub: string } },
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      theme?: string;
      formCode?: string;
      intentCode?: string;
      topicCodes?: string[];
      anchors?: Anchor[];
      outline?: string;
      bodyLong?: string;
      bodyNote?: string;
      currentNode?: string;
      styleCode?: string;
      layout?: unknown;
      disclosureAck?: boolean;
      highRiskAck?: boolean;
    },
  ) {
    await this.owned(id, req.user.sub);
    await this.prisma.article.update({
      where: { id },
      data: {
        ...(body.title != null ? { title: body.title } : {}),
        ...(body.theme != null ? { theme: body.theme } : {}),
        ...(body.formCode != null ? { formCode: body.formCode } : {}),
        ...(body.intentCode != null ? { intentCode: body.intentCode } : {}),
        ...(body.topicCodes != null ? { topicCodes: body.topicCodes } : {}),
        ...(body.anchors != null ? { anchors: body.anchors } : {}),
        ...(body.outline != null ? { outline: body.outline } : {}),
        ...(body.bodyLong != null ? { bodyLong: body.bodyLong } : {}),
        ...(body.bodyNote != null ? { bodyNote: body.bodyNote } : {}),
        ...(body.currentNode != null ? { currentNode: body.currentNode } : {}),
        ...(body.styleCode != null ? { styleCode: body.styleCode } : {}),
        ...(body.layout != null ? { layout: body.layout } : {}),
        ...(body.disclosureAck != null ? { disclosureAck: body.disclosureAck } : {}),
        ...(body.highRiskAck != null ? { highRiskAck: body.highRiskAck } : {}),
      },
    });
    return this.detailPayload(id, req.user.sub);
  }

  @Post(":id/generate")
  async run(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    await this.owned(id, req.user.sub);
    await this.generate.run(id, req.user.sub);
    return this.detailPayload(id, req.user.sub);
  }

  @Get(":id/copy-pack")
  async copyPack(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    const article = await this.owned(id, req.user.sub);
    const anchors = (article.anchors as Anchor[]) ?? [];
    const highRisk =
      article.intentCode === "intent.promo" ||
      JSON.stringify(article.checkReport).includes("high");
    const gate = canCopy({
      disclosureAck: article.disclosureAck,
      highRisk,
      highRiskAck: article.highRiskAck,
    });
    if (!gate.ok) throw new ForbiddenException(gate.reason);
    const assets = await this.prisma.asset.findMany({
      where: { articleId: id },
      orderBy: { sort: "asc" },
    });
    return {
      longHtml: article.bodyLong,
      noteText: article.bodyNote,
      images: assets
        .filter((a) => a.kind === "image")
        .map((a, i) => ({ n: i + 1, url: `/uploads/${a.path}`, cover: i === 0 })),
      backends: [
        { name: "微信公众平台", url: "https://mp.weixin.qq.com/" },
        { name: "小红书创作中心", url: "https://creator.xiaohongshu.com/" },
      ],
    };
  }

  private async owned(id: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article || article.userId !== userId) throw new BadRequestException("找不到这篇稿");
    return article;
  }

  private async detailPayload(id: string, userId: string) {
    const article = await this.owned(id, userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { plan: true },
    });
    const quota = user.plan?.monthlyQuota ?? 2;
    const gate = canGenerate({
      anchors: (article.anchors as Anchor[]) ?? [],
      quotaLeft: Math.max(0, quota - user.quotaUsed),
      subActive: !!user.subExpiresAt && user.subExpiresAt.getTime() > Date.now(),
    });
    const assets = await this.prisma.asset.findMany({
      where: { articleId: id },
      orderBy: { sort: "asc" },
    });
    return {
      ...article,
      statusLabel: statusLabel(article.status),
      generateBlocked: gate.ok ? null : gate.reason,
      assets: assets.map((a) => ({
        id: a.id,
        kind: a.kind,
        url: `/uploads/${a.path}`,
        analysis: a.analysis,
        confirmed: a.confirmed,
      })),
    };
  }
}
