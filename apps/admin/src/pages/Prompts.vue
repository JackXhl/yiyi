<template>
  <h2>提示词</h2>
  <p>只改节点正文。版本号每次保存加一。</p>
  <el-table :data="items">
    <el-table-column prop="node" label="节点" width="120" />
    <el-table-column prop="platform" label="平台" width="100" />
    <el-table-column label="正文">
      <template #default="{ row }">
        <el-input v-model="row.body" type="textarea" :rows="2" />
      </template>
    </el-table-column>
    <el-table-column prop="version" label="版本" width="80" />
    <el-table-column label="操作" width="100">
      <template #default="{ row }">
        <el-button size="small" @click="save(row)">保存</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";

type Row = { id: string; node: string; platform: string; body: string; version: number };
const items = ref<Row[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/prompts");
}
onMounted(load);
async function save(row: Row) {
  await adminApi(`/api/admin/prompts/${row.id}`, { method: "PATCH", body: JSON.stringify({ body: row.body }) });
  ElMessage.success("已保存");
  await load();
}
</script>
