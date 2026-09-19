<template>
  <PageShell
    title="风格预设"
    summary="控制 C 端可选的笔法。默认系统风格始终可用。"
    :guides="[
      '人物风格必须具备授权、公有领域笔法或用户自己的样本。',
      '不要整仓导入在世作者的仿写包。',
      '关闭后 C 端不再出现该风格，已选用的作品仍保留原值。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <el-empty v-if="!paged.length" description="还没有风格预设。" />
    <el-table v-else :data="paged">
      <el-table-column width="140">
        <template #header><ColTitle label="内部编号" tip="系统识别码" /></template>
        <template #default="{ row }">{{ row.code }}</template>
      </el-table-column>
      <el-table-column min-width="160">
        <template #header><ColTitle label="展示名称" tip="C 端芯片文案" /></template>
        <template #default="{ row }">{{ row.labelZh }}</template>
      </el-table-column>
      <el-table-column width="140">
        <template #header><ColTitle label="权利来源" tip="system / 授权 / 公有领域 / 用户样本" /></template>
        <template #default="{ row }">{{ rightsLabel(row.rights) }}</template>
      </el-table-column>
      <el-table-column width="100">
        <template #header><ColTitle label="是否启用" /></template>
        <template #default="{ row }">{{ row.enabled ? "启用" : "停用" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="dlg" title="修改风格预设" width="480px">
    <el-form label-position="top">
      <HintField label="是否启用" extra="关闭后 C 端不再展示该风格。">
        <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
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
import { useClientPage } from "../useClientPage";

type Row = { id: string; code: string; labelZh: string; rights: string; enabled: boolean };
const items = ref<Row[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const dlg = ref(false);
const form = reactive({ id: "", enabled: true });
async function load() {
  items.value = await adminApi("/api/admin/styles");
}
onMounted(load);
function rightsLabel(rights: string) {
  return { system: "系统默认", licensed: "已授权", public: "公有领域", user: "用户样本" }[rights] || rights;
}
function open(row: Row) {
  form.id = row.id;
  form.enabled = row.enabled;
  dlg.value = true;
}
async function save() {
  await adminApi(`/api/admin/styles/${form.id}`, { method: "PATCH", body: JSON.stringify({ enabled: form.enabled }) });
  dlg.value = false;
  ElMessage.success("已保存");
  await load();
}
</script>
