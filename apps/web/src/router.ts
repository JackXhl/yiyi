import { createRouter, createWebHistory } from "vue-router";
import { token } from "./api";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: () => import("./pages/LandingPage.vue") },
    { path: "/login", component: () => import("./pages/LoginPage.vue") },
    { path: "/register", component: () => import("./pages/RegisterPage.vue") },
    {
      path: "/",
      component: () => import("./layouts/DeskShell.vue"),
      children: [
        { path: "drafts", component: () => import("./pages/DraftsPage.vue") },
        { path: "write/:id?", component: () => import("./pages/WritePage.vue") },
        { path: "account", component: () => import("./pages/AccountPage.vue") },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const desk = to.path.startsWith("/drafts") || to.path.startsWith("/write") || to.path.startsWith("/account");
  if (desk && !token()) return "/login";
  return true;
});

export default router;
