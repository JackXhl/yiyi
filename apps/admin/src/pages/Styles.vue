<template>
  <h2>写作风格</h2>
  <p>C 端默认系统风格。人物风格须授权/公有领域笔法/用户样本，不整仓导入名人包。</p>
  <el-table :data="items">
    <el-table-column prop="code" label="code" />
    <el-table-column prop="labelZh" label="名称" />
    <el-table-column prop="rights" label="权利" />
    <el-table-column label="启用">
      <template #default="{ row }">
        <el-switch v-model="row.enabled" @change="save(row)" />
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";

type Row = { id: string; code: string; labelZh: string; rights: string; enabled: boolean };
const items = ref<Row[]>([]);
async function load() {
  items.value = await adminApi("/api/admin/styles");
}
onMounted(load);
async function save(row: Row) {
  await adminApi(`/api/admin/styles/${row.id}`, { method: "PATCH", body: JSON.stringify({ enabled: row.enabled }) });
}
</script>
