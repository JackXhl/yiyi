<template>
  <div>
    <h2 style="font-size: 20px; margin: 0 0 16px">账号</h2>
    <p>邮箱：{{ me?.email }}</p>
    <p>套餐：{{ me?.planName }}　剩余 {{ me?.quotaLeft }} / {{ me?.quota }} 篇</p>
    <p>到期：{{ me?.subExpiresAt ? new Date(me.subExpiresAt).toLocaleString("zh-CN") : "—" }}</p>
    <p v-if="!me?.subActive" class="err">订阅已到期，只能看已有稿。</p>
    <h3 style="font-size: 16px; margin: 24px 0 8px">开通</h3>
    <div v-for="p in plans" :key="p.id" style="padding: 8px 0; border-bottom: 1px solid #e7e7e7">
      {{ p.name }}　{{ p.priceYuan === "0" ? "免费体验" : p.priceYuan + " 元" }}　{{ p.monthlyQuota }} 篇 / 月
      <t-button size="small" variant="outline" style="margin-left: 12px" @click="buy(p.id)">开通</t-button>
    </div>
    <h3 style="font-size: 16px; margin: 24px 0 8px">订单</h3>
    <p class="hint" v-if="!me?.orders?.length">还没有订单</p>
    <div v-for="o in me?.orders || []" :key="o.id" class="check-item">
      {{ (o.amountFen / 100).toFixed(0) }} 元　{{ o.status === "paid" ? "已支付" : o.status === "pending" ? "待支付" : o.status }}
    </div>
    <p style="margin-top: 24px"><t-button variant="outline" @click="out">退出</t-button></p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";
import { useAuth } from "../stores/auth";

const me = ref<{
  email: string;
  planName: string;
  quotaLeft: number;
  quota: number;
  subExpiresAt: string | null;
  subActive: boolean;
  orders: { id: string; amountFen: number; status: string }[];
} | null>(null);
const plans = ref<{ id: string; name: string; monthlyQuota: number; priceYuan: string }[]>([]);
const router = useRouter();
const auth = useAuth();

onMounted(async () => {
  me.value = await api("/api/me");
  plans.value = (await api<{ items: typeof plans.value }>("/api/billing/plans")).items;
});

async function buy(planId: string) {
  const order = await api<{ orderId: string; mock: boolean }>("/api/billing/orders", {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  if (order.mock) {
    await api(`/api/billing/orders/${order.orderId}/mock-pay`, { method: "POST" });
    me.value = await api("/api/me");
  }
}

function out() {
  auth.logout();
  router.push("/login");
}
</script>
