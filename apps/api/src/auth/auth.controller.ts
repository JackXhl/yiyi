import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.js";
import { PrismaService } from "../prisma.service.js";

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("auth/register")
  register(@Body() body: unknown) {
    return this.auth.register(body);
  }

  @Public()
  @Post("auth/login")
  login(@Body() body: unknown) {
    return this.auth.login(body);
  }

  @Get("me")
  async me(@Req() req: { user: { sub: string } }) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      include: { plan: true, orders: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    const quota = user.plan?.monthlyQuota ?? 2;
    const active = !!user.subExpiresAt && user.subExpiresAt.getTime() > Date.now();
    return {
      id: user.id,
      email: user.email,
      planName: user.plan?.name ?? "体验",
      quotaLeft: Math.max(0, quota - user.quotaUsed),
      quota: quota,
      subExpiresAt: user.subExpiresAt,
      subActive: active,
      orders: user.orders.map((o) => ({
        id: o.id,
        amountFen: o.amountFen,
        status: o.status,
        createdAt: o.createdAt,
      })),
    };
  }
}
