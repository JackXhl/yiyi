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
  adapt: "渠道适配",
  check: "合规检查",
  copy: "复制发布",
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

export const PERMISSION_LABEL: Record<PermissionCode, { name: string; hint: string }> = {
  "overview:view": { name: "查看数据概览", hint: "能打开工作台数字" },
  "user:list": { name: "查看用户", hint: "能打开用户列表" },
  "user:disable": { name: "停用或启用用户", hint: "停用后用户无法登录 C 端" },
  "user:reset": { name: "重置用户密码", hint: "立刻作废原密码" },
  "user:plan": { name: "调整用户套餐", hint: "立刻改额度，不自动扣款" },
  "article:inspect": { name: "审核作品", hint: "只读抽查成稿" },
  "plan:edit": { name: "编辑套餐", hint: "改每月篇数或是否上架" },
  "order:list": { name: "查看订单", hint: "打开订单列表" },
  "order:refund": { name: "标记退款", hint: "记退款并停该单额度" },
  "job:retry": { name: "重试生成任务", hint: "仅失败任务可再跑" },
  "platform:edit": { name: "编辑站点配置", hint: "改站点级配置" },
  "topic:edit": { name: "编辑内容类目", hint: "改 C 端可见中文名" },
  "slot:edit": { name: "编辑模型配置", hint: "改接口地址、模型、密钥" },
  "prompt:edit": { name: "编辑提示词模板", hint: "改大纲或正文指令" },
  "skill:import": { name: "导入写作技能", hint: "新技能默认待审" },
  "skill:edit": { name: "审核写作技能", hint: "启用后参与成稿" },
  "style:edit": { name: "编辑风格预设", hint: "开关 C 端风格" },
  "mcp:edit": { name: "管理开放接口", hint: "生成或作废令牌" },
  "site:edit": { name: "编辑站点信息", hint: "站点展示名等" },
  "role:edit": { name: "编辑角色权限", hint: "改运营能进哪些页" },
  "audit:view": { name: "查看操作日志", hint: "只读审计" },
  "admin:edit": { name: "管理运营账号", hint: "给运营赋角色" },
};

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
  if (!input.subActive) return { ok: false, reason: "订阅已到期，仅可查看已有作品" };
  if (input.quotaLeft <= 0) return { ok: false, reason: "本月生成额度已用完" };
  if (input.theme !== undefined && input.theme.trim().length < 4) {
    return { ok: false, reason: "请填写至少 4 个字的作品主题" };
  }
  if (input.topicCodes !== undefined && input.topicCodes.length < 1) {
    return { ok: false, reason: "请选择至少一个内容类目" };
  }
  if (confirmedAnchorCount(input.anchors) < 2) {
    return { ok: false, reason: "请至少填写两条已确认的事实依据" };
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
  { code: "form.long", labelZh: "公众号长文" },
  { code: "form.note", labelZh: "小红书图文" },
  { code: "form.both", labelZh: "长文与笔记" },
] as const;

export const topicIntentSeed = [
  { code: "intent.story", labelZh: "经历叙述" },
  { code: "intent.howto", labelZh: "方法教程" },
  { code: "intent.opinion", labelZh: "观点评论" },
  { code: "intent.promo", labelZh: "商品推荐", risk: "advertising" },
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

function escapePlain(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Rebuild paste-ready HTML from the plain editor. Keep original <img> in [图] slots. */
export function plainToHtml(plain: string, originalHtml = ""): string {
  const imgs = [...originalHtml.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  let i = 0;
  const blocks = plain.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const parts: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length === 1 && lines[0] === "[图]") {
      const img = imgs[i++];
      if (img) parts.push(`<p>${img}</p>`);
      continue;
    }
    if (!lines.length) continue;
    parts.push(`<p>${lines.map(escapePlain).join("<br/>")}</p>`);
  }
  while (i < imgs.length) {
    parts.push(`<p>${imgs[i++]}</p>`);
  }
  return parts.join("");
}

export function pasteToPlain(input: { text?: string; html?: string }): string {
  const text = (input.text || "").replace(/\r\n/g, "\n").trim();
  if (text) return text;
  return htmlToPlain(input.html || "");
}
