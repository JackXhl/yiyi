import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Post,
  UnauthorizedException,
  HttpException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { Anchor, hitLimiter, mcpCallSchema } from "@yiyi/shared";
import { Public } from "../auth/public.js";
import { PrismaService } from "../prisma.service.js";
import { GenerateService } from "../generate/generate.service.js";

export const MCP_ALLOWED = ["upsert_article", "add_anchor", "trigger_generate", "read_article"] as const;
const mcpHits = new Map<string, number[]>();

@Public()
@Controller("mcp")
export class McpController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GenerateService) private readonly generate: GenerateService,
  ) {}

  @Get("tools")
  async tools(@Headers("authorization") auth?: string) {
    const row = await this.token(auth);
    return { tools: row.tools.length ? row.tools : [...MCP_ALLOWED], note: "无 publish。调用 POST /api/mcp/call，与 C 端同一套锚点门闩。" };
  }

  @Post("call")
  async call(@Headers("authorization") auth: string | undefined, @Body() raw: unknown) {
    const row = await this.token(auth);
    const body = mcpCallSchema.parse(raw);
    const tool = body.tool;
    if (row.tools.length && !row.tools.includes(tool)) throw new ForbiddenException("令牌未授权该工具");
    const args = body.args ?? {};
    if (tool === "read_article") return this.readArticle(String(args.id || ""));
    if (tool === "add_anchor") return this.addAnchor(String(args.id || ""), String(args.text || ""));
    if (tool === "upsert_article") return this.upsert(args);
    if (tool === "trigger_generate") return this.trigger(String(args.id || ""));
    throw new ForbiddenException("工具不在白名单");
  }

  private async token(auth?: string) {
    const raw = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!raw) throw new UnauthorizedException("需要运营生成的访问令牌");
    const hash = createHash("sha256").update(raw).digest("hex");
    const row = await this.prisma.mcpToken.findUnique({ where: { tokenHash: hash } });
    if (!row?.enabled) throw new UnauthorizedException("令牌无效或已作废");
    if (!hitLimiter(mcpHits, hash.slice(0, 16), 30, 60_000)) {
      throw new HttpException("请稍后再试", 429);
    }
    return row;
  }

  private async readArticle(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BadRequestException("找不到这篇作品");
    return {
      id: article.id,
      theme: article.theme,
      status: article.status,
      anchors: article.anchors,
      title: article.title,
    };
  }

  private async addAnchor(id: string, text: string) {
    if (text.trim().length < 4) throw new BadRequestException("这一条事实依据至少要 4 个字");
    if (text.trim().length > 2000) throw new BadRequestException("这一条太长了");
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BadRequestException("找不到这篇作品");
    if (article.status === "generating") throw new ForbiddenException("正在写，请稍等");
    const anchors = ([...(article.anchors as Anchor[])] || []) as Anchor[];
    const empty = anchors.find((a) => !a.text.trim());
    if (anchors.length >= 8 && !empty) throw new BadRequestException("事实依据最多 8 条");
    if (empty) {
      empty.text = text.trim();
      empty.confirmed = true;
    } else {
      anchors.push({ id: `mcp-${Date.now()}`, text: text.trim(), confirmed: true });
    }
    await this.prisma.article.update({ where: { id }, data: { anchors } });
    return { ok: true };
  }

  private async upsert(args: Record<string, unknown>) {
    const id = String(args.id || "");
    if (id) {
      const existing = await this.prisma.article.findUnique({ where: { id } });
      if (!existing) throw new BadRequestException("找不到这篇作品");
      if (existing.status === "generating") throw new ForbiddenException("正在写，请稍等");
      await this.prisma.article.update({
        where: { id },
        data: {
          ...(args.theme != null ? { theme: String(args.theme).slice(0, 200) } : {}),
          ...(args.formCode != null ? { formCode: String(args.formCode) } : {}),
          ...(args.intentCode != null ? { intentCode: String(args.intentCode) } : {}),
          ...(Array.isArray(args.topicCodes) ? { topicCodes: args.topicCodes.map(String) } : {}),
        },
      });
      return { id };
    }
    const email = String(args.userEmail || "").toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException("找不到用户");
    const created = await this.prisma.article.create({
      data: {
        userId: user.id,
        theme: String(args.theme || "").slice(0, 200),
        formCode: String(args.formCode || "form.both"),
        intentCode: String(args.intentCode || "intent.story"),
        topicCodes: Array.isArray(args.topicCodes) ? args.topicCodes.map(String) : [],
        anchors: [
          { id: "a1", text: "", confirmed: false },
          { id: "a2", text: "", confirmed: false },
        ],
      },
    });
    return { id: created.id };
  }

  private async trigger(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new BadRequestException("找不到这篇作品");
    await this.generate.run(id, article.userId);
    return { ok: true };
  }
}
