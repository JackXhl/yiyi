<template>
  <span class="col-title">
    {{ label }}
    <el-tooltip v-if="tip" :content="tip" placement="top">
      <el-icon class="hint-q"><QuestionFilled /></el-icon>
    </el-tooltip>
  </span>
</template>
<script setup lang="ts">
import { QuestionFilled } from "@element-plus/icons-vue";
defineProps<{ label: string; tip?: string }>();
</script>
<style scoped>
.col-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}
</style>
