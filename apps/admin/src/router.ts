import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("./pages/Login.vue") },
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
        { path: "skills", component: () => import("./pages/Skills.vue") },
        { path: "roles", component: () => import("./pages/Roles.vue") },
        { path: "audit", component: () => import("./pages/Audit.vue") },
      ],
    },
  ],
});

router.beforeEach((to) => {
  if (to.path !== "/login" && !localStorage.getItem("yiyi.admin")) return "/login";
  return true;
});

export default router;
