<template>
  <PageShell
    title="角色权限"
    summary="配置运营角色能进入哪些页面，并把角色赋给控制台账号。"
    :guides="[
      '权限名称是给人看的。勾选后，对应菜单和操作才可用。',
      '先建角色、勾权限，再给运营账号分配角色。',
      '不要把所有权限随手赋给测试号。',
    ]"
    :total="roles.length"
    note="当前为全量列表。"
  >
    <template #toolbar>
      <el-button type="primary" @click="createOpen = true">新增角色</el-button>
    </template>
    <el-empty v-if="!roles.length" description="还没有角色。" />
    <el-table v-else :data="roles" style="margin-bottom: 24px">
      <el-table-column min-width="160">
        <template #header><ColTitle label="角色名称" /></template>
        <template #default="{ row }">{{ row.name }}</template>
      </el-table-column>
      <el-table-column min-width="280">
        <template #header><ColTitle label="已授权限" tip="中文名称，不是内部码" /></template>
        <template #default="{ row }">{{ permNames(row.permissions) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" @click="openPerm(row)">修改权限</el-button>
        </template>
      </el-table-column>
    </el-table>
    <h3 style="margin: 0 0 8px; font-size: 15px">运营账号</h3>
    <p class="field-extra">给控制台登录账号分配角色。一个账号可有多个角色。</p>
    <el-table :data="admins">
      <el-table-column prop="email" min-width="200">
        <template #header><ColTitle label="运营邮箱" /></template>
      </el-table-column>
      <el-table-column min-width="200">
        <template #header><ColTitle label="已有角色" /></template>
        <template #default="{ row }">{{ row.roles.map((r: { name: string }) => r.name).join("、") || "尚未分配" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-select placeholder="选择要添加的角色" size="small" @change="(v: string) => assign(row.id, v)">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>

  <el-dialog v-model="createOpen" title="新增角色" width="480px">
    <el-form label-position="top">
      <HintField label="角色名称" extra="例如「内容运营」「只读审计」。">
        <el-input v-model="newName" placeholder="请输入角色名称" />
      </HintField>
    </el-form>
    <template #footer>
      <el-button @click="createOpen = false">取 消</el-button>
      <el-button type="primary" @click="create">确 定</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="permOpen" title="修改权限" width="640px">
    <p class="field-extra">勾选该角色可以使用的能力。每项右侧是影响说明。</p>
    <el-checkbox-group v-model="editing.permissions">
      <div v-for="p in permissions" :key="p" style="margin: 8px 0">
        <el-checkbox :value="p">
          {{ PERMISSION_LABEL[p]?.name || p }}
          <span class="field-extra" style="display: inline; margin-left: 8px">{{ PERMISSION_LABEL[p]?.hint }}</span>
        </el-checkbox>
      </div>
    </el-checkbox-group>
    <template #footer>
      <el-button @click="permOpen = false">取 消</el-button>
      <el-button type="primary" @click="savePerm">确 定</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { PERMISSION_LABEL, type PermissionCode } from "@yiyi/shared";
import { adminApi } from "../http";
import PageShell from "../components/PageShell.vue";
import HintField from "../components/HintField.vue";
import ColTitle from "../components/ColTitle.vue";

type Role = { id: string; name: string; permissions: PermissionCode[] };
const roles = ref<Role[]>([]);
const permissions = ref<PermissionCode[]>([]);
const admins = ref<{ id: string; email: string; roles: { id: string; name: string }[] }[]>([]);
const createOpen = ref(false);
const permOpen = ref(false);
const newName = ref("");
const editing = reactive<{ id: string; permissions: PermissionCode[] }>({ id: "", permissions: [] });

async function load() {
  const data = await adminApi<{ roles: Role[]; permissions: PermissionCode[] }>("/api/admin/roles");
  roles.value = data.roles;
  permissions.value = data.permissions;
  admins.value = (await adminApi<{ items: typeof admins.value }>("/api/admin/admins")).items;
}
onMounted(load);

function permNames(codes: string[]) {
  return codes.map((c) => PERMISSION_LABEL[c as PermissionCode]?.name || c).join("、") || "尚未授权";
}
async function create() {
  if (!newName.value.trim()) return;
  await adminApi("/api/admin/roles", { method: "POST", body: JSON.stringify({ name: newName.value.trim() }) });
  createOpen.value = false;
  newName.value = "";
  ElMessage.success("已新建角色");
  await load();
}
function openPerm(row: Role) {
  editing.id = row.id;
  editing.permissions = [...row.permissions];
  permOpen.value = true;
}
async function savePerm() {
  await adminApi(`/api/admin/roles/${editing.id}`, {
    method: "PATCH",
    body: JSON.stringify({ permissions: editing.permissions }),
  });
  permOpen.value = false;
  ElMessage.success("权限已保存");
  await load();
}
async function assign(adminId: string, roleId: string) {
  await adminApi(`/api/admin/admins/${adminId}/roles`, {
    method: "POST",
    body: JSON.stringify({ roleId }),
  });
  ElMessage.success("已分配角色");
  await load();
}
</script>
