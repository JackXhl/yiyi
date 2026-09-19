<template>
  <AuthSplit>
    <h1>注册一意</h1>
    <p class="sub">使用邮箱注册。注册后即可获得体验额度，可先完成一篇作品。</p>
    <div class="field">
      <label>
        邮箱
        <t-input v-model="email" name="email" autocomplete="username" placeholder="you@example.com" @enter="onSubmit" />
      </label>
    </div>
    <div class="field">
      <label>
        密码
        <t-input v-model="password" type="password" name="password" autocomplete="new-password" placeholder="至少 8 位" @enter="onSubmit" />
      </label>
    </div>
    <t-button theme="primary" block :loading="loading" @click="onSubmit">注册</t-button>
    <p class="err" v-if="err" role="alert">{{ err }}</p>
    <p class="hint" style="margin-top: 16px">已有账号？<router-link to="/login">去登录</router-link></p>
  </AuthSplit>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "../stores/auth";
import AuthSplit from "../layouts/AuthSplit.vue";

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
    await auth.register({ email: email.value, password: password.value });
    await router.push("/drafts");
  } catch (e) {
    err.value = e instanceof Error ? e.message : "注册失败";
  } finally {
    loading.value = false;
  }
}
</script>
