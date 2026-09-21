<template>
  <PageShell
    title="数据概览"
    summary="看平台今天的用户规模、成稿量和失败任务，再从快捷入口进入具体配置。"
    variant="board"
    :guides="[
      '数字来自当前数据库的实时统计，不是财务报表。',
      '「今日新建作品」按自然日统计用户创建的作品，含未成稿。',
      '失败任务偏多时，先去「生成任务」看原因，再检查「模型配置」。',
    ]"
    note="当前为全量汇总，不是分页列表。"
  >
    <div class="stat-grid">
      <el-card v-for="c in cards" :key="c.title" class="stat-card" shadow="never">
        <h3>{{ c.title }}</h3>
        <div class="num">{{ c.value }}</div>
        <p>{{ c.hint }}</p>
      </el-card>
    </div>
    <p class="page-summary" style="margin-bottom: 8px">常用入口</p>
    <div class="quick-links">
      <el-button @click="$router.push('/users')">用户管理</el-button>
      <el-button @click="$router.push('/slots')">模型配置</el-button>
      <el-button @click="$router.push('/jobs')">生成任务</el-button>
    </div>
  </PageShell>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";

const cards = ref([
  { title: "注册用户", value: 0, hint: "所有已注册 C 端账号，含已停用。" },
  { title: "今日新建作品", value: 0, hint: "今天用户新建的作品数，含草稿。" },
  { title: "失败的生成任务", value: 0, hint: "历史失败次数。高则优先查模型配置。" },
]);

onMounted(async () => {
  const data = await adminApi<{ stats: { users: number; articlesToday: number; jobsFailed: number } }>(
    "/api/admin/overview",
  );
  cards.value = [
    { title: "注册用户", value: data.stats.users, hint: "所有已注册 C 端账号，含已停用。" },
    { title: "今日新建作品", value: data.stats.articlesToday, hint: "今天用户新建的作品数，含草稿。" },
    { title: "失败的生成任务", value: data.stats.jobsFailed, hint: "历史失败次数。高则优先查模型配置。" },
  ];
});
</script>
