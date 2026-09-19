<template>
  <PageShell
    title="内容审核"
    summary="抽查用户成稿。此处不代替各平台审核，只用于发现明显编造或违规。"
    :guides="[
      '邮箱已脱敏，用于定位用户而不是对外展示。',
      '点「查看正文」只读成稿与事实依据，本页不能代发或改稿。',
      '发现问题请在用户侧处理，不要在这里绕过平台规则。',
    ]"
    :total="items.length"
    :page="page"
    :page-size="pageSize"
    @update:page="page = $event"
    note="当前为全量列表（最多接口返回上限）。"
  >
    <template #query>
      <el-form inline @submit.prevent="apply">
        <HintField label="作品状态" tip="生成进度" extra="可按草稿、生成中、已成稿、失败筛选。">
          <el-select v-model="status" clearable placeholder="全部状态" style="width: 180px">
            <el-option v-for="(label, key) in ARTICLE_STATUS" :key="key" :label="label" :value="key" />
          </el-select>
        </HintField>
        <el-form-item>
          <el-button type="primary" @click="apply">搜 索</el-button>
          <el-button @click="status = ''; apply()">重 置</el-button>
        </el-form-item>
      </el-form>
    </template>
    <el-empty v-if="!paged.length" description="还没有可审核的作品。" />
    <el-table v-else :data="paged">
      <el-table-column min-width="160">
        <template #header><ColTitle label="用户" tip="脱敏后的登录邮箱" /></template>
        <template #default="{ row }">{{ row.email }}</template>
      </el-table-column>
      <el-table-column min-width="200">
        <template #header><ColTitle label="作品标题" tip="用户主题或生成标题" /></template>
        <template #default="{ row }">{{ row.title || "未命名" }}</template>
      </el-table-column>
      <el-table-column width="120">
        <template #header><ColTitle label="状态" tip="草稿 / 生成中 / 已成稿 / 失败" /></template>
        <template #default="{ row }">{{ ARTICLE_STATUS[row.status] || row.status }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" @click="open(row)">查看正文</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-drawer v-model="openDrawer" title="只读成稿" size="480px">
      <p class="field-extra">{{ current?.email }} · {{ ARTICLE_STATUS[current?.status || ""] || current?.status }}</p>
      <h3 style="font-size: 16px; margin: 12px 0 8px">{{ current?.title || "未命名" }}</h3>
      <p class="field-extra" v-if="current?.theme">主题：{{ current.theme }}</p>
      <p style="margin: 12px 0 6px; font-size: 14px">事实依据</p>
      <ul v-if="current?.anchors?.length" class="field-extra">
        <li v-for="(a, i) in current.anchors" :key="i">{{ a }}</li>
      </ul>
      <p v-else class="field-extra">未填写。</p>
      <p style="margin: 16px 0 6px; font-size: 14px">长文</p>
      <div class="inspect-html" v-html="safeLong" />
      <p style="margin: 16px 0 6px; font-size: 14px">笔记文案</p>
      <pre class="inspect-note">{{ current?.bodyNote || "暂无" }}</pre>
    </el-drawer>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { sanitizeArticleHtml } from "@yiyi/shared";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";
import { ARTICLE_STATUS } from "../copy";
import { useClientPage } from "../useClientPage";

type Item = {
  id: string;
  email: string;
  title: string;
  theme: string;
  status: string;
  bodyLong: string;
  bodyNote: string;
  anchors: string[];
};
const all = ref<Item[]>([]);
const status = ref("");
const items = computed(() => (status.value ? all.value.filter((i) => i.status === status.value) : all.value));
const { page, pageSize, paged, reset } = useClientPage(items);
const openDrawer = ref(false);
const current = ref<Item | null>(null);
const safeLong = computed(() => sanitizeArticleHtml(current.value?.bodyLong || "") || "暂无正文");

onMounted(async () => {
  all.value = (await adminApi<{ items: Item[] }>("/api/admin/articles")).items;
});
function apply() {
  reset();
}
function open(row: Item) {
  current.value = row;
  openDrawer.value = true;
}
</script>
<style scoped>
.inspect-html :deep(img) { max-width: 100%; height: auto; }
.inspect-note {
  white-space: pre-wrap;
  font: inherit;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 6px;
}
</style>
