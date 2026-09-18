<template>
  <h2>操作日志</h2>
  <el-table :data="items">
    <el-table-column prop="createdAt" label="时间" />
    <el-table-column prop="actor" label="人" />
    <el-table-column prop="action" label="动作" />
    <el-table-column prop="detail" label="对象" />
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<unknown[]>([]);
onMounted(async () => {
  items.value = await adminApi("/api/admin/audit");
});
</script>
