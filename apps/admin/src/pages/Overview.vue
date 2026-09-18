<template>
  <h2>总览</h2>
  <el-table :data="rows">
    <el-table-column prop="label" label="项" />
    <el-table-column prop="value" label="数" />
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const rows = ref<{ label: string; value: number }[]>([]);
onMounted(async () => {
  rows.value = (await adminApi<{ rows: typeof rows.value }>("/api/admin/overview")).rows;
});
</script>
