export type MenuLeaf = { path: string; title: string };
export type MenuNode = MenuLeaf | { title: string; children: MenuLeaf[] };

export const MENU: MenuNode[] = [
  { path: "/", title: "数据概览" },
  {
    title: "业务运营",
    children: [
      { path: "/users", title: "用户管理" },
      { path: "/articles", title: "内容审核" },
    ],
  },
  {
    title: "订阅商业",
    children: [
      { path: "/plans", title: "套餐管理" },
      { path: "/orders", title: "订单管理" },
    ],
  },
  {
    title: "内容引擎",
    children: [
      { path: "/jobs", title: "生成任务" },
      { path: "/topics", title: "内容类目" },
      { path: "/slots", title: "模型配置" },
      { path: "/prompts", title: "提示词模板" },
      { path: "/skills", title: "写作技能" },
      { path: "/styles", title: "风格预设" },
      { path: "/mcp", title: "开放接口" },
    ],
  },
  {
    title: "系统管理",
    children: [
      { path: "/roles", title: "角色权限" },
      { path: "/audit", title: "操作日志" },
    ],
  },
];

export const ROUTE_PERM: Record<string, string> = {
  "/": "overview:view",
  "/users": "user:list",
  "/articles": "article:inspect",
  "/plans": "plan:edit",
  "/orders": "order:list",
  "/jobs": "job:retry",
  "/topics": "topic:edit",
  "/slots": "slot:edit",
  "/prompts": "prompt:edit",
  "/skills": "skill:edit",
  "/styles": "style:edit",
  "/mcp": "mcp:edit",
  "/roles": "role:edit",
  "/audit": "audit:view",
};

export function menuFor(perms: string[]): MenuNode[] {
  const allow = new Set(perms);
  return MENU.flatMap((node) => {
    if ("children" in node) {
      const children = node.children.filter((c) => allow.has(ROUTE_PERM[c.path]));
      return children.length ? [{ title: node.title, children }] : [];
    }
    return allow.has(ROUTE_PERM[node.path]) ? [node] : [];
  });
}

export function canOpenPath(path: string, perms: string[]) {
  const need = ROUTE_PERM[path];
  return !need || perms.includes(need);
}

export function firstAllowedPath(perms: string[]) {
  const leaves = MENU.flatMap((n) => ("children" in n ? n.children : [n]));
  return leaves.find((i) => perms.includes(ROUTE_PERM[i.path]))?.path ?? "/";
}

export const ROUTE_TITLE: Record<string, string> = Object.fromEntries(
  MENU.flatMap((n) => ("children" in n ? n.children : [n])).map((i) => [i.path, i.title]),
);

export const SLOT_LABEL: Record<string, string> = {
  text_long: "长文生成",
  text_json: "大纲生成",
  vision: "视觉理解",
};

export const JOB_STATUS: Record<string, string> = {
  queued: "排队中",
  running: "进行中",
  done: "成功",
  failed: "失败",
};

export const ORDER_STATUS: Record<string, string> = {
  pending: "待支付",
  paid: "已支付",
  refunded: "已退款",
};

export const ARTICLE_STATUS: Record<string, string> = {
  draft: "草稿",
  generating: "生成中",
  ready: "已成稿",
  failed: "失败",
};

export const AXIS_LABEL: Record<string, string> = {
  form: "作品体裁",
  intent_genre: "创作意图",
  topic: "内容类目",
};

export const NODE_LABEL: Record<string, string> = {
  outline: "大纲",
  body: "正文",
  check: "合规检查",
};

export function fenToYuan(fen: number) {
  return (fen / 100).toFixed(2);
}
