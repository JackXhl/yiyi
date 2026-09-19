<template>
  <div class="stage-rack">
    <div v-if="note" class="phone">
      <div class="phone-screen">
        <div class="phone-status">{{ clock }}</div>
        <img v-if="cover" class="note-cover" :src="cover" alt="" />
        <div v-else class="note-cover note-cover-demo" />
        <div class="note-meta">
          <h3>{{ title || "未命名作品" }}</h3>
          <div v-if="tags.length" class="note-tags">
            <span v-for="t in tags" :key="t">{{ t }}</span>
          </div>
          <div v-if="safeNote" class="note-body" v-html="safeNote" />
          <p v-else-if="emptyHint" class="note-body">{{ emptyHint }}</p>
        </div>
      </div>
    </div>
    <div v-if="mp" class="mp-sheet">
      <div class="mp-kicker">公众号预览</div>
      <p v-if="title" class="mp-title">{{ title }}</p>
      <div v-if="safeLong" class="mp-body" v-html="safeLong" />
      <p v-else class="mp-body">{{ emptyHint || "生成成稿后在这里看长文。" }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { sanitizeArticleHtml } from "@yiyi/shared";

const props = withDefaults(
  defineProps<{
    title?: string;
    cover?: string | null;
    tags?: string[];
    noteHtml?: string;
    longHtml?: string;
    note?: boolean;
    mp?: boolean;
    emptyHint?: string;
  }>(),
  { tags: () => [], note: true, mp: false },
);

const clock = computed(() =>
  new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }),
);
const safeNote = computed(() => sanitizeArticleHtml(props.noteHtml || ""));
const safeLong = computed(() => sanitizeArticleHtml(props.longHtml || ""));
</script>
