<template>
  <PageShell
    title="阶段节点"
    summary="配置每个节点是 AI 自动、AI 后人工确认，还是只由人操作。成稿四步本版本必须 AI 自动；复制不能改成自动发表。"
    :guides="[
      '取材默认：AI 可分析素材，必须人确认后才能生成。',
      '成稿四步默认 AI 自动，生成中不能打断。',
      '取稿是本人粘贴到各站后台，不是勾选门。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <el-empty v-if="!paged.length" description="还没有节点配置。请先执行数据库初始化。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="100">
        <template #header><ColTitle label="阶段" /></template>
        <template #default="{ row }">{{ PHASE_LABEL[row.phase] || row.phase }}</template>
      </el-table-column>
      <el-table-column min-width="120">
        <template #header><ColTitle label="节点" /></template>
        <template #default="{ row }">{{ NODE_LABEL[row.node] || row.node }}</template>
      </el-table-column>
      <el-table-column min-width="160">
        <template #header><ColTitle label="运行方式" tip="改完只对下一次生成生效" /></template>
        <template #default="{ row }">{{ MODE_LABEL[row.runMode] || row.runMode }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="关联检查" /></template>
        <template #default="{ row }">{{ row.contextCheck ? "开" : "关" }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="内容检查" /></template>
        <template #default="{ row }">{{ row.contentCheck ? "开" : "关" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="dlg" title="修改阶段节点" width="480px">
    <el-form label-position="top">
      <HintField label="运行方式" extra="成稿四步必须 AI 自动。复制不能选自动发表。">
        <el-select v-model="form.runMode" style="width: 100%">
          <el-option
            v-for="m in modesFor(form.node)"
            :key="m"
            :label="MODE_LABEL[m]"
            :value="m"
          />
        </el-select>
      </HintField>
      <HintField label="检查">
        <el-checkbox v-model="form.contextCheck">上下文关联</el-checkbox>
        <el-checkbox v-model="form.contentCheck">内容检查</el-checkbox>
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
import { DAG_PHASE_LABEL, DAG_RUN_MODE_LABEL, AI_JOB_NODES, type DagRunMode } from "@yiyi/shared";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { NODE_LABEL } from "../copy";
import { useClientPage } from "../useClientPage";

const PHASE_LABEL = DAG_PHASE_LABEL;
const MODE_LABEL = DAG_RUN_MODE_LABEL;

type Row = {
  node: string;
  phase: string;
  sort: number;
  runMode: DagRunMode;
  contextCheck: boolean;
  contentCheck: boolean;
};
const items = ref<Row[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const dlg = ref(false);
const form = reactive({ node: "", runMode: "ai_auto" as DagRunMode, contextCheck: true, contentCheck: true });

function modesFor(node: string): DagRunMode[] {
  if ((AI_JOB_NODES as readonly string[]).includes(node)) return ["ai_auto"];
  if (node === "copy") return ["human_approve", "ai_then_human"];
  return ["ai_auto", "ai_then_human", "human_approve"];
}

async function load() {
  items.value = await adminApi("/api/admin/dag-nodes");
}
onMounted(load);

function open(row: Row) {
  form.node = row.node;
  form.runMode = row.runMode;
  form.contextCheck = row.contextCheck;
  form.contentCheck = row.contentCheck;
  dlg.value = true;
}

async function save() {
  await adminApi(`/api/admin/dag-nodes/${form.node}`, {
    method: "PATCH",
    body: JSON.stringify({
      runMode: form.runMode,
      contextCheck: form.contextCheck,
      contentCheck: form.contentCheck,
    }),
  });
  dlg.value = false;
  ElMessage.success("已保存");
  await load();
}
</script>
