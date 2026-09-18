<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>登录一意</h1>
      <p class="sub">用邮箱写稿，人自己去各站后台粘贴。</p>
      <div class="field">
        <label>邮箱</label>
        <t-input v-model="email" placeholder="you@example.com" @enter="onSubmit" />
      </div>
      <div class="field">
        <label>密码</label>
        <t-input v-model="password" type="password" placeholder="至少 8 位" @enter="onSubmit" />
      </div>
      <t-button theme="primary" block :loading="loading" @click="onSubmit">登录</t-button>
      <p class="err" v-if="err">{{ err }}</p>
      <p class="hint" style="margin-top: 16px">没有账号？<router-link to="/register">去注册</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../stores/auth";

const email = ref("");
const password = ref("");
const err = ref("");
const loading = ref(false);
const router = useRouter();
const auth = useAuth();

async function onSubmit() {
  if (loading.value) return;
  err.value = "";
  loading.value = true;
  try {
    await auth.login({ email: email.value, password: password.value });
    await router.push("/drafts");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "登录失败";
  } finally {
    loading.value = false;
  }
}
</script>
