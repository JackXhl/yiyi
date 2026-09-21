<template>
  <PageShell
    title="模型配置"
    summary="配置成稿用的大模型。C 端不展示模型名称。未填密钥时仍拦截事实依据，并产出降级稿。"
    :guides="[
      '三项能力：长文生成、大纲生成、视觉理解，请分别填写。',
      '百炼接口地址填 https://dashscope.aliyuncs.com/compatible-mode/v1 ，不要加 /chat/completions。',
      '密钥只显示「已保存」。再次保存时留空表示不修改。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <el-empty v-if="!paged.length" description="还没有能力配置。点击修改即可写入三项能力。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="140">
        <template #header><ColTitle label="能力类型" tip="长文 / 大纲 / 视觉" /></template>
        <template #default="{ row }">{{ SLOT_LABEL[row.slot] || row.slot }}</template>
      </el-table-column>
      <el-table-column min-width="260">
        <template #header><ColTitle label="接口地址" tip="OpenAI 兼容模式的根地址" /></template>
        <template #default="{ row }">{{ row.baseUrl || "未填写" }}</template>
      </el-table-column>
      <el-table-column min-width="160">
        <template #header><ColTitle label="模型标识" tip="如 qwen-turbo" /></template>
        <template #default="{ row }">{{ row.model || "未填写" }}</template>
      </el-table-column>
      <el-table-column min-width="128">
        <template #header><ColTitle label="API 密钥" tip="界面只显示是否已保存" /></template>
        <template #default="{ row }">{{ row.apiKey || "未保存" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">修 改</el-button>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="dlg" title="修改模型配置" width="560px">
    <el-form label-position="top">
      <HintField label="能力类型" extra="系统内部名称，请勿改成不存在的值。">
        <el-input v-model="form.slot" disabled />
      </HintField>
      <HintField
        label="接口地址"
        tip="兼容模式根路径"
        extra="百炼示例：https://dashscope.aliyuncs.com/compatible-mode/v1 。不要在末尾加 /chat/completions。"
      >
        <el-input v-model="form.baseUrl" placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1" />
      </HintField>
      <HintField label="模型标识" extra="长文与大纲建议 qwen-turbo；视觉建议 qwen-vl-plus。">
        <el-input v-model="form.model" placeholder="例如 qwen-turbo" />
      </HintField>
      <HintField label="API 密钥" extra="已保存的密钥不会回显。留空表示不修改。">
        <el-input v-model="form.apiKey" type="password" show-password placeholder="留空表示不修改" />
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
import { SLOT_LABEL } from "../copy";
import { useClientPage } from "../useClientPage";

type Row = { slot: string; baseUrl: string; model: string; apiKey: string };
const items = ref<Row[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const dlg = ref(false);
const form = reactive({ slot: "", baseUrl: "", model: "", apiKey: "" });

async function load() {
  items.value = await adminApi("/api/admin/slots");
}
onMounted(load);
function open(row: Row) {
  form.slot = row.slot;
  form.baseUrl = row.baseUrl || "";
  form.model = row.model || "";
  form.apiKey = "";
  dlg.value = true;
}
async function save() {
  const body: Record<string, string> = { baseUrl: form.baseUrl, model: form.model };
  if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();
  await adminApi(`/api/admin/slots/${form.slot}`, { method: "PATCH", body: JSON.stringify(body) });
  dlg.value = false;
  ElMessage.success("已保存");
  await load();
}
</script>
