import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../auth/public.js";
import { PrismaService } from "../prisma.service.js";

@Controller("topic-options")
export class TopicController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async list() {
    const rows = await this.prisma.topicOption.findMany({
      where: { enabled: true },
      orderBy: { sort: "asc" },
    });
    return {
      form: rows.filter((r) => r.axis === "form"),
      intent: rows.filter((r) => r.axis === "intent_genre"),
      topicL1: rows.filter((r) => r.axis === "topic" && r.cendL1),
      topicMore: rows.filter((r) => r.axis === "topic" && !r.cendL1),
    };
  }
}

@Controller("styles")
export class StylesController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.stylePreset.findMany({
      where: { enabled: true },
      select: { code: true, labelZh: true },
      orderBy: { code: "asc" },
    });
    return { items };
  }
}
