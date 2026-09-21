<template>
  <PageShell
    title="提示词模板"
    summary="调整大纲和正文的生成指令。每次保存版本号加一。"
    :guides="[
      '只改与已确认事实相关的写法要求。',
      '禁止加入绕过检测、伪装人工的指令。',
      '节点「大纲」影响结构，「正文」影响成稿段落。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <el-empty v-if="!paged.length" description="还没有提示词模板。请先执行数据库初始化。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="120">
        <template #header><ColTitle label="节点" tip="大纲或正文" /></template>
        <template #default="{ row }">{{ NODE_LABEL[row.node] || row.node }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="适用范围" tip="空表示全平台" /></template>
        <template #default="{ row }">{{ row.platform || "全部渠道" }}</template>
      </el-table-column>
      <el-table-column min-width="240">
        <template #header><ColTitle label="指令摘要" /></template>
        <template #default="{ row }">{{ row.body.slice(0, 48) }}{{ row.body.length > 48 ? "…" : "" }}</template>
      </el-table-column>
      <el-table-column min-width="96">
        <template #header><ColTitle label="版本" tip="每保存一次加一" /></template>
        <template #default="{ row }">{{ row.version }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="dlg" title="修改提示词模板" width="640px">
    <el-form label-position="top">
      <HintField label="指令正文" extra="只写已确认事实相关要求。不要输出 HTML，不要加入绕过检测的语句。">
        <el-input v-model="form.body" type="textarea" :rows="8" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="dlg = false">取 消</el-button>
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
import { NODE_LABEL } from "../copy";
import { useClientPage } from "../useClientPage";

type Row = { id: string; node: string; platform: string; body: string; version: number };
const items = ref<Row[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const dlg = ref(false);
const form = reactive({ id: "", body: "" });
async function load() {
  items.value = await adminApi("/api/admin/prompts");
}
onMounted(load);
function open(row: Row) {
  form.id = row.id;
  form.body = row.body;
  dlg.value = true;
}
async function save() {
  await adminApi(`/api/admin/prompts/${form.id}`, { method: "PATCH", body: JSON.stringify({ body: form.body }) });
  dlg.value = false;
  ElMessage.success("已保存");
  await load();
}
</script>
