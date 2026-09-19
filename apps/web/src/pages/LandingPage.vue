<template>
  <AuthSplit>
    <h1>一意</h1>
    <p class="sub">把亲历事实与现场素材，整理成可粘贴到公众号、小红书后台的成稿。由你本人在各站发表。</p>
    <p style="margin: 0 0 8px; display: flex; gap: 12px; align-items: center">
      <router-link to="/register"><t-button theme="primary">免费开始</t-button></router-link>
      <router-link to="/login">登录</router-link>
    </p>
    <div class="landing-plans">
      <div class="landing-plan" v-for="p in plans" :key="p.id">
        <span>{{ p.name }}</span>
        <span class="hint">{{ p.priceYuan === "0" ? "免费体验" : p.priceYuan + " 元" }} · {{ p.monthlyQuota }} 篇 / 月</span>
      </div>
    </div>
    <p class="hint" style="margin-top: 16px">月付或年付一次结清。到期后仅可查看已有作品，无法继续生成。</p>
  </AuthSplit>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api } from "../api";
import AuthSplit from "../layouts/AuthSplit.vue";

const plans = ref<{ id: string; name: string; monthlyQuota: number; priceYuan: string }[]>([]);
onMounted(async () => {
  try {
    plans.value = (await api<{ items: typeof plans.value }>("/api/billing/plans")).items;
  } catch {
    plans.value = [];
  }
});
</script>
