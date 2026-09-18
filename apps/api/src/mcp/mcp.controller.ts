import { Controller, Get, Headers, Inject, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { Public } from "../auth/public.js";
import { PrismaService } from "../prisma.service.js";

const ALLOWED = ["upsert_article", "add_anchor", "trigger_generate", "read_article"];

@Public()
@Controller("mcp")
export class McpController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get("tools")
  async tools(@Headers("authorization") auth?: string) {
    const raw = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!raw) throw new UnauthorizedException("需要运营签发的 MCP 令牌");
    const hash = createHash("sha256").update(raw).digest("hex");
    const row = await this.prisma.mcpToken.findUnique({ where: { tokenHash: hash } });
    if (!row?.enabled) throw new UnauthorizedException("令牌无效或已吊销");
    const tools = (row.tools.length ? row.tools : ALLOWED).filter((t) => ALLOWED.includes(t) && t !== "publish");
    return { tools, note: "无 publish。与 C 端同一套锚点门闩。" };
  }
}
