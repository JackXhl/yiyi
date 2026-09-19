<template>
  <div class="auth-split">
    <section class="auth-stage" aria-hidden="true">
      <p class="auth-stage-kicker">成稿预览</p>
      <div class="stage-rack">
        <div class="phone">
          <div class="phone-screen">
            <div class="phone-status">09:41</div>
            <div class="note-cover note-cover-demo" />
            <div class="note-meta">
              <h3>店里那根闪了两周的灯管</h3>
              <p>换完才知道镇流器才是源头。成稿按这个顺序贴进小红书后台。</p>
            </div>
          </div>
        </div>
        <div class="mp-sheet">
          <div class="mp-kicker">公众号预览</div>
          <p class="mp-title">换灯管那天我才搞懂电路</p>
          <p>两条已确认的事实依据写进正文，图按渠道适配的顺序自己上传。一意不代发。</p>
        </div>
      </div>
    </section>
    <section class="auth-panel">
      <slot />
    </section>
  </div>
</template>
