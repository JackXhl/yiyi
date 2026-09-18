<template>
  <h2>选题选项</h2>
  <p>改中文文案，不要改成术语。code 保持稳定。</p>
  <el-table :data="items">
    <el-table-column prop="code" label="code" />
    <el-table-column label="文案">
      <template #default="{ row }">
        <el-input v-model="row.labelZh" size="small" @change="patch(row.id, { labelZh: row.labelZh })" />
      </template>
    </el-table-column>
    <el-table-column prop="axis" label="轴" width="140" />
    <el-table-column label="启用" width="100">
      <template #default="{ row }">
        <el-switch v-model="row.enabled" @change="patch(row.id, { enabled: row.enabled })" />
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";

type Row = { id: string; code: string; labelZh: string; axis: string; enabled: boolean };
const items = ref<Row[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/topic-options");
}
onMounted(load);
async function patch(id: string, body: { enabled?: boolean; labelZh?: string }) {
  await adminApi(`/api/admin/topic-options/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}
</script>
