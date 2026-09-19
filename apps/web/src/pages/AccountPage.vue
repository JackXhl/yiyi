<template>
  <div>
    <h1 class="page-title">账户</h1>
    <div class="account-card">
      <p style="margin: 0 0 8px">{{ me?.email }}</p>
      <p style="margin: 0" class="hint">
        {{ me?.planName }} · 剩余 {{ me?.quotaLeft }} / {{ me?.quota }} 篇
        · 到期 {{ me?.subExpiresAt ? new Date(me.subExpiresAt).toLocaleString("zh-CN") : "—" }}
      </p>
      <p v-if="!me?.subActive" class="err">订阅已到期，仅可查看已有作品。</p>
    </div>
    <h2 class="page-title" style="font-size: 16px; margin-top: 8px">开通套餐</h2>
    <div class="plan-card" v-for="p in plans" :key="p.id" :class="{ current: isCurrent(p) }">
      <div class="grow">
        <div>{{ p.name }}</div>
        <div class="hint">{{ p.priceYuan === "0" ? "免费体验" : p.priceYuan + " 元" }} · {{ p.monthlyQuota }} 篇 / 月</div>
      </div>
      <span v-if="isCurrent(p)" class="chip on">当前套餐</span>
      <t-button v-else size="small" theme="primary" :loading="buying === p.id" @click="buy(p.id)">开通</t-button>
    </div>
    <h2 class="page-title" style="font-size: 16px; margin-top: 8px">订单</h2>
    <p class="hint" v-if="!me?.orders?.length">还没有订单</p>
    <div v-for="o in me?.orders || []" :key="o.id" class="order-row">
      {{ (o.amountFen / 100).toFixed(0) }} 元 · {{ o.status === "paid" ? "已支付" : o.status === "pending" ? "待支付" : o.status }}
    </div>
    <p style="margin-top: 24px"><t-button variant="outline" @click="out">退出</t-button></p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useAuth } from "../stores/auth";
import { InFlight } from "@yiyi/shared";

const me = ref<{
  email: string;
  planId?: string;
  planName: string;
  quotaLeft: number;
  quota: number;
  subExpiresAt: string | null;
  subActive: boolean;
  orders: { id: string; amountFen: number; status: string }[];
} | null>(null);
const plans = ref<{ id: string; name: string; monthlyQuota: number; priceYuan: string }[]>([]);
const buying = ref("");
const router = useRouter();
const auth = useAuth();
const flight = new InFlight();

onMounted(async () => {
  me.value = await api("/api/me");
  plans.value = (await api<{ items: typeof plans.value }>("/api/billing/plans")).items;
});

function isCurrent(p: { id: string; name: string }) {
  if (!me.value) return false;
  if (me.value.planId) return p.id === me.value.planId;
  return p.name === me.value.planName;
}

async function buy(planId: string) {
  if (!flight.enter(`buy:${planId}`)) return;
  buying.value = planId;
  try {
    const order = await api<{ orderId: string; mock: boolean }>("/api/billing/orders", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
    if (order.mock) {
      await api(`/api/billing/orders/${order.orderId}/mock-pay`, { method: "POST" });
      me.value = await api("/api/me");
    }
  } finally {
    buying.value = "";
    flight.leave(`buy:${planId}`);
  }
}

function out() {
  auth.logout();
  router.push("/login");
}
</script>
