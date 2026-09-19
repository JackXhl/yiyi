<template>
  <PageShell
    title="操作日志"
    summary="只读查看控制台关键操作，用于追溯谁改过配置。"
    :guides="[
      '时间按本机时区显示。',
      '本页不能删除或改写日志。',
      '若条目为空，说明近期没有写审计的操作。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
    note="当前为全量列表。"
  >
    <el-empty v-if="!paged.length" description="还没有操作日志。" />
    <el-table v-else :data="paged">
      <el-table-column width="180">
        <template #header><ColTitle label="操作时间" /></template>
        <template #default="{ row }">{{ format(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column width="180">
        <template #header><ColTitle label="操作人" /></template>
        <template #default="{ row }">{{ row.actor || "—" }}</template>
      </el-table-column>
      <el-table-column width="160">
        <template #header><ColTitle label="动作" /></template>
        <template #default="{ row }">{{ row.action || "—" }}</template>
      </el-table-column>
      <el-table-column min-width="220">
        <template #header><ColTitle label="对象" /></template>
        <template #default="{ row }">{{ formatDetail(row.detail) }}</template>
      </el-table-column>
    </el-table>
  </PageShell>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import ColTitle from "../components/ColTitle.vue";
import { useClientPage } from "../useClientPage";

type Row = { createdAt?: string; actor?: string; action?: string; detail?: unknown };
const items = ref<Row[]>([]);
const { page, pageSize, paged } = useClientPage(items);
onMounted(async () => {
  const data = await adminApi<Row[] | { items: Row[] }>("/api/admin/audit");
  items.value = Array.isArray(data) ? data : data.items || [];
});
function format(s?: string) {
  return s ? new Date(s).toLocaleString("zh-CN", { hour12: false }) : "—";
}
function formatDetail(d: unknown) {
  if (d == null) return "—";
  if (typeof d === "string") return d;
  try {
    return JSON.stringify(d);
  } catch {
    return "—";
  }
}
</script>
