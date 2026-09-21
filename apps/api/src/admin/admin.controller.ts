import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import { credentialsSchema, canSetNodeRunMode, hitLimiter, PERMISSIONS } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";
import { GenerateService } from "../generate/generate.service.js";
import { AdminOnly, Public } from "../auth/public.js";

type AdminReq = { user: { sub: string; email: string } };
const adminHits = new Map<string, number[]>();

@AdminOnly()
@Controller("admin")
export class AdminController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(GenerateService) private readonly generate: GenerateService,
  ) {}

  @Public()
  @Post("login")
  async login(@Body() raw: unknown) {
    const body = credentialsSchema.parse(raw);
    if (!hitLimiter(adminHits, `admin:${body.email}`, 8, 60_000)) {
      throw new HttpException("请稍后再试", 429);
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { email: body.email } });
    if (!admin || admin.disabled || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码不对");
    }
    const token = this.jwt.sign({ sub: admin.id, email: admin.email, aud: "admin" });
    const perms = await this.permsOf(admin.id);
    return { token, admin: { id: admin.id, email: admin.email, permissions: perms } };
  }

  @Get("me")
  async me(@Req() req: AdminReq) {
    return { id: req.user.sub, email: req.user.email, permissions: await this.permsOf(req.user.sub) };
  }

  @Get("overview")
  async overview(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "overview:view");
    const [users, jobsFail, articles] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.generationJob.count({ where: { status: "failed" } }),
      this.prisma.article.count({ where: { createdAt: { gte: startOfDay() } } }),
    ]);
    return {
      stats: {
        users,
        articlesToday: articles,
        jobsFailed: jobsFail,
      },
    };
  }

  @Get("users")
  async users(@Req() req: AdminReq, @Query("q") q?: string) {
    await this.assertPerm(req.user.sub, "user:list");
    const items = await this.prisma.user.findMany({
      where: q ? { email: { contains: q, mode: "insensitive" } } : {},
      include: { plan: true, _count: { select: { articles: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      items: items.map((u) => ({
        id: u.id,
        email: u.email,
        disabled: u.disabled,
        planId: u.planId,
        planName: u.plan?.name ?? "—",
        articles: u._count.articles,
        subExpiresAt: u.subExpiresAt,
      })),
    };
  }

  @Post("users/:id/disable")
  async disable(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { disabled: boolean }) {
    await this.assertPerm(req.user.sub, "user:disable");
    await this.prisma.user.update({ where: { id }, data: { disabled: body.disabled } });
    await this.log(req.user.email, "user:disable", id);
    return { ok: true };
  }

  @Post("users/:id/reset-password")
  async reset(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { password: string }) {
    await this.assertPerm(req.user.sub, "user:reset");
    const password = credentialsSchema.shape.password.parse(body.password);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    await this.log(req.user.email, "user:reset", id);
    return { ok: true };
  }

  @Post("users/:id/plan")
  async setPlan(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { planId: string }) {
    await this.assertPerm(req.user.sub, "user:plan");
    await this.prisma.user.update({ where: { id }, data: { planId: body.planId } });
    await this.log(req.user.email, "user:plan", id);
    return { ok: true };
  }

  @Get("articles")
  async articles(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "article:inspect");
    const items = await this.prisma.article.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { email: true } } },
    });
    return {
      items: items.map((a) => ({
        id: a.id,
        email: mask(a.user.email),
        title: a.title || a.theme || "未命名",
        theme: a.theme,
        status: a.status,
        bodyLong: a.bodyLong,
        bodyNote: a.bodyNote,
        anchors: ((a.anchors as { text?: string }[]) || []).map((x) => x.text || "").filter(Boolean),
      })),
    };
  }

  @Get("plans")
  async plans(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "plan:edit");
    return this.prisma.plan.findMany({ orderBy: { priceFen: "asc" } });
  }

  @Patch("plans/:id")
  async patchPlan(
    @Req() req: AdminReq,
    @Body() body: { name?: string; monthlyQuota?: number; priceFen?: number; enabled?: boolean },
    @Param("id") id: string,
  ) {
    await this.assertPerm(req.user.sub, "plan:edit");
    return this.prisma.plan.update({ where: { id }, data: body });
  }

  @Get("orders")
  async orders(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "order:list");
    return this.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } }, plan: true },
    });
  }

  @Post("orders/:id/refund-mark")
  async refund(@Req() req: AdminReq, @Param("id") id: string) {
    await this.assertPerm(req.user.sub, "order:refund");
    const order = await this.prisma.order.update({ where: { id }, data: { status: "refunded" } });
    await this.prisma.user.update({
      where: { id: order.userId },
      data: { subExpiresAt: new Date() },
    });
    await this.log(req.user.email, "order:refund", id);
    return { ok: true };
  }

  @Get("jobs")
  async jobs(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "job:retry");
    return this.prisma.generationJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("jobs/:id/retry")
  async retry(@Req() req: AdminReq, @Param("id") id: string) {
    await this.assertPerm(req.user.sub, "job:retry");
    const job = await this.prisma.generationJob.findUniqueOrThrow({ where: { id } });
    if (job.status !== "failed") throw new ForbiddenException("只能重试失败任务");
    const article = await this.prisma.article.findUniqueOrThrow({ where: { id: job.articleId } });
    if (article.status === "generating") throw new ForbiddenException("正在写，请稍等");
    await this.generate.run(article.id, article.userId);
    await this.prisma.generationJob.update({ where: { id }, data: { status: "done" } });
    return { ok: true };
  }

  @Get("topic-options")
  async topicOptions(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "topic:edit");
    return this.prisma.topicOption.findMany({ orderBy: [{ axis: "asc" }, { sort: "asc" }] });
  }

  @Patch("topic-options/:id")
  async patchTopic(
    @Req() req: AdminReq,
    @Param("id") id: string,
    @Body() body: { labelZh?: string; enabled?: boolean; sort?: number },
  ) {
    await this.assertPerm(req.user.sub, "topic:edit");
    return this.prisma.topicOption.update({ where: { id }, data: body });
  }

  @Get("slots")
  async slots(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "slot:edit");
    const rows = await this.prisma.capabilitySlot.findMany();
    return rows.map((s) => ({ ...s, apiKey: s.apiKey ? "已保存" : "" }));
  }

  @Patch("slots/:slot")
  async patchSlot(
    @Req() req: AdminReq,
    @Param("slot") slot: string,
    @Body() body: { baseUrl?: string; model?: string; apiKey?: string },
  ) {
    await this.assertPerm(req.user.sub, "slot:edit");
    const row = await this.prisma.capabilitySlot.upsert({
      where: { slot },
      update: body,
      create: { slot, ...body },
    });
    return { ...row, apiKey: row.apiKey ? "已保存" : "" };
  }

  @Get("prompts")
  async prompts(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "prompt:edit");
    return this.prisma.promptTemplate.findMany();
  }

  @Patch("prompts/:id")
  async patchPrompt(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { body?: string }) {
    await this.assertPerm(req.user.sub, "prompt:edit");
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { ...(body.body != null ? { body: body.body, version: { increment: 1 } } : {}) },
    });
  }

  @Get("dag-nodes")
  async dagNodes(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "prompt:edit");
    return this.prisma.dagNodeConfig.findMany({ orderBy: { sort: "asc" } });
  }

  @Patch("dag-nodes/:node")
  async patchDagNode(
    @Req() req: AdminReq,
    @Param("node") node: string,
    @Body() body: { runMode?: string; contextCheck?: boolean; contentCheck?: boolean },
  ) {
    await this.assertPerm(req.user.sub, "prompt:edit");
    if (body.runMode) {
      const gate = canSetNodeRunMode(node, body.runMode);
      if (!gate.ok) throw new ForbiddenException(gate.reason);
    }
    return this.prisma.dagNodeConfig.update({
      where: { node },
      data: {
        ...(body.runMode != null ? { runMode: body.runMode } : {}),
        ...(body.contextCheck != null ? { contextCheck: body.contextCheck } : {}),
        ...(body.contentCheck != null ? { contentCheck: body.contentCheck } : {}),
      },
    });
  }

  @Get("skills")
  async skills(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "skill:edit");
    return this.prisma.skill.findMany();
  }

  @Post("skills")
  async createSkill(@Req() req: AdminReq, @Body() body: { name: string; markdown: string }) {
    await this.assertPerm(req.user.sub, "skill:import");
    if (/过检测|降AI|去AI痕迹/.test(body.markdown + body.name)) {
      throw new ForbiddenException("禁止导入降 AI 检测类技能");
    }
    return this.prisma.skill.create({
      data: {
        name: body.name,
        markdown: body.markdown.replace(/```[\s\S]*?```/g, "").slice(0, 20000),
        reviewed: false,
        enabled: false,
      },
    });
  }

  @Patch("skills/:id")
  async patchSkill(
    @Req() req: AdminReq,
    @Param("id") id: string,
    @Body() body: { enabled?: boolean; reviewed?: boolean },
  ) {
    await this.assertPerm(req.user.sub, "skill:edit");
    return this.prisma.skill.update({ where: { id }, data: body });
  }

  @Get("styles")
  async styles(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "style:edit");
    return this.prisma.stylePreset.findMany();
  }

  @Patch("styles/:id")
  async patchStyle(
    @Req() req: AdminReq,
    @Param("id") id: string,
    @Body() body: { enabled?: boolean; labelZh?: string },
  ) {
    await this.assertPerm(req.user.sub, "style:edit");
    return this.prisma.stylePreset.update({ where: { id }, data: body });
  }

  @Get("mcp-tokens")
  async mcp(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "mcp:edit");
    const rows = await this.prisma.mcpToken.findMany();
    return rows.map(({ tokenHash: _h, ...rest }) => rest);
  }

  @Post("mcp-tokens")
  async createMcp(@Req() req: AdminReq, @Body() body: { label: string }) {
    await this.assertPerm(req.user.sub, "mcp:edit");
    const raw = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await this.prisma.mcpToken.create({
      data: {
        label: body.label || "default",
        tokenHash,
        tools: ["upsert_article", "add_anchor", "trigger_generate", "read_article"],
      },
    });
    return { token: raw, note: "只显示一次，无 publish" };
  }

  @Post("mcp-tokens/:id/revoke")
  async revokeMcp(@Req() req: AdminReq, @Param("id") id: string) {
    await this.assertPerm(req.user.sub, "mcp:edit");
    return this.prisma.mcpToken.update({ where: { id }, data: { enabled: false } });
  }

  @Get("roles")
  async roles(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "role:edit");
    return this.rolesPayload();
  }

  @Post("roles")
  async createRole(@Req() req: AdminReq, @Body() body: { name: string }) {
    await this.assertPerm(req.user.sub, "role:edit");
    await this.prisma.role.create({ data: { name: body.name } });
    await this.log(req.user.email, "role:create", body.name);
    return this.rolesPayload();
  }

  @Patch("roles/:id")
  async patchRole(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { permissions?: string[] }) {
    await this.assertPerm(req.user.sub, "role:edit");
    if (body.permissions) {
      await this.prisma.$transaction(async (tx) => {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        const perms = await tx.permission.findMany({ where: { code: { in: body.permissions } } });
        await tx.rolePermission.createMany({
          data: perms.map((p) => ({ roleId: id, permissionId: p.id })),
        });
      });
    }
    await this.log(req.user.email, "role:edit", id);
    return this.rolesPayload();
  }

  @Get("admins")
  async admins(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "admin:edit");
    const rows = await this.prisma.adminUser.findMany({
      include: { roles: { include: { role: true } } },
    });
    const roles = await this.prisma.role.findMany({ select: { id: true, name: true } });
    return {
      roles,
      items: rows.map((a) => ({
        id: a.id,
        email: a.email,
        disabled: a.disabled,
        roles: a.roles.map((r) => ({ id: r.role.id, name: r.role.name })),
      })),
    };
  }

  @Post("admins/:id/roles")
  async assignRole(@Req() req: AdminReq, @Param("id") id: string, @Body() body: { roleId: string }) {
    await this.assertPerm(req.user.sub, "admin:edit");
    await this.prisma.adminRole.upsert({
      where: { adminId_roleId: { adminId: id, roleId: body.roleId } },
      create: { adminId: id, roleId: body.roleId },
      update: {},
    });
    await this.log(req.user.email, "admin:role", `${id}:${body.roleId}`);
    return { ok: true };
  }

  @Get("audit")
  async audit(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "audit:view");
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  @Get("site")
  async site(@Req() req: AdminReq) {
    await this.assertPerm(req.user.sub, "site:edit");
    return this.prisma.siteConfig.findUnique({ where: { id: "default" } });
  }

  private async rolesPayload() {
    const roles = await this.prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
    return {
      permissions: PERMISSIONS,
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions.map((p) => p.permission.code),
      })),
    };
  }

  private async assertPerm(adminId: string, code: string) {
    const perms = await this.permsOf(adminId);
    if (!perms.includes(code)) throw new ForbiddenException("没有权限");
  }

  private async permsOf(adminId: string) {
    const rows = await this.prisma.adminRole.findMany({
      where: { adminId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    return [...new Set(rows.flatMap((r) => r.role.permissions.map((p) => p.permission.code)))];
  }

  private log(actor: string, action: string, detail: string) {
    return this.prisma.auditLog.create({ data: { actor, action, detail } });
  }
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function mask(email: string) {
  const [n, host] = email.split("@");
  return `${n.slice(0, 2)}***@${host}`;
}
