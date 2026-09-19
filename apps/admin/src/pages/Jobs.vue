<template>
  <PageShell
    title="生成任务"
    summary="查看成稿流水。仅失败任务可以重试，成功任务请不要重复点击。"
    :guides="[
      '节点表示写到哪一步：大纲、正文或合规检查。',
      '失败时先看模型配置与密钥额度，再点重试。',
      '重试会再次消耗用户额度逻辑，请确认失败原因后再操作。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
    note="当前为全量列表。"
  >
    <template #query>
      <el-form inline @submit.prevent="apply">
        <HintField label="任务状态" extra="可只看失败任务，便于集中处理。">
          <el-select v-model="status" clearable placeholder="全部状态" style="width: 180px">
            <el-option v-for="(label, key) in JOB_STATUS" :key="key" :label="label" :value="key" />
          </el-select>
        </HintField>
        <el-form-item>
          <el-button type="primary" @click="apply">搜 索</el-button>
          <el-button @click="status = ''; apply()">重 置</el-button>
        </el-form-item>
      </el-form>
    </template>
    <el-empty v-if="!paged.length" description="还没有生成任务。" />
    <el-table v-else :data="paged">
      <el-table-column width="140">
        <template #header><ColTitle label="节点" tip="成稿流水中的步骤" /></template>
        <template #default="{ row }">{{ NODE_LABEL[row.node] || row.node }}</template>
      </el-table-column>
      <el-table-column width="120">
        <template #header><ColTitle label="状态" /></template>
        <template #default="{ row }">{{ JOB_STATUS[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column min-width="200">
        <template #header><ColTitle label="作品编号" tip="对应一篇用户作品" /></template>
        <template #default="{ row }">{{ row.articleId }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-popconfirm
            v-if="row.status === 'failed'"
            title="确认重试该失败任务？成功任务请勿重复点击。"
            @confirm="retry(row.id)"
          >
            <template #reference>
              <el-button size="small">重 试</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { JOB_STATUS, NODE_LABEL } from "../copy";
import { useClientPage } from "../useClientPage";

const all = ref<{ id: string; node: string; status: string; articleId: string }[]>([]);
const status = ref("");
const items = computed(() => (status.value ? all.value.filter((i) => i.status === status.value) : all.value));
const { page, pageSize, paged, reset } = useClientPage(items);
async function load() {
  all.value = await adminApi("/api/admin/jobs");
}
onMounted(load);
function apply() {
  reset();
}
async function retry(id: string) {
  await adminApi(`/api/admin/jobs/${id}/retry`, { method: "POST" });
  ElMessage.success("已提交重试");
  await load();
}
</script>
