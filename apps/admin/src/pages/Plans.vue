<template>
  <PageShell
    title="套餐管理"
    summary="设置每月可生成篇数以及套餐是否对用户可见。"
    :guides="[
      '价格在界面显示为元，系统按分存储。',
      '关闭「上架」后，用户无法新购该套餐，已购用户不受影响。',
      '改每月篇数立即作用于之后的额度计算。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <el-empty v-if="!paged.length" description="还没有套餐。请先执行数据库初始化。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="140">
        <template #header><ColTitle label="套餐名称" tip="对用户展示的名称" /></template>
        <template #default="{ row }">{{ row.name }}</template>
      </el-table-column>
      <el-table-column min-width="140">
        <template #header><ColTitle label="每月篇数" tip="每个自然月可生成的次数" /></template>
        <template #default="{ row }">{{ row.monthlyQuota }}</template>
      </el-table-column>
      <el-table-column min-width="140">
        <template #header><ColTitle label="价格（元）" tip="系统按分存储，这里已换算" /></template>
        <template #default="{ row }">{{ fenToYuan(row.priceFen) }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="是否上架" tip="关闭后用户无法新购" /></template>
        <template #default="{ row }">{{ row.enabled ? "上架" : "下架" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="openDlg" title="修改套餐" width="480px">
    <el-form label-position="top">
      <HintField label="每月篇数" tip="每个自然月可生成次数" extra="填 0 表示本月无法生成。">
        <el-input-number v-model="form.monthlyQuota" :min="0" />
      </HintField>
      <HintField label="是否上架" tip="下架后用户看不到购买入口" extra="已购用户仍可使用剩余额度。">
        <el-switch v-model="form.enabled" active-text="上架" inactive-text="下架" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="openDlg = false">取 消</el-button>
      <el-button type="primary" @click="save">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { fenToYuan } from "../copy";
import { useClientPage } from "../useClientPage";

type Plan = { id: string; name: string; monthlyQuota: number; priceFen: number; enabled: boolean };
const items = ref<Plan[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const openDlg = ref(false);
const form = reactive({ id: "", monthlyQuota: 0, enabled: true });

async function load() {
  items.value = await adminApi("/api/admin/plans");
}
onMounted(load);
function open(row: Plan) {
  form.id = row.id;
  form.monthlyQuota = row.monthlyQuota;
  form.enabled = row.enabled;
  openDlg.value = true;
}
async function save() {
  await adminApi(`/api/admin/plans/${form.id}`, {
    method: "PATCH",
    body: JSON.stringify({ monthlyQuota: form.monthlyQuota, enabled: form.enabled }),
  });
  openDlg.value = false;
  ElMessage.success("已保存");
  await load();
}
</script>
