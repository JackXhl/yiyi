import { createRouter, createWebHistory } from "vue-router";
import { canOpenPath, firstAllowedPath, ROUTE_TITLE } from "./copy";
import { adminApi } from "./http";
import { adminPermissions, adminToken, clearAdminSession, saveAdminPermissions } from "./session";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("./pages/Login.vue"), meta: { title: "控制台登录" } },
    {
      path: "/",
      component: () => import("./layouts/Shell.vue"),
      children: [
        { path: "", component: () => import("./pages/Overview.vue") },
        { path: "users", component: () => import("./pages/Users.vue") },
        { path: "articles", component: () => import("./pages/Articles.vue") },
        { path: "plans", component: () => import("./pages/Plans.vue") },
        { path: "orders", component: () => import("./pages/Orders.vue") },
        { path: "jobs", component: () => import("./pages/Jobs.vue") },
        { path: "topics", component: () => import("./pages/Topics.vue") },
        { path: "slots", component: () => import("./pages/Slots.vue") },
        { path: "prompts", component: () => import("./pages/Prompts.vue") },
        { path: "skills", component: () => import("./pages/Skills.vue") },
        { path: "styles", component: () => import("./pages/Styles.vue") },
        { path: "mcp", component: () => import("./pages/Mcp.vue") },
        { path: "roles", component: () => import("./pages/Roles.vue") },
        { path: "audit", component: () => import("./pages/Audit.vue") },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.path === "/login") {
    document.title = "控制台登录 · 一意控制台";
    return true;
  }
  if (!adminToken()) return "/login";
  let perms = adminPermissions();
  if (!perms.length) {
    try {
      const me = await adminApi<{ permissions: string[] }>("/api/admin/me");
      saveAdminPermissions(me.permissions);
      perms = me.permissions;
    } catch {
      clearAdminSession();
      return "/login";
    }
  }
  if (!canOpenPath(to.path, perms)) {
    const next = firstAllowedPath(perms);
    if (next !== to.path) return next;
  }
  const name = ROUTE_TITLE[to.path] || "一意控制台";
  document.title = `${name} · 一意控制台`;
  return true;
});

export default router;
