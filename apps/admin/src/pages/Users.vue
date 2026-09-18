<template>
  <h2>用户</h2>
  <el-input v-model="q" placeholder="邮箱" style="width: 240px; margin-bottom: 12px" @change="load" />
  <el-table :data="items">
    <el-table-column prop="email" label="邮箱" />
    <el-table-column label="套餐" width="160">
      <template #default="{ row }">
        <el-select :model-value="row.planId" size="small" placeholder="套餐" @change="(v: string) => setPlan(row, v)">
          <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </template>
    </el-table-column>
    <el-table-column prop="articles" label="稿件数" width="90" />
    <el-table-column label="状态" width="90">
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

type Row = {
  id: string;
  email: string;
  planId: string | null;
  planName: string;
  articles: number;
  disabled: boolean;
};
const q = ref("");
const items = ref<Row[]>([]);
const plans = ref<{ id: string; name: string }[]>([]);

async function load() {
  items.value = (await adminApi<{ items: Row[] }>(`/api/admin/users?q=${encodeURIComponent(q.value)}`)).items;
}
onMounted(async () => {
  plans.value = await adminApi("/api/admin/plans");
  await load();
});
async function toggle(row: Row) {
  await adminApi(`/api/admin/users/${row.id}/disable`, {
    method: "POST",
    body: JSON.stringify({ disabled: !row.disabled }),
  });
  await load();
}
async function reset(row: Row) {
  const { value } = await ElMessageBox.prompt("新密码（至少 8 位）", "重置密码");
  await adminApi(`/api/admin/users/${row.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password: value }),
  });
  ElMessage.success("已重置");
}
async function setPlan(row: Row, planId: string) {
  await adminApi(`/api/admin/users/${row.id}/plan`, {
    method: "POST",
    body: JSON.stringify({ planId }),
  });
  await load();
}
</script>
