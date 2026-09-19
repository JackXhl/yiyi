<template>
  <div class="login-split">
    <section class="login-hero">
      <h1>一意控制台</h1>
      <p>给运营人员配置模型、审核作品、管理订阅。用户在 C 端完成创作后，自行复制到各平台后台发表。</p>
    </section>
    <section class="login-panel">
      <div class="box">
        <h2>控制台登录</h2>
        <p class="sub">请使用运营邮箱。这不是 C 端用户登录页。</p>
        <el-form @submit.prevent="go" label-position="top">
          <HintField label="运营邮箱" tip="种子账号见本地环境说明" extra="填写已开通控制台权限的邮箱。">
            <el-input v-model="email" placeholder="例如 admin@yiyi.local" />
          </HintField>
          <HintField label="密码" tip="至少 8 位" extra="连续输错会被短暂锁定，请稍后再试。">
            <el-input v-model="password" type="password" placeholder="请输入密码" show-password />
          </HintField>
          <el-button type="primary" native-type="submit" style="width: 100%">登 录</el-button>
          <p class="warn-once">{{ err }}</p>
        </el-form>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { adminApi } from "../http";
import HintField from "../components/HintField.vue";
import { firstAllowedPath } from "../copy";
import { setAdminSession } from "../session";

const email = ref("admin@yiyi.local");
const password = ref("");
const err = ref("");
const router = useRouter();

async function go() {
  err.value = "";
  try {
    const out = await adminApi<{ token: string; admin: { email: string; permissions: string[] } }>(
      "/api/admin/login",
      {
        method: "POST",
        body: JSON.stringify({ email: email.value, password: password.value }),
      },
    );
    setAdminSession(out.token, out.admin?.email || email.value, out.admin?.permissions || []);
    router.push(firstAllowedPath(out.admin?.permissions || []));
  } catch (e) {
    err.value = e instanceof Error ? e.message : "登录失败";
  }
}
</script>
