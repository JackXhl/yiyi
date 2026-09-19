<template>
  <div>
    <h1 class="page-title">作品</h1>
    <div class="chips" style="margin-top: 0">
      <button
        v-for="f in filters"
        :key="f.id"
        type="button"
        class="chip"
        :class="{ on: filter === f.id }"
        :aria-pressed="filter === f.id"
        @click="filter = f.id"
      >{{ f.label }}</button>
    </div>
    <div class="draft-grid" v-if="!loaded" aria-busy="true">
      <div class="draft-card skeleton" v-for="n in 4" :key="n" aria-hidden="true">
        <span class="ph" />
        <div class="info">
          <div class="skel-line" />
          <div class="skel-line short" />
        </div>
      </div>
    </div>
    <div class="empty" v-else-if="!items.length">
      <p>暂无作品</p>
      <t-button theme="primary" @click="create">新建作品</t-button>
    </div>
    <div class="empty" v-else-if="!visible.length">
      <p>暂无作品</p>
    </div>
    <div class="draft-grid" v-else>
      <button class="draft-card" v-for="a in visible" :key="a.id" type="button" @click="$router.push(`/write/${a.id}`)">
        <img v-if="a.cover" class="cover" :src="a.cover" alt="" />
        <span v-else class="ph cover-empty" />
        <div class="info">
          <div class="ttl">{{ a.title || "未命名作品" }}</div>
          <div class="meta">
            <span>{{ statusLabel(a.status) }}</span>
            <span>{{ format(a.updatedAt) }}</span>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ARTICLE_STATUS_LABEL, InFlight, type ArticleStatus } from "@yiyi/shared";
import { api } from "../api";

type Item = { id: string; title: string; status: string; cover: string | null; updatedAt: string };
type Filter = "all" | "draft" | "ready";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "draft", label: "草稿" },
  { id: "ready", label: "已成稿" },
];
const items = ref<Item[]>([]);
const loaded = ref(false);
const filter = ref<Filter>("all");
const router = useRouter();
const flight = new InFlight();

const visible = computed(() => {
  if (filter.value === "all") return items.value;
  const want = filter.value === "draft" ? "草稿" : "已成稿";
  return items.value.filter((a) => statusLabel(a.status) === want);
});

onMounted(async () => {
  const data = await api<{ items: Item[] }>("/api/articles");
  items.value = data.items;
  loaded.value = true;
});

async function create() {
  if (!flight.enter("create")) return;
  try {
    const a = await api<{ id: string }>("/api/articles", { method: "POST", body: "{}" });
    router.push(`/write/${a.id}`);
  } finally {
    flight.leave("create");
  }
}

function format(s: string) {
  return new Date(s).toLocaleString("zh-CN", { hour12: false, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function statusLabel(s: string) {
  return ARTICLE_STATUS_LABEL[s as ArticleStatus] || s;
}
</script>
