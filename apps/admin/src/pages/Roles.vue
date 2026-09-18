<template>
  <h2>角色与权限</h2>
  <el-form inline @submit.prevent="create">
    <el-input v-model="name" placeholder="新角色名" style="width: 200px" />
    <el-button type="primary" @click="create">新建角色</el-button>
  </el-form>
  <div v-for="r in roles" :key="r.id" style="margin: 16px 0; padding: 12px; border: 1px solid #e7e7e7">
    <b>{{ r.name }}</b>
    <div style="margin-top: 8px">
      <el-checkbox-group v-model="r.permissions">
        <el-checkbox v-for="p in permissions" :key="p" :label="p" :value="p">{{ p }}</el-checkbox>
      </el-checkbox-group>
    </div>
    <el-button size="small" style="margin-top: 8px" @click="save(r)">保存权限</el-button>
  </div>
  <h3 style="margin-top: 24px">把角色赋给运营账号</h3>
  <el-table :data="admins" style="margin-top: 8px">
    <el-table-column prop="email" label="邮箱" />
    <el-table-column label="角色">
      <template #default="{ row }">{{ row.roles.map((r: { name: string }) => r.name).join("、") || "—" }}</template>
    </el-table-column>
    <el-table-column label="操作" width="220">
      <template #default="{ row }">
        <el-select placeholder="加角色" size="small" @change="(v: string) => assign(row.id, v)">
          <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </template>
    </el-table-column>
  </el-table>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { adminApi } from "../http";

type Role = { id: string; name: string; permissions: string[] };
const roles = ref<Role[]>([]);
const permissions = ref<string[]>([]);
const admins = ref<{ id: string; email: string; roles: { id: string; name: string }[] }[]>([]);
const name = ref("");

async function load() {
  const data = await adminApi<{ roles: Role[]; permissions: string[] }>("/api/admin/roles");
  roles.value = data.roles;
  permissions.value = data.permissions;
  const staff = await adminApi<{ items: typeof admins.value }>("/api/admin/admins");
  admins.value = staff.items;
}
onMounted(load);

async function create() {
  if (!name.value.trim()) return;
  const data = await adminApi<{ roles: Role[]; permissions: string[] }>("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ name: name.value.trim() }),
  });
  roles.value = data.roles;
  name.value = "";
  ElMessage.success("已新建");
}

async function save(r: Role) {
  const data = await adminApi<{ roles: Role[] }>(`/api/admin/roles/${r.id}`, {
    method: "PATCH",
    body: JSON.stringify({ permissions: r.permissions }),
  });
  roles.value = data.roles;
  ElMessage.success("已保存");
}

async function assign(adminId: string, roleId: string) {
  await adminApi(`/api/admin/admins/${adminId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleId }),
  });
  ElMessage.success("已赋角色");
  await load();
}
</script>
