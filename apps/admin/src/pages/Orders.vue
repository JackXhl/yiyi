<template>
  <PageShell
    title="订单管理"
    summary="查看订阅订单。标记退款会停止该订单对应的额度。"
    :guides="[
      '金额按元展示，系统按分存储。',
      '仅「已支付」订单可以标记退款。',
      '标记退款是运营记账，不会自动调用微信原路退回。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
    note="当前为全量列表。"
  >
    <el-empty v-if="!paged.length" description="还没有订单。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="200">
        <template #header><ColTitle label="用户邮箱" tip="下单的 C 端账号" /></template>
        <template #default="{ row }">{{ row.user?.email || "—" }}</template>
      </el-table-column>
      <el-table-column width="120">
        <template #header><ColTitle label="金额（元）" tip="已从分换算" /></template>
        <template #default="{ row }">{{ fenToYuan(row.amountFen) }}</template>
      </el-table-column>
      <el-table-column width="120">
        <template #header><ColTitle label="订单状态" /></template>
        <template #default="{ row }">{{ ORDER_STATUS[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-popconfirm
            v-if="row.status === 'paid'"
            title="确认标记退款？将停止该订单对应额度，不会自动原路退回。"
            @confirm="refund(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger">标记退款</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import ColTitle from "../components/ColTitle.vue";
import { fenToYuan, ORDER_STATUS } from "../copy";
import { useClientPage } from "../useClientPage";

const items = ref<{ id: string; amountFen: number; status: string; user?: { email: string } }[]>([]);
const { page, pageSize, paged } = useClientPage(items);
async function load() {
  items.value = await adminApi("/api/admin/orders");
}
onMounted(load);
async function refund(id: string) {
  await adminApi(`/api/admin/orders/${id}/refund-mark`, { method: "POST" });
  ElMessage.success("已标记退款");
  await load();
}
</script>
