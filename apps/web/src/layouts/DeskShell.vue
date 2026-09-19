<template>
  <div class="desk">
    <header class="topbar">
      <div class="brand">一意</div>
      <nav class="top-nav" aria-label="创作台">
        <router-link to="/drafts" :class="{ active: $route.path.startsWith('/drafts') }">作品</router-link>
        <router-link to="/write" :class="{ active: $route.path.startsWith('/write') }">创作</router-link>
        <router-link to="/account" :class="{ active: $route.path.startsWith('/account') }">账户</router-link>
      </nav>
      <div class="topbar-actions">
        <t-button theme="primary" @click="goWrite">新建作品</t-button>
      </div>
    </header>
    <p class="narrow-tip">请使用电脑端完成创作。当前屏幕宽度仅适合浏览。</p>
    <div class="desk-body">
      <nav class="sidemenu" aria-label="创作台">
        <router-link to="/drafts" :class="{ active: $route.path.startsWith('/drafts') }">
          <svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="9" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6" />
            <rect x="13.5" y="3.5" width="7" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6" />
            <rect x="3.5" y="14.5" width="7" height="6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6" />
            <rect x="13.5" y="11.5" width="7" height="9" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.6" />
          </svg>
          作品
        </router-link>
        <router-link to="/write" :class="{ active: $route.path.startsWith('/write') }">
          <svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 19.5h4.2L19 9.7a1.6 1.6 0 0 0 0-2.3L16.6 5a1.6 1.6 0 0 0-2.3 0L4.5 14.8V19.5Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M13.2 6.4 17.6 10.8" fill="none" stroke="currentColor" stroke-width="1.6" />
          </svg>
          创作
        </router-link>
        <router-link to="/account" :class="{ active: $route.path.startsWith('/account') }">
          <svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path d="M5.5 19.2c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          账户
        </router-link>
      </nav>
      <main class="main" :class="{ 'studio-main': $route.path.startsWith('/write') }">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { InFlight } from "@yiyi/shared";
import { api } from "../api";

const router = useRouter();
const flight = new InFlight();

async function goWrite() {
  if (!flight.enter("write")) return;
  try {
    const a = await api<{ id: string }>("/api/articles", { method: "POST", body: "{}" });
    router.push(`/write/${a.id}`);
  } finally {
    flight.leave("write");
  }
}
</script>
