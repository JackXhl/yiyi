<template>
  <PageShell
    title="内容类目"
    summary="维护 C 端选题芯片的中文名称。内部编号请勿修改。"
    :guides="[
      '中文名称会立刻出现在 C 端选题页。',
      '内部编号给系统识别用，改了会导致旧作品对不上。',
      '关闭「对用户展示」后，C 端不再出现该项，已选过的作品仍保留原值。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
    note="当前为全量列表。"
  >
    <template #query>
      <el-form inline @submit.prevent="apply">
        <HintField label="中文名称" extra="按展示文案筛选。">
          <el-input v-model="q" placeholder="请输入中文名称" clearable style="width: 220px" />
        </HintField>
        <el-form-item>
          <el-button type="primary" @click="apply">搜 索</el-button>
          <el-button @click="q = ''; apply()">重 置</el-button>
        </el-form-item>
      </el-form>
    </template>
    <el-empty v-if="!paged.length" description="没有匹配的类目。" />
    <el-table v-else :data="paged">
      <el-table-column width="160">
        <template #header><ColTitle label="内部编号" tip="系统识别码，请勿修改" /></template>
        <template #default="{ row }">{{ row.code }}</template>
      </el-table-column>
      <el-table-column min-width="180">
        <template #header><ColTitle label="中文名称" tip="C 端展示文案" /></template>
        <template #default="{ row }">{{ row.labelZh }}</template>
      </el-table-column>
      <el-table-column width="140">
        <template #header><ColTitle label="所属维度" tip="体裁 / 意图 / 类目" /></template>
        <template #default="{ row }">{{ AXIS_LABEL[row.axis] || row.axis }}</template>
      </el-table-column>
      <el-table-column width="120">
        <template #header><ColTitle label="对用户展示" /></template>
        <template #default="{ row }">{{ row.enabled ? "展示" : "隐藏" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="dlg" title="修改内容类目" width="480px">
    <el-form label-position="top">
      <HintField label="中文名称" tip="C 端芯片上的字" extra="请写用户能看懂的词，不要改成内部术语。">
        <el-input v-model="form.labelZh" />
      </HintField>
      <HintField label="对用户展示" extra="关闭后 C 端不再出现该项。">
        <el-switch v-model="form.enabled" active-text="展示" inactive-text="隐藏" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="dlg = false">取 消</el-button>
      <el-button type="primary" @click="save">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { AXIS_LABEL } from "../copy";
import { useClientPage } from "../useClientPage";

type Row = { id: string; code: string; labelZh: string; axis: string; enabled: boolean };
const all = ref<Row[]>([]);
const q = ref("");
const items = computed(() =>
  q.value ? all.value.filter((i) => i.labelZh.includes(q.value)) : all.value,
);
const { page, pageSize, paged, reset } = useClientPage(items);
const dlg = ref(false);
const form = reactive({ id: "", labelZh: "", enabled: true });

onMounted(async () => {
  all.value = await adminApi("/api/admin/topic-options");
});
function apply() {
  reset();
}
function open(row: Row) {
  form.id = row.id;
  form.labelZh = row.labelZh;
  form.enabled = row.enabled;
  dlg.value = true;
}
async function save() {
  await adminApi(`/api/admin/topic-options/${form.id}`, {
    method: "PATCH",
    body: JSON.stringify({ labelZh: form.labelZh, enabled: form.enabled }),
  });
  dlg.value = false;
  ElMessage.success("已保存");
  all.value = await adminApi("/api/admin/topic-options");
}
</script>
