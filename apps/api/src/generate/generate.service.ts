import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import { Anchor, canGenerate, hostedAssetUrl, hitLimiter, InFlight, quotaSnapshot, sanitizeArticleHtml } from "@yiyi/shared";
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

function figureHtml(src: string, caption = "") {
  return `<p><img src="${hostedAssetUrl(src)}" alt="${escapeHtml(caption)}" /></p>`;
}

export function stripModelText(raw: string | null | undefined): string {
  return (raw || "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .trim();
}

function interleaveImages(paragraphs: string[], assets: LayoutAsset[], layout: LayoutPlan) {
  const byId = new Map(assets.map((a) => [a.id, a]));
  const cover = layout.long.coverId ? byId.get(layout.long.coverId) : undefined;
  const used = new Set<string>();
  const coverHtml = cover ? figureHtml(cover.path) : "";
  if (cover) used.add(cover.id);
  const body = paragraphs
    .map((p, i) => {
      const extra = layout.long.slots.find((s) => !used.has(s.assetId));
      let fig = "";
      if (extra && i > 0) {
        const img = byId.get(extra.assetId);
        if (img) {
          used.add(img.id);
          fig = figureHtml(img.path, extra.caption);
        }
      }
      return `<p>${escapeHtml(p)}</p>${fig}`;
    })
    .join("");
  return `${coverHtml}${body}`;
}

export function longHtmlWithImages(theme: string, anchors: Anchor[], assets: LayoutAsset[], layout: LayoutPlan) {
  const paras = [theme || "现场", ...anchors.map((a) => a.text), "以上都是我自己碰到的事。没写到的细节，我也不记得更清楚了，就不编。"];
  return interleaveImages(paras, assets, layout);
}

export function longHtmlFromProse(
  prose: string | null,
  theme: string,
  anchors: Anchor[],
  assets: LayoutAsset[],
  layout: LayoutPlan,
) {
  const text = stripModelText(prose);
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (text.length < 8 || cjk < 16) return longHtmlWithImages(theme, anchors, assets, layout);
  const paras = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return interleaveImages(paras, assets, layout);
}

export function orderImages<T extends { id: string; kind: string }>(assets: T[], order?: string[]): T[] {
  const images = assets.filter((a) => a.kind === "image");
  if (!order?.length) return images;
  const byId = new Map(images.map((a) => [a.id, a]));
  return order.map((id) => byId.get(id)).filter((a): a is T => !!a);
}

export function noteTextWithOrder(theme: string, anchors: Anchor[], imageCount: number) {
  const orderHint = imageCount
    ? `共 ${imageCount} 张图，按确认后的顺序传到小红书。封面用第 1 张。`
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
      text: "这篇属于商品推荐，复制前须按平台规则做广告与 AI 生成声明",
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
  private readonly busy = new InFlight();
  private readonly hits = new Map<string, number[]>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  async run(articleId: string, userId: string) {
    if (!this.busy.enter(articleId)) throw new ForbiddenException("正在写，请稍等");
    try {
      const article = await this.prisma.article.findUniqueOrThrow({
        where: { id: articleId },
        include: { assets: { orderBy: { sort: "asc" } } },
      });
      if (
        article.status === "generating" &&
        Date.now() - article.updatedAt.getTime() < 2 * 60 * 1000
      ) {
        throw new ForbiddenException("正在写，请稍等");
      }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { plan: true },
    });
    const monthly = user.plan?.monthlyQuota ?? 2;
    const snap = quotaSnapshot({
      quotaUsed: user.quotaUsed,
      quotaResetAt: user.quotaResetAt,
      monthlyQuota: monthly,
    });
    if (snap.rolled) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { quotaUsed: 0, quotaResetAt: snap.quotaResetAt },
      });
    }
    const gate = canGenerate({
      anchors: (article.anchors as Anchor[]) ?? [],
      quotaLeft: snap.quotaLeft,
      subActive: !!user.subExpiresAt && user.subExpiresAt.getTime() > Date.now(),
      theme: article.theme,
      topicCodes: article.topicCodes,
    });
    if (!gate.ok) throw new ForbiddenException(gate.reason);
      if (!hitLimiter(this.hits, userId, 10, 60_000)) {
        throw new ForbiddenException("写得太快了，请稍等");
      }

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
      const fresh = buildLayout(layoutAssets);
      const stored = article.layout as LayoutPlan | null;
      const kept = (stored?.note?.order ?? []).filter((id) => layoutAssets.some((a) => a.id === id && a.kind === "image"));
      const layout: LayoutPlan = kept.length
        ? {
            long: {
              coverId: stored?.long?.coverId && kept.includes(stored.long.coverId) ? stored.long.coverId : kept[0],
              slots: (stored?.long?.slots ?? fresh.long.slots).filter((s) => kept.includes(s.assetId)),
            },
            note: { order: kept },
          }
        : fresh;
      const [bodyTpl, outlineTpl, skills, style] = await Promise.all([
        this.prisma.promptTemplate.findFirst({ where: { node: "body" }, orderBy: { version: "desc" } }),
        this.prisma.promptTemplate.findFirst({ where: { node: "outline" }, orderBy: { version: "desc" } }),
        this.prisma.skill.findMany({ where: { enabled: true, reviewed: true }, take: 5 }),
        article.styleCode && article.styleCode !== "system"
          ? this.prisma.stylePreset.findFirst({ where: { code: article.styleCode, enabled: true } })
          : Promise.resolve(null),
      ]);
      const facts = anchors.map((a, i) => `${i + 1}. ${a.text}`).join("\n");
      const skillHint = skills.map((s) => s.markdown.slice(0, 600)).join("\n");
      const styleHint =
        style && typeof style.params === "object" && style.params && "hint" in (style.params as object)
          ? `笔法：${String((style.params as { hint?: string }).hint || "").slice(0, 800)}`
          : "";
      const bodyPrompt = [
        bodyTpl?.body || "只写已确认事实。禁止编造对话和数字。",
        "不要输出 HTML。分段写，一段一事，每条已确认事实至少写一段。用第一人称讲现场，不编对话和数字。",
        skillHint,
        styleHint,
        `主题：${article.theme}`,
        `事实：\n${facts}`,
      ]
        .filter(Boolean)
        .join("\n");
      const outlinePrompt = [
        outlineTpl?.body || "用用户锚点排背景-发生-结果-边界，不写金句。不要输出 HTML。",
        `主题：${article.theme}`,
        `事实：\n${facts}`,
      ].join("\n");
      const [modelBody, modelOutline] = await Promise.all([
        this.llm.complete("text_long", bodyPrompt),
        this.llm.complete("text_json", outlinePrompt),
      ]);
      const long = sanitizeArticleHtml(longHtmlFromProse(modelBody, article.theme, anchors, layoutAssets, layout));
      const note = noteTextWithOrder(article.theme, anchors, layout.note.order.length);
      const outline = stripModelText(modelOutline) || fallbackOutline(article.theme, anchors);
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
    } finally {
      this.busy.leave(articleId);
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
