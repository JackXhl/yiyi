<template>
  <div>
    <h2 style="margin: 0 0 16px; font-size: 20px">稿件</h2>
    <div class="empty" v-if="loaded && !items.length">
      <p>还没有稿</p>
      <t-button theme="primary" @click="create">写第一篇</t-button>
    </div>
    <div v-else>
      <div class="draft-row" v-for="a in items" :key="a.id" @click="$router.push(`/write/${a.id}`)">
        <img v-if="a.cover" :src="a.cover" alt="" />
        <span v-else class="ph" />
        <div>
          <div>{{ a.title }}</div>
          <div class="hint">{{ format(a.updatedAt) }}</div>
        </div>
        <span class="status">{{ a.status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { api } from "../api";

type Item = { id: string; title: string; status: string; cover: string | null; updatedAt: string };
const items = ref<Item[]>([]);
const loaded = ref(false);
const router = useRouter();

onMounted(async () => {
  const data = await api<{ items: Item[] }>("/api/articles");
  items.value = data.items;
  loaded.value = true;
});

async function create() {
  const a = await api<{ id: string }>("/api/articles", { method: "POST", body: "{}" });
  router.push(`/write/${a.id}`);
}

function format(s: string) {
  return new Date(s).toLocaleString("zh-CN", { hour12: false });
}
</script>
