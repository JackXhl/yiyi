<template>
  <PageShell
    title="写作技能"
    summary="导入 SKILL.md 正文。技能只作为写作提示，不会执行任何脚本。"
    :guides="[
      '新导入的技能默认待审，审核启用后才会参与成稿。',
      '禁止导入降低检测、伪装人工类内容。',
      '只粘贴 Markdown 正文，不要上传可执行文件。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <template #toolbar>
      <el-button type="primary" @click="addOpen = true">新 增</el-button>
    </template>
    <el-empty v-if="!paged.length" description="还没有写作技能。可点击新增导入待审内容。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="160">
        <template #header><ColTitle label="技能名称" /></template>
        <template #default="{ row }">{{ row.name }}</template>
      </el-table-column>
      <el-table-column width="100">
        <template #header><ColTitle label="审核状态" /></template>
        <template #default="{ row }">{{ row.reviewed ? "已审核" : "待审核" }}</template>
      </el-table-column>
      <el-table-column width="100">
        <template #header><ColTitle label="是否启用" /></template>
        <template #default="{ row }">{{ row.enabled ? "启用" : "未启用" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button v-if="!row.enabled" size="small" @click="enable(row.id)">审核启用</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="addOpen" title="导入写作技能" width="640px">
    <el-form label-position="top">
      <HintField label="技能名称" extra="给运营识别用，用户不可见。">
        <el-input v-model="name" placeholder="例如：短句现场" />
      </HintField>
      <HintField label="SKILL.md 正文" extra="只贴 Markdown。导入后为待审，需再点审核启用。">
        <el-input v-model="markdown" type="textarea" :rows="10" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="addOpen = false">取 消</el-button>
      <el-button type="primary" @click="add">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { useClientPage } from "../useClientPage";

const items = ref<{ id: string; name: string; reviewed: boolean; enabled: boolean }[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const addOpen = ref(false);
const name = ref("");
const markdown = ref("");
async function load() {
  items.value = await adminApi("/api/admin/skills");
}
onMounted(load);
async function add() {
  await adminApi("/api/admin/skills", { method: "POST", body: JSON.stringify({ name: name.value, markdown: markdown.value }) });
  addOpen.value = false;
  name.value = "";
  markdown.value = "";
  ElMessage.success("已导入，待审核");
  await load();
}
async function enable(id: string) {
  await adminApi(`/api/admin/skills/${id}`, { method: "PATCH", body: JSON.stringify({ reviewed: true, enabled: true }) });
  ElMessage.success("已审核并启用");
  await load();
}
</script>
