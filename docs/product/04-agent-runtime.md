# Article Agent 运行时

编排：**Nest 模块 + 确定性 DAG + 任务表**。没有 Redis 时内存队列。节点是否 AI 自动 / 需人确认，读 `DagNodeConfig`（默认 seed 见 `@yiyi/shared` 的 `DAG_NODE_CONFIG_SEED`）。

调模型：**Vercel AI SDK Core**（Chat Completions / 视觉），按能力槽 `text_json` / `text_long` / `vision`。无 Key 时规则仍拦锚点，并出降级稿。

不上 LangGraph / Mastra / Crew / Dify 当产品壳。模型不能改步骤、不能发表。复制不能配成 `ai_auto` 发表。

人填：选题、素材（上传时 vision 分析）。点「生成成稿」过硬门 1。

AI 作业（默认 `ai_auto`，闭锁）：大纲 → 母稿（一次删减 + 长文排版）→ 适配 → 检查。每步做上下文关联与内容检查，不因清单重写。

复制：`human_approve` 表示人自己粘贴，不是勾选。

内置工具：`analyze_media` `fetch_url` `compose_layout` `copy_pack`。无 publish。
