<template>
  <h2>选题选项</h2>
  <p>改中文文案，不要改成术语。code 保持稳定。</p>
  <el-table :data="items">
    <el-table-column prop="code" label="code" />
    <el-table-column prop="labelZh" label="文案" />
    <el-table-column prop="axis" label="轴" />
    <el-table-column prop="enabled" label="启用" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-switch :model-value="row.enabled" @change="(v: boolean) => patch(row.id, { enabled: v })" />
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ id: string; code: string; labelZh: string; axis: string; enabled: boolean }[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/topic-options");
}
onMounted(load);
async function patch(id: string, body: { enabled: boolean }) {
  await adminApi(`/api/admin/topic-options/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await load();
}
</script>
