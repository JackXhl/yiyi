<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册一意</h1>
      <p class="sub">邮箱加密码。注册后有体验额度，先写一篇试试。</p>
      <div class="field">
        <label>邮箱</label>
        <t-input v-model="email" placeholder="you@example.com" />
      </div>
      <div class="field">
        <label>密码</label>
        <t-input v-model="password" type="password" placeholder="至少 8 位" />
      </div>
      <t-button theme="primary" block :loading="loading" @click="onSubmit">注册</t-button>
      <p class="err" v-if="err">{{ err }}</p>
      <p class="hint" style="margin-top: 16px">已有账号？<router-link to="/login">去登录</router-link></p>
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
  err.value = "";
  loading.value = true;
  try {
    await auth.register({ email: email.value, password: password.value });
    await router.push("/drafts");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "注册失败";
  } finally {
    loading.value = false;
  }
}
</script>
