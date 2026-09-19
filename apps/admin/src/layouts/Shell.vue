<template>
  <el-container class="admin-layout">
    <el-aside class="admin-aside" :width="collapsed ? '64px' : '210px'">
      <div class="admin-brand">
        <div v-if="!collapsed">一意控制台<small>运营管理</small></div>
        <div v-else>一意</div>
      </div>
      <el-menu
        router
        :default-active="$route.path"
        :collapse="collapsed"
        :collapse-transition="false"
      >
        <template v-for="item in menu" :key="'title' in item && 'children' in item ? item.title : item.path">
          <el-sub-menu v-if="'children' in item" :index="item.title">
            <template #title>{{ item.title }}</template>
            <el-menu-item v-for="c in item.children" :key="c.path" :index="c.path">{{ c.title }}</el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">{{ item.title }}</el-menu-item>
        </template>
      </el-menu>
    </el-aside>
    <el-container>
      <header class="admin-header">
        <el-button :icon="collapsed ? Expand : Fold" circle @click="collapsed = !collapsed" />
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>控制台</el-breadcrumb-item>
          <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
        </el-breadcrumb>
        <span class="spacer" />
        <el-button :icon="FullScreen" circle @click="toggleFull" />
        <span class="who">{{ email }}</span>
        <el-button type="primary" link @click="logout">退出登录</el-button>
      </header>
      <div class="tags-view">
        <span
          v-for="t in tags"
          :key="t.path"
          class="tag-item"
          :class="{ on: t.path === $route.path }"
          @click="$router.push(t.path)"
        >
          {{ t.title }}
          <button v-if="t.path !== '/'" type="button" @click.stop="closeTag(t.path)">×</button>
        </span>
      </div>
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Expand, Fold, FullScreen } from "@element-plus/icons-vue";
import { menuFor, ROUTE_TITLE, type MenuNode } from "../copy";
import { adminApi } from "../http";
import { adminEmail, adminPermissions, clearAdminSession, saveAdminPermissions } from "../session";

const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const email = ref(adminEmail());
const perms = ref(adminPermissions());
const menu = computed(() => menuFor(perms.value));
const tags = ref<{ path: string; title: string }[]>([]);
const title = computed(() => ROUTE_TITLE[route.path] || "数据概览");

onMounted(async () => {
  try {
    const me = await adminApi<{ email: string; permissions: string[] }>("/api/admin/me");
    email.value = me.email;
    perms.value = me.permissions;
    saveAdminPermissions(me.permissions);
  } catch {
    logout();
  }
});

watch(
  () => route.path,
  (path) => {
    const name = ROUTE_TITLE[path];
    if (!name) return;
    if (!tags.value.some((t) => t.path === path)) tags.value.push({ path, title: name });
  },
  { immediate: true },
);

function closeTag(path: string) {
  tags.value = tags.value.filter((t) => t.path !== path);
  if (route.path === path) router.push(tags.value[tags.value.length - 1]?.path || firstLeaf(menu.value));
}

function firstLeaf(nodes: MenuNode[]): string {
  const n = nodes[0];
  if (!n) return "/";
  return "children" in n ? n.children[0]?.path || "/" : n.path;
}

function logout() {
  clearAdminSession();
  router.push("/login");
}

function toggleFull() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => undefined);
  else document.exitFullscreen().catch(() => undefined);
}
</script>
