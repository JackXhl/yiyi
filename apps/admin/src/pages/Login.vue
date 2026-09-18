<template>
  <el-card style="max-width: 400px; margin: 80px auto">
    <h2>运营登录</h2>
    <el-form @submit.prevent="go">
      <el-form-item label="邮箱"><el-input v-model="email" /></el-form-item>
      <el-form-item label="密码"><el-input v-model="password" type="password" /></el-form-item>
      <el-button type="primary" native-type="submit">登录</el-button>
      <p style="color: #c45656">{{ err }}</p>
    </el-form>
  </el-card>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { adminApi } from "../http";
const email = ref("admin@yiyi.local");
const password = ref("");
const err = ref("");
const router = useRouter();
async function go() {
  err.value = "";
  try {
    const out = await adminApi<{ token: string }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email: email.value, password: password.value }),
    });
    localStorage.setItem("yiyi.admin", out.token);
    router.push("/");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "失败";
  }
}
</script>
