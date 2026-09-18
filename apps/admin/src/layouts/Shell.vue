<template>
  <el-container style="min-height: 100vh">
    <el-aside width="200px" style="border-right: 1px solid #e7e7e7; background: #fff">
      <div style="padding: 16px; font-weight: 600">一意运营</div>
      <el-menu router :default-active="$route.path">
        <el-menu-item index="/">总览</el-menu-item>
        <el-menu-item index="/users">用户</el-menu-item>
        <el-menu-item index="/articles">稿件抽检</el-menu-item>
        <el-menu-item index="/plans">套餐</el-menu-item>
        <el-menu-item index="/orders">订单</el-menu-item>
        <el-menu-item index="/jobs">生成任务</el-menu-item>
        <el-menu-item index="/topics">选题选项</el-menu-item>
        <el-menu-item index="/slots">能力槽</el-menu-item>
        <el-menu-item index="/prompts">提示词</el-menu-item>
        <el-menu-item index="/skills">技能</el-menu-item>
        <el-menu-item index="/styles">写作风格</el-menu-item>
        <el-menu-item index="/mcp">MCP 接入</el-menu-item>
        <el-menu-item index="/roles">角色权限</el-menu-item>
        <el-menu-item index="/audit">操作日志</el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>
