<template>
  <PageShell
    title="开放接口"
    summary="为本地助手生成访问令牌。令牌不能发表内容，作废后立即失效。"
    :guides="[
      '令牌明文只出现一次，关闭提示后无法再查看，请立刻复制到安全处。',
      '备注方便识别来源，例如「编辑器插件」。',
      '作废后该令牌立刻不能再调用接口。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
  >
    <template #toolbar>
      <el-button type="primary" @click="addOpen = true">生成访问令牌</el-button>
    </template>
    <el-empty v-if="!paged.length" description="还没有访问令牌。需要本地助手接入时再生成。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="180">
        <template #header><ColTitle label="备注" tip="便于识别令牌用途" /></template>
        <template #default="{ row }">{{ row.label }}</template>
      </el-table-column>
      <el-table-column width="100">
        <template #header><ColTitle label="状态" /></template>
        <template #default="{ row }">{{ row.enabled ? "有效" : "已作废" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-popconfirm
            v-if="row.enabled"
            title="确认作废该令牌？作废后立即无法调用接口。"
            @confirm="revoke(row.id)"
          >
            <template #reference>
              <el-button size="small" type="danger">作废令牌</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>
  <el-dialog v-model="addOpen" title="生成访问令牌" width="520px">
    <el-form label-position="top">
      <HintField label="备注" extra="写清给谁用，例如「本机编辑器」。">
        <el-input v-model="label" placeholder="例如：本机编辑器" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="addOpen = false">取 消</el-button>
      <el-button type="primary" @click="create">确 定</el-button>
    </template>
  </el-dialog>
  <el-dialog v-model="onceOpen" title="请立即保存令牌" width="560px">
    <el-alert type="error" :closable="false" title="关闭后无法再查看明文，请立刻复制到安全处。" />
    <el-input v-model="once" readonly style="margin-top: 12px" />
    <template #footer>
      <el-button type="primary" @click="copyOnce">复制并关闭</el-button>
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

const items = ref<{ id: string; label: string; enabled: boolean }[]>([]);
const { page, pageSize, paged } = useClientPage(items);
const addOpen = ref(false);
const onceOpen = ref(false);
const label = ref("本机编辑器");
const once = ref("");
async function load() {
  items.value = await adminApi("/api/admin/mcp-tokens");
}
onMounted(load);
async function create() {
  const out = await adminApi<{ token: string }>("/api/admin/mcp-tokens", {
    method: "POST",
    body: JSON.stringify({ label: label.value }),
  });
  addOpen.value = false;
  once.value = out.token;
  onceOpen.value = true;
  await load();
}
async function revoke(id: string) {
  await adminApi(`/api/admin/mcp-tokens/${id}/revoke`, { method: "POST" });
  ElMessage.success("令牌已作废");
  await load();
}
async function copyOnce() {
  try {
    await navigator.clipboard.writeText(once.value);
    ElMessage.success("已复制");
  } catch {
    ElMessage.warning("请手动复制");
  }
  onceOpen.value = false;
}
</script>
