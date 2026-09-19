# 信息架构与 RBAC

## C 端（三个入口）

作品 · 创作 · 账户。无模型 / 技能 / 队列菜单。

## 控制台

工作台（数据概览）、业务运营（用户管理、内容审核）、订阅商业（套餐管理、订单管理）、内容引擎（生成任务、内容类目、模型配置、提示词模板、写作技能、风格预设、开放接口）、系统管理（角色权限、操作日志）。菜单由权限码显隐。对外用词见 [09-copy.md](09-copy.md)。

## 权限码

`overview:view` `user:list` `user:disable` `user:reset` `user:plan` `article:inspect` `plan:edit` `order:list` `order:refund` `job:retry` `platform:edit` `topic:edit` `slot:edit` `prompt:edit` `skill:import` `skill:edit` `style:edit` `mcp:edit` `site:edit` `role:edit` `audit:view` `admin:edit`

C 端会话与运营会话隔离（不同 JWT `aud`）。
