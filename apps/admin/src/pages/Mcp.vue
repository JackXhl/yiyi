<template>
  <h2>MCP 令牌</h2>
  <p>对外 Server，无发表工具。吊销后立即失效。</p>
  <el-input v-model="label" placeholder="备注" style="width: 200px" />
  <el-button type="primary" @click="create">签发</el-button>
  <p v-if="once" style="color: #07c160">请立刻保存：{{ once }}</p>
  <el-table :data="items" style="margin-top: 16px">
    <el-table-column prop="label" label="备注" />
    <el-table-column prop="enabled" label="启用" />
    <el-table-column label="操作">
      <template #default="{ row }">
        <el-button size="small" @click="revoke(row.id)">吊销</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ id: string; label: string; enabled: boolean }[]>([]);
const label = ref("cursor");
const once = ref("");
async function load() {
  items.value = await adminApi("/api/admin/mcp-tokens");
}
onMounted(load);
async function create() {
  const out = await adminApi<{ token: string }>("/api/admin/mcp-tokens", {
    method: "POST",
    body: JSON.stringify({ label: label.value }),
  });
  once.value = out.token;
  await load();
}
async function revoke(id: string) {
  await adminApi(`/api/admin/mcp-tokens/${id}/revoke`, { method: "POST" });
  await load();
}
</script>
