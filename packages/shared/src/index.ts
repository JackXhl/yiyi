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

export function canGenerate(input: { anchors: Anchor[]; quotaLeft: number; subActive: boolean }): {
  ok: boolean;
  reason?: string;
} {
  if (!input.subActive) return { ok: false, reason: "订阅已到期，只能看已有稿" };
  if (input.quotaLeft <= 0) return { ok: false, reason: "本月篇数用完了" };
  if (confirmedAnchorCount(input.anchors) < 2) {
    return { ok: false, reason: "还差一条你亲历过的事" };
  }
  return { ok: true };
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
