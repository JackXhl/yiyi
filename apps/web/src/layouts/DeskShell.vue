<template>
  <div class="desk">
    <header class="topbar">
      <div class="brand">一意</div>
      <div class="topbar-actions">
        <t-button theme="primary" @click="goWrite">写一篇</t-button>
      </div>
    </header>
    <p class="narrow-tip">请用电脑写稿。手机上只能看看，写稿台需要更宽的屏幕。</p>
    <div class="desk-body">
      <nav class="sidemenu">
        <router-link to="/drafts" :class="{ active: $route.path.startsWith('/drafts') }">稿件</router-link>
        <router-link to="/write" :class="{ active: $route.path.startsWith('/write') }">写一篇</router-link>
        <router-link to="/account" :class="{ active: $route.path.startsWith('/account') }">账号</router-link>
      </nav>
      <main class="main">
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
