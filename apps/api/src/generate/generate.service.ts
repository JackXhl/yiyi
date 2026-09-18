import { ForbiddenException, Injectable } from "@nestjs/common";
import { Anchor, canGenerate } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";
import { LlmService } from "./llm.service.js";

const CLICHE = ["在当今社会", "赋能", "不仅如此", "综上所述"];

@Injectable()
export class GenerateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
  ) {}

  async run(articleId: string, userId: string) {
    const article = await this.prisma.article.findUniqueOrThrow({ where: { id: articleId } });
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
    if (!gate.ok) throw new ForbiddenException(gate.reason);

    await this.prisma.article.update({
      where: { id: articleId },
      data: { status: "generating", currentNode: "outline" },
    });
    await this.prisma.generationJob.create({
      data: { articleId, node: "body", status: "running", snapshot: { theme: article.theme } },
    });

    const anchors = ((article.anchors as Anchor[]) ?? []).filter((a) => a.confirmed);
    const facts = anchors.map((a, i) => `${i + 1}. ${a.text}`).join("\n");
    const prompt = `根据用户亲历事实写中文稿，禁止编造未提供的细节、对话、数字。不要「在当今社会」「赋能」「首先其次最后」空转。主题：${article.theme}\n事实：\n${facts}`;
    const modelText = await this.llm.complete("text_long", prompt);
    const long = modelText || this.fallbackLong(article.theme, anchors);
    const note = this.fallbackNote(article.theme, anchors);
    const outline = this.fallbackOutline(article.theme, anchors);
    const issues = this.check(long, article.intentCode, anchors);

    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        status: "ready",
        currentNode: "check",
        title: article.title || article.theme.slice(0, 20) || "未命名",
        outline,
        bodyLong: long,
        bodyNote: note,
        layout: {
          long: { coverHint: "用第一张已确认图当封面", sections: ["背景", "发生了什么", "结果", "边界"] },
          note: { imageOrder: "按上传顺序", caption: note.slice(0, 80) },
        },
        checkReport: issues,
      },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { quotaUsed: { increment: 1 } },
    });
    await this.prisma.generationJob.create({
      data: { articleId, node: "check", status: "done" },
    });
  }

  private fallbackOutline(theme: string, anchors: Anchor[]) {
    return [
      "背景：这篇要写什么",
      theme || "（补一句主题）",
      "现场：",
      ...anchors.map((a) => `- ${a.text}`),
      "结果与边界：只写上面有的事，没有的不补。",
    ].join("\n");
  }

  private fallbackLong(theme: string, anchors: Anchor[]) {
    const paras = anchors.map((a) => `<p>${escapeHtml(a.text)}</p>`).join("");
    return `<h2>${escapeHtml(theme || "现场")}</h2>${paras}<p>以上都是我自己碰到的事。没写到的细节，我也不记得更清楚了，就不编。</p>`;
  }

  private fallbackNote(theme: string, anchors: Anchor[]) {
    return `${theme}\n${anchors.map((a) => a.text).join("\n")}\n（按图顺序发，图是我拍的）`;
  }

  private check(html: string, intentCode: string, anchors: Anchor[]) {
    const text = html.replace(/<[^>]+>/g, "");
    const issues: { level: string; text: string }[] = [];
    for (const w of CLICHE) {
      if (text.includes(w)) issues.push({ level: "warn", text: `套话：${w}` });
    }
    if (intentCode === "intent.promo") {
      issues.push({
        level: "high",
        text: "这篇带安利/种草，复制前须按平台规则做广告与 AI 生成声明",
      });
    }
    if (anchors.length && text.length < 40) {
      issues.push({ level: "warn", text: "正文过短，请自己补一句现场" });
    }
    issues.push({
      level: "info",
      text: "辅助检查，不是法律意见、不承诺过审。发表时请自行声明生成合成内容。",
    });
    return issues;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
