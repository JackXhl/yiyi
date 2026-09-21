<template>
  <PageShell
    title="用户管理"
    summary="查看 C 端用户、调整套餐、停用账号或重置密码。"
    :guides="[
      '按登录邮箱搜索。停用后用户无法登录，已有作品仍保留。',
      '改套餐立即生效，不会自动扣款。',
      '重置密码后请把新密码通过安全渠道告知用户。',
    ]"
    :total="filtered.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <template #query>
      <el-form inline @submit.prevent="search">
        <HintField label="用户邮箱" tip="C 端注册邮箱" extra="支持模糊匹配，例如输入 yiyi 可筛一批测试号。">
          <el-input v-model="q" placeholder="请输入用户登录邮箱" clearable style="width: 260px" @keyup.enter="search" />
        </HintField>
        <el-form-item>
          <el-button type="primary" @click="search">搜 索</el-button>
          <el-button @click="q = ''; search()">重 置</el-button>
        </el-form-item>
      </el-form>
    </template>
    <el-empty v-if="!paged.length" description="还没有用户。C 端完成注册后会显示在这里。" />
    <el-table v-else :data="paged">
      <el-table-column prop="email" min-width="220">
        <template #header><ColTitle label="用户邮箱" tip="C 端登录邮箱" /></template>
      </el-table-column>
      <el-table-column min-width="140">
        <template #header><ColTitle label="当前套餐" tip="修改后立即生效，不自动扣款" /></template>
        <template #default="{ row }">{{ row.planName || "未分配" }}</template>
      </el-table-column>
      <el-table-column min-width="110">
        <template #header><ColTitle label="作品数" tip="该用户创建的作品总数" /></template>
        <template #default="{ row }">{{ row.articles }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="账号状态" tip="停用后无法登录 C 端" /></template>
        <template #default="{ row }">{{ row.disabled ? "已停用" : "正常" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openPlan(row)">调整套餐</el-button>
          <el-popconfirm
            :title="row.disabled ? '确认重新允许该用户登录？' : '停用后该用户无法登录 C 端，已有作品仍保留。确认停用？'"
            @confirm="toggle(row)"
          >
            <template #reference>
              <el-button size="small">{{ row.disabled ? "启用" : "停用" }}</el-button>
            </template>
          </el-popconfirm>
          <el-button size="small" @click="openReset(row)">重置密码</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>

  <el-dialog v-model="planOpen" title="调整套餐" width="480px">
    <el-form label-position="top">
      <HintField label="套餐" tip="用户当前订阅方案" extra="修改后立即生效，不自动扣款。">
        <el-select v-model="planId" placeholder="请选择套餐" style="width: 100%">
          <el-option v-for="p in plans" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="planOpen = false">取 消</el-button>
      <el-button type="primary" @click="savePlan">确 定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="pwdOpen" title="重置密码" width="480px">
    <el-form label-position="top">
      <HintField label="新密码" tip="至少 8 位" extra="确定后立刻作废原密码，请自行告知用户。">
        <el-input v-model="pwd" type="password" show-password placeholder="请输入至少 8 位新密码" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="pwdOpen = false">取 消</el-button>
      <el-button type="primary" @click="savePwd">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { useClientPage } from "../useClientPage";

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
const filtered = computed(() => items.value);
const { page, pageSize, paged, reset } = useClientPage(filtered);
const planOpen = ref(false);
const pwdOpen = ref(false);
const current = ref<Row | null>(null);
const planId = ref("");
const pwd = ref("");

async function search() {
  reset();
  items.value = (await adminApi<{ items: Row[] }>(`/api/admin/users?q=${encodeURIComponent(q.value)}`)).items;
}
onMounted(async () => {
  plans.value = await adminApi("/api/admin/plans");
  await search();
});
async function toggle(row: Row) {
  await adminApi(`/api/admin/users/${row.id}/disable`, {
    method: "POST",
    body: JSON.stringify({ disabled: !row.disabled }),
  });
  ElMessage.success(row.disabled ? "已启用" : "已停用");
  await search();
}
function openPlan(row: Row) {
  current.value = row;
  planId.value = row.planId || "";
  planOpen.value = true;
}
function openReset(row: Row) {
  current.value = row;
  pwd.value = "";
  pwdOpen.value = true;
}
async function savePlan() {
  if (!current.value || !planId.value) return;
  await adminApi(`/api/admin/users/${current.value.id}/plan`, {
    method: "POST",
    body: JSON.stringify({ planId: planId.value }),
  });
  planOpen.value = false;
  ElMessage.success("套餐已更新");
  await search();
}
async function savePwd() {
  if (!current.value) return;
  await adminApi(`/api/admin/users/${current.value.id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password: pwd.value }),
  });
  pwdOpen.value = false;
  ElMessage.success("密码已重置");
}
</script>
