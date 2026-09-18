<template>
  <h2>技能</h2>
  <p>只贴 SKILL.md 正文，不执行 scripts。禁止降检测类。</p>
  <el-input v-model="name" placeholder="名称" style="width: 200px" />
  <el-input v-model="markdown" type="textarea" :rows="6" style="margin: 8px 0" />
  <el-button type="primary" @click="add">导入待审</el-button>
  <el-table :data="items" style="margin-top: 16px">
    <el-table-column prop="name" label="名称" />
    <el-table-column prop="reviewed" label="已审" />
    <el-table-column prop="enabled" label="启用" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button size="small" @click="patch(row.id, { reviewed: true, enabled: true })">审核启用</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ id: string; name: string; reviewed: boolean; enabled: boolean }[]>([]);
const name = ref("");
const markdown = ref("");
async function load() {
  items.value = await adminApi("/api/admin/skills");
}
onMounted(load);
async function add() {
  await adminApi("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: name.value, markdown: markdown.value }) });
  await load();
}
async function patch(id: string, body: object) {
  await adminApi(`/api/admin/skills/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  await load();
}
</script>
