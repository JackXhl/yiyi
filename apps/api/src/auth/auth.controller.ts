import { Body, Controller, Get, HttpException, Inject, Post, Req } from "@nestjs/common";
import { AuthService } from "./auth.service.js";
import { Public } from "./public.js";
import { PrismaService } from "../prisma.service.js";
import { hitLimiter, quotaSnapshot } from "@yiyi/shared";

const authHits = new Map<string, number[]>();

function emailKey(body: unknown) {
  if (typeof body === "object" && body && "email" in body) {
    return String((body as { email: unknown }).email || "").trim().toLowerCase() || "unknown";
  }
  return "unknown";
}

function guardAuth(kind: string, body: unknown) {
  if (!hitLimiter(authHits, `${kind}:${emailKey(body)}`, 8, 60_000)) {
    throw new HttpException("请稍后再试", 429);
  }
}

@Controller()
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("auth/register")
  register(@Body() body: unknown) {
    guardAuth("register", body);
    return this.auth.register(body);
  }

  @Public()
  @Post("auth/login")
  login(@Body() body: unknown) {
    guardAuth("login", body);
    return this.auth.login(body);
  }

  @Get("me")
  async me(@Req() req: { user: { sub: string } }) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.sub },
      include: { plan: true, orders: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    const quota = user.plan?.monthlyQuota ?? 2;
    const snap = quotaSnapshot({
      quotaUsed: user.quotaUsed,
      quotaResetAt: user.quotaResetAt,
      monthlyQuota: quota,
    });
    const active = !!user.subExpiresAt && user.subExpiresAt.getTime() > Date.now();
    return {
      id: user.id,
      email: user.email,
      planName: user.plan?.name ?? "体验",
      quotaLeft: snap.quotaLeft,
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
