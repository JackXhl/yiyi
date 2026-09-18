import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";

@Controller("billing")
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("plans")
  async plans() {
    const plans = await this.prisma.plan.findMany({ where: { enabled: true }, orderBy: { priceFen: "asc" } });
    return {
      items: plans.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        monthlyQuota: p.monthlyQuota,
        durationDays: p.durationDays,
        priceYuan: (p.priceFen / 100).toFixed(0),
      })),
    };
  }

  @Post("orders")
  async create(@Req() req: { user: { sub: string } }, @Body() body: { planId: string }) {
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: body.planId } });
    const order = await this.prisma.order.create({
      data: {
        userId: req.user.sub,
        planId: plan.id,
        amountFen: plan.priceFen,
        status: "pending",
        mock: process.env.WECHAT_PAY_MOCK !== "false",
      },
    });
    return {
      orderId: order.id,
      mock: order.mock,
      amountFen: order.amountFen,
      hint: order.mock
        ? "未配置微信商户时走本地确认支付（第一期演示）。配好 WECHAT_MCHID 后走 Native 下单。"
        : "请用微信扫码支付",
    };
  }

  @Post("orders/:id/mock-pay")
  async mockPay(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    const order = await this.prisma.order.findFirstOrThrow({
      where: { id, userId: req.user.sub, status: "pending" },
    });
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: order.planId } });
    const expires = new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: "paid", paidAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: req.user.sub },
        data: { planId: plan.id, subExpiresAt: expires, quotaUsed: 0 },
      }),
    ]);
    return { ok: true, subExpiresAt: expires };
  }
}
