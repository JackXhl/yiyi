<template>
  <h2>订单</h2>
  <el-table :data="items">
    <el-table-column label="用户"><template #default="{ row }">{{ row.user?.email }}</template></el-table-column>
    <el-table-column prop="amountFen" label="分" />
    <el-table-column prop="status" label="状态" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button v-if="row.status === 'paid'" size="small" @click="refund(row.id)">标记退款并停额度</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ id: string; amountFen: number; status: string; user?: { email: string } }[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/orders");
}
onMounted(load);
async function refund(id: string) {
  await adminApi(`/api/admin/orders/${id}/refund-mark`, { method: "POST" });
  await load();
}
</script>
