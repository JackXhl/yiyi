# 信息架构与 RBAC

## C 端（三个入口）

稿件 · 写一篇 · 账号。无模型 / 技能 / 队列菜单。

## 运营端

工作台、用户、商业、写作产线、智能配置、运营、系统。菜单由权限码显隐。

## 权限码

`overview:view` `user:list` `user:disable` `user:reset` `user:plan` `article:inspect` `plan:edit` `order:list` `order:refund` `job:retry` `platform:edit` `topic:edit` `slot:edit` `prompt:edit` `skill:import` `skill:edit` `style:edit` `mcp:edit` `site:edit` `role:edit` `audit:view` `admin:edit`

C 端会话与运营会话隔离（不同 JWT `aud`）。
