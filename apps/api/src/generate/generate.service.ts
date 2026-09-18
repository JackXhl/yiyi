import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Anchor, canGenerate } from "@yiyi/shared";
import { PrismaService } from "../prisma.service.js";
import { LlmService } from "./llm.service.js";

const CLICHE = ["在当今社会", "赋能", "不仅如此", "综上所述"];

export type LayoutSlot = { assetId: string; caption: string };
export type LayoutPlan = {
  long: { coverId: string | null; slots: LayoutSlot[] };
  note: { order: string[] };
};

export type LayoutAsset = {
  id: string;
  kind: string;
  path: string;
  analysis?: { caption?: string } | null;
};

export function buildLayout(assets: LayoutAsset[]): LayoutPlan {
  const images = assets.filter((a) => a.kind === "image");
  return {
    long: {
      coverId: images[0]?.id ?? null,
      slots: images.map((a) => ({
        assetId: a.id,
        caption: a.analysis?.caption || "",
      })),
    },
    note: { order: images.map((a) => a.id) },
  };
}

export function longHtmlWithImages(theme: string, anchors: Anchor[], assets: LayoutAsset[], layout: LayoutPlan) {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const cover = layout.long.coverId ? byId.get(layout.long.coverId) : undefined;
  const used = new Set<string>();
  const coverHtml = cover ? `<p><img src="/uploads/${cover.path}" alt="" /></p>` : "";
  if (cover) used.add(cover.id);
  const paras = anchors
    .map((a, i) => {
      const extra = layout.long.slots.find((s) => !used.has(s.assetId));
      let fig = "";
      if (extra && i > 0) {
        const img = byId.get(extra.assetId);
        if (img) {
          used.add(img.id);
          fig = `<p><img src="/uploads/${img.path}" alt="${escapeHtml(extra.caption || "")}" /></p>`;
        }
      }
      return `<p>${escapeHtml(a.text)}</p>${fig}`;
    })
    .join("");
  return `${coverHtml}<h2>${escapeHtml(theme || "现场")}</h2>${paras}<p>以上都是我自己碰到的事。没写到的细节，我也不记得更清楚了，就不编。</p>`;
}

export function noteTextWithOrder(theme: string, anchors: Anchor[], imageCount: number) {
  const orderHint = imageCount
    ? `共 ${imageCount} 张图，按上传顺序传到小红书。封面用第 1 张。`
    : "这批没有图，只发文字。";
  return `${theme}\n${anchors.map((a) => a.text).join("\n")}\n${orderHint}`;
}

export function machineCheck(html: string, intentCode: string, anchors: Anchor[], imageCount: number) {
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
  if (imageCount > 0 && !html.includes("<img")) {
    issues.push({ level: "warn", text: "有现场图但正文里还没排进去" });
  }
  issues.push({
    level: "info",
    text: "辅助检查，不是法律意见、不承诺过审。发表时请自行声明生成合成内容。",
  });
  return issues;
}

@Injectable()
export class GenerateService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async run(articleId: string, userId: string) {
    const article = await this.prisma.article.findUniqueOrThrow({
      where: { id: articleId },
      include: { assets: { orderBy: { sort: "asc" } } },
    });
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

    try {
      const anchors = ((article.anchors as Anchor[]) ?? []).filter((a) => a.confirmed);
      const layoutAssets: LayoutAsset[] = article.assets.map((a) => ({
        id: a.id,
        kind: a.kind,
        path: a.path,
        analysis: a.analysis as { caption?: string } | null,
      }));
      const layout = buildLayout(layoutAssets);
      const facts = anchors.map((a, i) => `${i + 1}. ${a.text}`).join("\n");
      const prompt = `根据用户亲历事实写中文稿，禁止编造未提供的细节、对话、数字。不要「在当今社会」「赋能」「首先其次最后」空转。主题：${article.theme}\n事实：\n${facts}`;
      const modelText = await this.llm.complete("text_long", prompt);
      const long = modelText?.includes("<")
        ? modelText
        : longHtmlWithImages(article.theme, anchors, layoutAssets, layout);
      const note = noteTextWithOrder(article.theme, anchors, layout.note.order.length);
      const outline = fallbackOutline(article.theme, anchors);
      const issues = machineCheck(long, article.intentCode, anchors, layout.note.order.length);

      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          status: "ready",
          currentNode: "outline",
          title: article.title || article.theme.slice(0, 20) || "未命名",
          outline,
          bodyLong: long,
          bodyNote: note,
          layout,
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
    } catch (err) {
      await this.prisma.article.update({
        where: { id: articleId },
        data: { status: "failed" },
      });
      await this.prisma.generationJob.create({
        data: { articleId, node: "body", status: "failed" },
      });
      throw err;
    }
  }
}

function fallbackOutline(theme: string, anchors: Anchor[]) {
  return [
    "背景：这篇要写什么",
    theme || "（补一句主题）",
    "现场：",
    ...anchors.map((a) => `- ${a.text}`),
    "结果与边界：只写上面有的事，没有的不补。",
  ].join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
