<template>
  <div class="page-shell" :class="{ board: variant === 'board' }">
    <div class="page-head">
      <div>
        <h2>{{ title }}</h2>
        <p class="page-summary">{{ summary }}</p>
      </div>
      <el-button text type="primary" @click="openGuide = !openGuide">
        {{ openGuide ? "收起说明" : "使用说明" }}
      </el-button>
    </div>
    <el-alert v-if="openGuide" type="info" :closable="false" class="page-guide">
      <ul>
        <li v-for="g in guides" :key="g">{{ g }}</li>
      </ul>
    </el-alert>
    <p v-if="note" class="page-note">{{ note }}</p>
    <template v-if="variant === 'board'">
      <slot />
    </template>
    <template v-else>
      <el-card v-if="$slots.query && showSearch" class="query-card" shadow="never">
        <slot name="query" />
      </el-card>
      <div v-if="$slots.toolbar || $slots.query" class="toolbar">
        <slot name="toolbar" />
        <span class="spacer" />
        <el-button v-if="$slots.query" text @click="showSearch = !showSearch">
          {{ showSearch ? "隐藏搜索" : "显示搜索" }}
        </el-button>
      </div>
      <el-card shadow="never">
        <slot />
        <div v-if="total != null" class="pager">
          <span>共 {{ total }} 条</span>
          <el-pagination
            v-if="total > (pageSize ?? 20)"
            background
            layout="prev, pager, next"
            :total="total"
            :page-size="pageSize"
            :current-page="page"
            @current-change="(p: number) => emit('update:page', p)"
          />
        </div>
      </el-card>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";

withDefaults(
  defineProps<{
    title: string;
    summary: string;
    guides: string[];
    note?: string;
    total?: number;
    page?: number;
    pageSize?: number;
    variant?: "list" | "board";
  }>(),
  { variant: "list", page: 1, pageSize: 20 },
);
const emit = defineEmits<{ "update:page": [number] }>();
const openGuide = ref(false);
const showSearch = ref(true);
</script>
<style scoped>
.spacer { flex: 1; }
.toolbar { width: 100%; }
.page-guide { margin-bottom: 12px; }
</style>
