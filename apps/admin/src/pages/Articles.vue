<template>
  <h2>用户稿件抽检（邮箱已脱敏）</h2>
  <el-table :data="items">
    <el-table-column prop="email" label="用户" />
    <el-table-column prop="title" label="标题" />
    <el-table-column prop="status" label="状态" />
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ email: string; title: string; status: string }[]>([]);
onMounted(async () => {
  items.value = (await adminApi<{ items: typeof items.value }>("/api/admin/articles")).items;
});
</script>
