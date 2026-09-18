import { Body, Controller, ForbiddenException, Get, HttpException, Inject, Param, Post, Req } from "@nestjs/common";
import { PrismaService } from "../prisma.service.js";
import { Public } from "../auth/public.js";
import { monthWindowEnd, orderCreateSchema } from "@yiyi/shared";

export function canConfirmMockPay(order: { mock: boolean }, mockEnv = process.env.WECHAT_PAY_MOCK) {
  return order.mock === true && mockEnv !== "false";
}

@Controller("billing")
export class BillingController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
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
  async create(@Req() req: { user: { sub: string } }, @Body() raw: unknown) {
    const body = orderCreateSchema.parse(raw);
    const plan = await this.prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan?.enabled) throw new HttpException("找不到这个套餐", 400);
    const order = await this.prisma.order.create({
      data: {
        userId: req.user.sub,
        planId: plan.id,
        amountFen: plan.priceFen,
        status: "pending",
        mock: process.env.WECHAT_PAY_MOCK !== "false",
      },
    });
    const mock = order.mock;
    return {
      orderId: order.id,
      mock,
      amountFen: order.amountFen,
      hint: mock
        ? "未配置微信商户时走本地确认支付（第一期演示）。配好 WECHAT_MCHID 后走 Native 下单。"
        : "请用微信扫码支付",
      native: mock
        ? null
        : {
            mchid: process.env.WECHAT_MCHID,
            note: "商户已配置：此处应返回 Native code_url，第一期未接真下单则仍走 mock-pay。",
          },
    };
  }

  @Post("orders/:id/mock-pay")
  async mockPay(@Req() req: { user: { sub: string } }, @Param("id") id: string) {
    const order = await this.prisma.order.findFirstOrThrow({
      where: { id, userId: req.user.sub, status: "pending" },
    });
    if (!canConfirmMockPay(order)) {
      throw new ForbiddenException("未开启演示支付");
    }
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: order.planId } });
    const expires = new Date(Date.now() + plan.durationDays * 24 * 3600 * 1000);
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id },
        data: { status: "paid", paidAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: req.user.sub },
        data: { planId: plan.id, subExpiresAt: expires, quotaUsed: 0, quotaResetAt: monthWindowEnd(new Date()) },
      }),
    ]);
    return { ok: true, subExpiresAt: expires };
  }
}
