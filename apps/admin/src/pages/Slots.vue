<template>
  <h2>能力槽</h2>
  <p>C 端不展示模型名。无 Key 时仍拦锚点并出降级稿。</p>
  <el-table :data="items">
    <el-table-column prop="slot" label="槽" />
    <el-table-column prop="baseUrl" label="baseUrl" />
    <el-table-column prop="model" label="模型" />
    <el-table-column prop="apiKey" label="密钥" />
  </el-table>
  <el-form :inline="true" style="margin-top: 16px">
    <el-form-item label="槽"><el-input v-model="form.slot" placeholder="text_long" /></el-form-item>
    <el-form-item label="baseUrl"><el-input v-model="form.baseUrl" /></el-form-item>
    <el-form-item label="model"><el-input v-model="form.model" /></el-form-item>
    <el-form-item label="key"><el-input v-model="form.apiKey" /></el-form-item>
    <el-button type="primary" @click="save">保存</el-button>
  </el-form>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { adminApi } from "../http";
const items = ref<{ slot: string; baseUrl: string; model: string; apiKey: string }[]>([]);
const form = reactive({ slot: "text_long", baseUrl: "", model: "", apiKey: "" });
async function load() {
  items.value = await adminApi("/api/admin/slots");
}
onMounted(load);
async function save() {
  await adminApi(`/api/admin/slots/${form.slot}`, { method: "PATCH", body: JSON.stringify(form) });
  await load();
}
</script>
