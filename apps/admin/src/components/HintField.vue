<template>
  <el-form-item>
    <template #label>
      <span>{{ label }}</span>
      <el-tooltip v-if="tip" :content="tip" placement="top">
        <el-icon class="hint-q"><QuestionFilled /></el-icon>
      </el-tooltip>
    </template>
    <slot />
    <div v-if="extra" class="field-extra">{{ extra }}</div>
  </el-form-item>
</template>
<script setup lang="ts">
import { QuestionFilled } from "@element-plus/icons-vue";
defineProps<{ label: string; tip?: string; extra?: string }>();
</script>
