<template>
  <span>
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
