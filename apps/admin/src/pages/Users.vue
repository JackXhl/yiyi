<template>
  <h2>用户</h2>
  <el-input v-model="q" placeholder="邮箱" style="width: 240px; margin-bottom: 12px" @change="load" />
  <el-table :data="items">
    <el-table-column prop="email" label="邮箱" />
    <el-table-column prop="planName" label="套餐" />
    <el-table-column prop="articles" label="稿件数" />
    <el-table-column label="状态">
      <template #default="{ row }">{{ row.disabled ? "停用" : "正常" }}</template>
    </el-table-column>
    <el-table-column label="操作" width="220">
      <template #default="{ row }">
        <el-button size="small" @click="toggle(row)">{{ row.disabled ? "启用" : "禁用" }}</el-button>
        <el-button size="small" @click="reset(row)">重置密码</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { adminApi } from "../http";
const q = ref("");
const items = ref<{ id: string; email: string; planName: string; articles: number; disabled: boolean }[]>([]);
async function load() {
  items.value = (await adminApi<{ items: typeof items.value }>(`/api/admin/users?q=${encodeURIComponent(q.value)}`)).items;
}
onMounted(load);
async function toggle(row: (typeof items.value)[0]) {
  await adminApi(`/api/admin/users/${row.id}/disable`, {
    method: "POST",
    body: JSON.stringify({ disabled: !row.disabled }),
  });
  await load();
}
async function reset(row: (typeof items.value)[0]) {
  const { value } = await ElMessageBox.prompt("新密码（至少 8 位）", "重置密码");
  await adminApi(`/api/admin/users/${row.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password: value }),
  });
  ElMessage.success("已重置");
}
</script>
