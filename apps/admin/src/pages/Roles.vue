<template>
  <h2>角色与权限</h2>
  <p v-for="r in roles" :key="r.id">
    <b>{{ r.name }}</b> · {{ r.permissions.join("、") }}
  </p>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { adminApi } from "../http";
const roles = ref<{ id: string; name: string; permissions: string[] }[]>([]);
onMounted(async () => {
  roles.value = (await adminApi<{ roles: typeof roles.value }>("/api/admin/roles")).roles;
});
</script>
