<template>
  <h2>生成任务</h2>
  <el-table :data="items">
    <el-table-column prop="node" label="节点" />
    <el-table-column prop="status" label="状态" />
    <el-table-column prop="articleId" label="稿" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button size="small" @click="retry(row.id)">重试</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ id: string; node: string; status: string; articleId: string }[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/jobs");
}
onMounted(load);
async function retry(id: string) {
  await adminApi(`/api/admin/jobs/${id}/retry`, { method: "POST" });
  await load();
}
</script>
