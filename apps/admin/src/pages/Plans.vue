<template>
  <h2>套餐</h2>
  <el-table :data="items">
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="monthlyQuota" label="月篇数" />
    <el-table-column prop="priceFen" label="分" />
    <el-table-column prop="enabled" label="启用" />
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<unknown[]>([]);
onMounted(async () => {
  items.value = await adminApi("/api/admin/plans");
});
</script>
