<template>
  <h2>套餐</h2>
  <el-table :data="items">
    <el-table-column prop="name" label="名称" />
    <el-table-column label="月篇数" width="140">
      <template #default="{ row }">
        <el-input-number v-model="row.monthlyQuota" :min="0" size="small" @change="save(row)" />
      </template>
    </el-table-column>
    <el-table-column prop="priceFen" label="分" />
    <el-table-column label="启用" width="100">
      <template #default="{ row }">
        <el-switch v-model="row.enabled" @change="save(row)" />
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";

type Plan = { id: string; name: string; monthlyQuota: number; priceFen: number; enabled: boolean };
const items = ref<Plan[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/plans");
}
onMounted(load);
async function save(row: Plan) {
  await adminApi(`/api/admin/plans/${row.id}`, {
    method: "PATCH",
    body: JSON.stringify({ monthlyQuota: row.monthlyQuota, enabled: row.enabled }),
  });
}
</script>
