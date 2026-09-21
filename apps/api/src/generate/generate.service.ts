import { ForbiddenException, Inject, Injectable, Logger } from "@nestjs/common";
import {
  AI_JOB_NODES,
  Anchor,
  canGenerate,
  DAG_NODE_CONFIG_SEED,
  hostedAssetUrl,
  hitLimiter,
  InFlight,
  quotaSnapshot,
  sanitizeArticleHtml,
  textCoversAnchors,
} from "@yiyi/shared";
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

export function stripClicheSentences(text: string) {
  return text
    .split(/(?<=[。！？\n])/)
    .filter((s) => !CLICHE.some((w) => s.includes(w)))
    .join("")
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
  const text = stripClicheSentences(stripModelText(prose));
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
      text: "这篇属于商品推荐，复制到后台时请按平台规则做广告与 AI 生成声明",
    });
  }
  if (anchors.length && text.length < 40) {
    issues.push({ level: "warn", text: "正文过短，请自己补一句现场" });
  }
  if (imageCount > 0 && !html.includes("<img")) {
    issues.push({ level: "warn", text: "有现场图但正文里还没排进去" });
  }
  if (anchors.length && !textCoversAnchors(text, anchors)) {
    issues.push({ level: "warn", text: "有已确认的事实依据未写进成稿" });
  }
  issues.push({
    level: "info",
    text: "辅助检查，不是法律意见、不承诺过审。发表时请自行声明生成合成内容。",
  });
  return issues;
}

export function ownedLayout(layout: LayoutPlan, assets: LayoutAsset[]): LayoutPlan {
  const ids = new Set(assets.filter((a) => a.kind === "image").map((a) => a.id));
  const order = layout.note.order.filter((id) => ids.has(id));
  const cover = layout.long.coverId && ids.has(layout.long.coverId) ? layout.long.coverId : order[0] ?? null;
  return {
    long: {
      coverId: cover,
      slots: layout.long.slots.filter((s) => ids.has(s.assetId)),
    },
    note: { order },
  };
}

export const STALE_GENERATING_MS = 2 * 60 * 1000;

export type DagJobNode = {
  node: string;
  runMode: string;
  contextCheck: boolean;
  contentCheck: boolean;
};

export function jobNodesFromConfig(rows: DagJobNode[]): DagJobNode[] {
  const byNode = new Map(rows.map((r) => [r.node, r]));
  return AI_JOB_NODES.map((n) => {
    const hit = byNode.get(n);
    if (hit) return hit;
    const seed = DAG_NODE_CONFIG_SEED.find((s) => s.node === n)!;
    return {
      node: seed.node,
      runMode: seed.runMode,
      contextCheck: seed.contextCheck,
      contentCheck: seed.contentCheck,
    };
  });
}

@Injectable()
export class GenerateService {
  private readonly log = new Logger(GenerateService.name);
  private readonly busy = new InFlight();
  private readonly hits = new Map<string, number[]>();

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LlmService) private readonly llm: LlmService,
  ) {}

  isLive(articleId: string) {
    return this.busy.has(articleId);
  }

  async enqueue(articleId: string, userId: string) {
    await this.arm(articleId, userId);
    void this.pipeline(articleId, userId)
      .catch((err) => this.log.error(err instanceof Error ? err.message : err))
      .finally(() => this.busy.leave(articleId));
  }

  async run(articleId: string, userId: string) {
    await this.arm(articleId, userId);
    try {
      await this.pipeline(articleId, userId);
    } finally {
      this.busy.leave(articleId);
    }
  }

  async releaseStale(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article || article.status !== "generating") return;
    if (this.busy.has(articleId)) return;
    if (Date.now() - article.updatedAt.getTime() < STALE_GENERATING_MS) return;
    await this.prisma.article.update({ where: { id: articleId }, data: { status: "failed" } });
    await this.refundQuota(userId);
  }

  private async refundQuota(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId, quotaUsed: { gt: 0 } },
      data: { quotaUsed: { decrement: 1 } },
    });
  }

  private async arm(articleId: string, userId: string) {
    if (!this.busy.enter(articleId)) throw new ForbiddenException("正在写，请稍等");
    try {
      const article = await this.prisma.article.findUniqueOrThrow({
        where: { id: articleId },
      });
      const hung = article.status === "generating";
      const stale = Date.now() - article.updatedAt.getTime() >= STALE_GENERATING_MS;
      if (hung && !stale) throw new ForbiddenException("正在写，请稍等");
      if (hung && stale) return;
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { plan: true },
      });
      const gate = canGenerate({
        anchors: (article.anchors as Anchor[]) ?? [],
        quotaLeft: 1,
        subActive: !!user.subExpiresAt && user.subExpiresAt.getTime() > Date.now(),
        theme: article.theme,
        topicCodes: article.topicCodes,
      });
      if (!gate.ok) throw new ForbiddenException(gate.reason);
      if (!hitLimiter(this.hits, userId, 10, 60_000)) {
        throw new ForbiddenException("写得太快了，请稍等");
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
        const locked = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          include: { plan: true },
        });
        const monthly = locked.plan?.monthlyQuota ?? 2;
        const snap = quotaSnapshot({
          quotaUsed: locked.quotaUsed,
          quotaResetAt: locked.quotaResetAt,
          monthlyQuota: monthly,
        });
        if (snap.rolled) {
          await tx.user.update({
            where: { id: userId },
            data: { quotaUsed: 0, quotaResetAt: snap.quotaResetAt },
          });
        }
        const charged = await tx.user.updateMany({
          where: { id: userId, quotaUsed: { lt: monthly } },
          data: { quotaUsed: { increment: 1 } },
        });
        if (charged.count !== 1) throw new ForbiddenException("本月生成额度已用完");
        await tx.article.update({
          where: { id: articleId },
          data: { status: "generating", currentNode: "outline" },
        });
      });
    } catch (err) {
      this.busy.leave(articleId);
      throw err;
    }
  }

  private async pipeline(articleId: string, userId: string) {
    let lastJobId: string | undefined;
    try {
      const article = await this.prisma.article.findUniqueOrThrow({
        where: { id: articleId },
        include: { assets: { orderBy: { sort: "asc" } } },
      });
      const configs = await this.prisma.dagNodeConfig.findMany({ orderBy: { sort: "asc" } });
      const job = jobNodesFromConfig(configs.length ? configs : [...DAG_NODE_CONFIG_SEED]);
      const anchors = ((article.anchors as Anchor[]) ?? []).filter((a) => a.confirmed);
      const layoutAssets: LayoutAsset[] = article.assets.map((a) => ({
        id: a.id,
        kind: a.kind,
        path: a.path,
        analysis: a.analysis as { caption?: string } | null,
      }));
      const fresh = buildLayout(layoutAssets);
      const stored = article.layout as LayoutPlan | null;
      const layout = ownedLayout(
        stored?.note?.order?.length
          ? { long: stored.long ?? fresh.long, note: stored.note ?? fresh.note }
          : fresh,
        layoutAssets,
      );

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

      let outline = article.outline;
      let long = article.bodyLong;
      let note = article.bodyNote;
      let issues: { level: string; text: string }[] = [];

      for (const cfg of job) {
        if (cfg.runMode !== "ai_auto") {
          throw new Error("节点需人工审批，请改回 AI 自动后再生成");
        }
        await this.prisma.article.update({
          where: { id: articleId },
          data: { currentNode: cfg.node },
        });
        const jobRow = await this.prisma.generationJob.create({
          data: { articleId, node: cfg.node, status: "running", snapshot: { theme: article.theme } },
        });
        lastJobId = jobRow.id;

        if (cfg.node === "outline") {
          const outlinePrompt = [
            outlineTpl?.body || "用用户锚点排背景-发生-结果-边界，不写金句。不要输出 HTML。",
            `主题：${article.theme}`,
            `事实：\n${facts}`,
          ].join("\n");
          const modelOutline = await this.llm.complete("text_json", outlinePrompt);
          outline = stripModelText(modelOutline) || fallbackOutline(article.theme, anchors);
          await this.prisma.article.update({ where: { id: articleId }, data: { outline } });
        } else if (cfg.node === "body") {
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
          const modelBody = await this.llm.complete("text_long", bodyPrompt);
          long = sanitizeArticleHtml(longHtmlFromProse(modelBody, article.theme, anchors, layoutAssets, layout));
          await this.prisma.article.update({ where: { id: articleId }, data: { bodyLong: long, layout } });
        } else if (cfg.node === "adapt") {
          note = noteTextWithOrder(article.theme, anchors, layout.note.order.length);
          await this.prisma.article.update({ where: { id: articleId }, data: { bodyNote: note } });
        } else if (cfg.node === "check") {
          issues = cfg.contentCheck
            ? machineCheck(long, article.intentCode, anchors, layout.note.order.length)
            : [{ level: "info", text: "辅助检查，不是法律意见、不承诺过审。发表时请自行声明生成合成内容。" }];
          await this.prisma.article.update({ where: { id: articleId }, data: { checkReport: issues } });
        }

        await this.prisma.generationJob.update({
          where: { id: jobRow.id },
          data: { status: "done" },
        });
      }

      await this.prisma.article.update({
        where: { id: articleId },
        data: {
          status: "ready",
          currentNode: "check",
          title: article.title || article.theme.slice(0, 20) || "未命名",
          outline,
          bodyLong: long,
          bodyNote: note,
          layout,
          checkReport: issues,
        },
      });
    } catch (err) {
      await this.prisma.article.update({
        where: { id: articleId },
        data: { status: "failed" },
      });
      if (lastJobId) {
        await this.prisma.generationJob.update({
          where: { id: lastJobId },
          data: { status: "failed" },
        });
      } else {
        await this.prisma.generationJob.create({
          data: { articleId, node: "body", status: "failed" },
        });
      }
      await this.refundQuota(userId);
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
