import { Body, Controller, Get, Param, Patch, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { PERMISSIONS } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";
import { AdminOnly, Public } from "../auth/public.js";

@AdminOnly()
@Controller("admin")
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!admin || admin.disabled || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      throw new UnauthorizedException("邮箱或密码不对");
    }
    const token = this.jwt.sign({ sub: admin.id, email: admin.email, aud: "admin" });
    const perms = await this.permsOf(admin.id);
    return { token, admin: { id: admin.id, email: admin.email, permissions: perms } };
  }

  @Get("me")
  async me(@Req() req: { user: { sub: string; email: string } }) {
    return { id: req.user.sub, email: req.user.email, permissions: await this.permsOf(req.user.sub) };
  }

  @Get("overview")
  async overview() {
    const [users, jobsFail, articles] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.generationJob.count({ where: { status: "failed" } }),
      this.prisma.article.count({ where: { createdAt: { gte: startOfDay() } } }),
    ]);
    return {
      rows: [
        { label: "今日成稿相关", value: articles },
        { label: "失败任务", value: jobsFail },
        { label: "注册用户", value: users },
      ],
    };
  }

  @Get("users")
  async users(@Query("q") q?: string) {
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
        planName: u.plan?.name ?? "—",
        articles: u._count.articles,
        subExpiresAt: u.subExpiresAt,
      })),
    };
  }

  @Post("users/:id/disable")
  async disable(@Req() req: { user: { email: string } }, @Param("id") id: string, @Body() body: { disabled: boolean }) {
    await this.prisma.user.update({ where: { id }, data: { disabled: body.disabled } });
    await this.log(req.user.email, "user:disable", id);
    return { ok: true };
  }

  @Post("users/:id/reset-password")
  async reset(@Req() req: { user: { email: string } }, @Param("id") id: string, @Body() body: { password: string }) {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(body.password, 10) },
    });
    await this.log(req.user.email, "user:reset", id);
    return { ok: true };
  }

  @Post("users/:id/plan")
  async setPlan(@Req() req: { user: { email: string } }, @Param("id") id: string, @Body() body: { planId: string }) {
    await this.prisma.user.update({ where: { id }, data: { planId: body.planId } });
    await this.log(req.user.email, "user:plan", id);
    return { ok: true };
  }

  @Get("articles")
  async articles() {
    const items = await this.prisma.article.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { email: true } } },
    });
    return {
      items: items.map((a) => ({
        id: a.id,
        email: mask(a.user.email),
        title: a.title || "未命名",
        status: a.status,
      })),
    };
  }

  @Get("plans")
  plans() {
    return this.prisma.plan.findMany({ orderBy: { priceFen: "asc" } });
  }

  @Patch("plans/:id")
  async patchPlan(@Body() body: { name?: string; monthlyQuota?: number; priceFen?: number; enabled?: boolean }, @Param("id") id: string) {
    return this.prisma.plan.update({ where: { id }, data: body });
  }

  @Get("orders")
  orders() {
    return this.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { email: true } }, plan: true },
    });
  }

  @Post("orders/:id/refund-mark")
  async refund(@Req() req: { user: { email: string } }, @Param("id") id: string) {
    const order = await this.prisma.order.update({ where: { id }, data: { status: "refunded" } });
    await this.prisma.user.update({
      where: { id: order.userId },
      data: { subExpiresAt: new Date() },
    });
    await this.log(req.user.email, "order:refund", id);
    return { ok: true };
  }

  @Get("jobs")
  jobs() {
    return this.prisma.generationJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  }

  @Post("jobs/:id/retry")
  async retry(@Param("id") id: string) {
    return this.prisma.generationJob.update({ where: { id }, data: { status: "queued" } });
  }

  @Get("topic-options")
  topicOptions() {
    return this.prisma.topicOption.findMany({ orderBy: [{ axis: "asc" }, { sort: "asc" }] });
  }

  @Patch("topic-options/:id")
  patchTopic(@Param("id") id: string, @Body() body: { labelZh?: string; enabled?: boolean; sort?: number }) {
    return this.prisma.topicOption.update({ where: { id }, data: body });
  }

  @Get("slots")
  async slots() {
    const rows = await this.prisma.capabilitySlot.findMany();
    return rows.map((s) => ({ ...s, apiKey: s.apiKey ? "已保存" : "" }));
  }

  @Patch("slots/:slot")
  patchSlot(
    @Param("slot") slot: string,
    @Body() body: { baseUrl?: string; model?: string; apiKey?: string },
  ) {
    return this.prisma.capabilitySlot.upsert({
      where: { slot },
      update: body,
      create: { slot, ...body },
    });
  }

  @Get("prompts")
  prompts() {
    return this.prisma.promptTemplate.findMany();
  }

  @Get("skills")
  skills() {
    return this.prisma.skill.findMany();
  }

  @Post("skills")
  createSkill(@Body() body: { name: string; markdown: string }) {
    if (/过检测|降AI|去AI痕迹/.test(body.markdown + body.name)) {
      throw new Error("禁止导入降 AI 检测类技能");
    }
    return this.prisma.skill.create({
      data: { name: body.name, markdown: body.markdown.replace(/```[\s\S]*?```/g, "").slice(0, 20000), reviewed: false, enabled: false },
    });
  }

  @Patch("skills/:id")
  patchSkill(@Param("id") id: string, @Body() body: { enabled?: boolean; reviewed?: boolean }) {
    return this.prisma.skill.update({ where: { id }, data: body });
  }

  @Get("styles")
  styles() {
    return this.prisma.stylePreset.findMany();
  }

  @Get("mcp-tokens")
  mcp() {
    return this.prisma.mcpToken.findMany();
  }

  @Get("roles")
  async roles() {
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

  @Get("admins")
  admins() {
    return this.prisma.adminUser.findMany({
      include: { roles: { include: { role: true } } },
    });
  }

  @Get("audit")
  audit() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  }

  @Get("site")
  site() {
    return this.prisma.siteConfig.findUnique({ where: { id: "default" } });
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
