<template>
  <div class="auth-page" style="align-items: stretch; padding-top: 72px">
    <div style="max-width: 720px; margin: 0 auto">
      <h1 style="font-size: 22px; margin: 0 0 8px">一意</h1>
      <p class="hint">把你亲历过的事和图，写成能贴进公众号和小红书后台的稿。人自己点发表。</p>
      <p style="margin: 24px 0">
        <router-link to="/register"><t-button theme="primary">开始写稿</t-button></router-link>
        <router-link to="/login" style="margin-left: 16px">登录</router-link>
      </p>
      <p class="hint">月付 / 年付一次结清。过期后只能看已有稿，不能再生成。</p>
    </div>
  </div>
</template>
