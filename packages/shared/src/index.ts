import { z } from "zod";

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "请填写邮箱")
    .email("邮箱格式不对")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(8, "密码至少 8 位").max(72, "密码过长"),
});

export const ARTICLE_STATUS_LABEL = {
  draft: "草稿",
  generating: "生成中",
  ready: "已成稿",
  failed: "失败",
} as const;

export type ArticleStatus = keyof typeof ARTICLE_STATUS_LABEL;

export const DAG_NODES = [
  "topic",
  "media",
  "outline",
  "body",
  "adapt",
  "check",
  "copy",
] as const;

export const DAG_NODE_LABEL: Record<(typeof DAG_NODES)[number], string> = {
  topic: "选题",
  media: "素材",
  outline: "大纲",
  body: "正文",
  adapt: "适配",
  check: "检查",
  copy: "复制",
};

export const PERMISSIONS = [
  "overview:view",
  "user:list",
  "user:disable",
  "user:reset",
  "user:plan",
  "article:inspect",
  "plan:edit",
  "order:list",
  "order:refund",
  "job:retry",
  "platform:edit",
  "topic:edit",
  "slot:edit",
  "prompt:edit",
  "skill:import",
  "skill:edit",
  "style:edit",
  "mcp:edit",
  "site:edit",
  "role:edit",
  "audit:view",
  "admin:edit",
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number];

export type Anchor = { id: string; text: string; confirmed: boolean; fromAssetId?: string };

export function confirmedAnchorCount(anchors: Anchor[]): number {
  return anchors.filter((a) => a.confirmed && a.text.trim().length >= 4).length;
}

export function canGenerate(input: {
  anchors: Anchor[];
  quotaLeft: number;
  subActive: boolean;
  theme?: string;
  topicCodes?: string[];
}): {
  ok: boolean;
  reason?: string;
} {
  if (!input.subActive) return { ok: false, reason: "订阅已到期，只能看已有稿" };
  if (input.quotaLeft <= 0) return { ok: false, reason: "本月篇数用完了" };
  if (input.theme !== undefined && input.theme.trim().length < 4) {
    return { ok: false, reason: "还没写这篇要写什么" };
  }
  if (input.topicCodes !== undefined && input.topicCodes.length < 1) {
    return { ok: false, reason: "先选一个大概写哪一类" };
  }
  if (confirmedAnchorCount(input.anchors) < 2) {
    return { ok: false, reason: "还差一条你亲历过的事" };
  }
  return { ok: true };
}

export function monthWindowEnd(from: Date): Date {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + 1);
  return d;
}

export function quotaSnapshot(input: {
  quotaUsed: number;
  quotaResetAt: Date | string;
  monthlyQuota: number;
  now?: Date;
}): { quotaUsed: number; quotaResetAt: Date; quotaLeft: number; rolled: boolean } {
  const now = input.now ?? new Date();
  const resetAt = input.quotaResetAt instanceof Date ? input.quotaResetAt : new Date(input.quotaResetAt);
  if (now.getTime() > resetAt.getTime()) {
    return {
      quotaUsed: 0,
      quotaResetAt: monthWindowEnd(now),
      quotaLeft: input.monthlyQuota,
      rolled: true,
    };
  }
  return {
    quotaUsed: input.quotaUsed,
    quotaResetAt: resetAt,
    quotaLeft: Math.max(0, input.monthlyQuota - input.quotaUsed),
    rolled: false,
  };
}

const ARTICLE_HTML_TAGS = new Set(["p", "h2", "h3", "br", "img", "strong", "em", "ul", "ol", "li", "blockquote"]);

export function isSafeImgSrc(src: string): boolean {
  return src.startsWith("/uploads/") || /^https?:\/\//i.test(src);
}

export function sanitizeArticleHtml(html: string): string {
  const stripped = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<(iframe|object|embed|svg|form|input|link|meta|base|textarea)[\s\S]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<(iframe|object|embed|svg|form|input|link|meta|base)[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  return stripped.replace(/<\/?([a-zA-Z0-9]+)(\s[^>]*)?>/g, (full, tag: string, attrs = "") => {
    const name = tag.toLowerCase();
    const closing = full.startsWith("</");
    if (!ARTICLE_HTML_TAGS.has(name)) return "";
    if (name === "br") return "<br/>";
    if (closing) return `</${name}>`;
    if (name === "img") {
      const srcMatch = /\ssrc\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const src = srcMatch?.[2] || srcMatch?.[3] || "";
      if (!isSafeImgSrc(src)) return "";
      const altMatch = /\salt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const alt = (altMatch?.[2] || altMatch?.[3] || "").replace(/[<>]/g, "");
      return `<img src="${src}" alt="${alt}" />`;
    }
    return `<${name}>`;
  });
}

export function hostedAssetUrl(path: string, base = ""): string {
  const file = path.replace(/^\/+/, "").replace(/^uploads\//, "");
  const prefix = base.replace(/\/$/, "");
  return prefix ? `${prefix}/uploads/${file}` : `/uploads/${file}`;
}

export const ALLOWED_ASSET_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4"] as const;

export function acceptAssetFile(file: { mimetype: string; size: number }): string | null {
  if (!(ALLOWED_ASSET_MIME as readonly string[]).includes(file.mimetype)) {
    return "只收照片或 MP4 短视频";
  }
  if (file.mimetype.startsWith("image/") && file.size > 5_000_000) return "图片不能超过 5MB";
  if (file.mimetype === "video/mp4" && file.size > 40_000_000) return "短视频不能超过 40MB";
  return null;
}

export function canCopy(input: {
  disclosureAck: boolean;
  highRisk: boolean;
  highRiskAck: boolean;
}): { ok: boolean; reason?: string } {
  if (!input.disclosureAck) return { ok: false, reason: "请先勾选：已按平台规则做 AI 生成声明" };
  if (input.highRisk && !input.highRiskAck) return { ok: false, reason: "高风险项需勾选「已知晓仍复制」" };
  return { ok: true };
}

export const topicFormSeed = [
  { code: "form.long", labelZh: "一篇能发公众号的长文" },
  { code: "form.note", labelZh: "一组能发小红书的图" },
  { code: "form.both", labelZh: "两个都要" },
] as const;

export const topicIntentSeed = [
  { code: "intent.story", labelZh: "把我经历过的事讲清楚" },
  { code: "intent.howto", labelZh: "教别人一步一步做" },
  { code: "intent.opinion", labelZh: "说说我的看法" },
  { code: "intent.promo", labelZh: "安利 / 种草", risk: "advertising" },
] as const;

export function hitLimiter(
  store: Map<string, number[]>,
  key: string,
  max: number,
  windowMs: number,
  now = Date.now(),
): boolean {
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    store.set(key, hits);
    return false;
  }
  hits.push(now);
  store.set(key, hits);
  return true;
}

export class InFlight {
  private keys = new Set<string>();
  enter(key: string): boolean {
    if (this.keys.has(key)) return false;
    this.keys.add(key);
    return true;
  }
  leave(key: string) {
    this.keys.delete(key);
  }
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function throttle<A extends unknown[]>(fn: (...args: A) => void, wait: number) {
  let last = Number.NEGATIVE_INFINITY;
  return (...args: A) => {
    const now = Date.now();
    if (now - last < wait) return;
    last = now;
    fn(...args);
  };
}

export const articlePatchSchema = z
  .object({
    title: z.string().max(80).optional(),
    theme: z.string().max(200).optional(),
    formCode: z.string().max(40).optional(),
    intentCode: z.string().max(40).optional(),
    topicCodes: z.array(z.string().max(40)).max(2).optional(),
    anchors: z
      .array(
        z.object({
          id: z.string().max(64),
          text: z.string().max(2000),
          confirmed: z.boolean(),
          fromAssetId: z.string().max(64).optional(),
        }),
      )
      .max(8)
      .optional(),
    outline: z.string().max(8000).optional(),
    bodyLong: z.string().max(50000).optional(),
    bodyNote: z.string().max(8000).optional(),
    currentNode: z.enum(DAG_NODES).optional(),
    styleCode: z.string().max(40).optional(),
    layout: z.unknown().optional(),
    disclosureAck: z.boolean().optional(),
    highRiskAck: z.boolean().optional(),
  })
  .strict();

export const mcpCallSchema = z.object({
  tool: z.enum(["upsert_article", "add_anchor", "trigger_generate", "read_article"]),
  args: z.record(z.unknown()).optional(),
});

export const orderCreateSchema = z.object({
  planId: z.string().trim().min(1, "缺少套餐").max(40),
});

export function htmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<img[^>]*>/gi, "\n[图]\n")
    .replace(/<[^>]+>/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
