<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>注册一意</h1>
      <p class="sub">邮箱加密码。注册后有体验额度，先写一篇试试。</p>
      <t-form :data="form" @submit="onSubmit">
        <t-form-item label="邮箱" name="email">
          <t-input v-model="form.email" placeholder="you@example.com" />
        </t-form-item>
        <t-form-item label="密码" name="password">
          <t-input v-model="form.password" type="password" placeholder="至少 8 位" />
        </t-form-item>
        <t-button theme="primary" type="submit" block :loading="loading">注册</t-button>
      </t-form>
      <p class="err" v-if="err">{{ err }}</p>
      <p class="hint" style="margin-top: 16px">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../stores/auth";

const form = reactive({ email: "", password: "" });
const err = ref("");
const loading = ref(false);
const router = useRouter();
const auth = useAuth();

async function onSubmit() {
  err.value = "";
  loading.value = true;
  try {
    await auth.register(form);
    router.push("/drafts");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "注册失败";
  } finally {
    loading.value = false;
  }
}
</script>
