# Article Agent 运行时

编排：**Nest 模块 + 确定性 DAG + 任务表**。没有 Redis 时内存队列。

调模型：**Vercel AI SDK Core**（Chat Completions / 视觉），按能力槽 `text_json` / `text_long` / `vision`。无 Key 时规则仍拦锚点，并出降级稿。

不上 LangGraph / Mastra / Crew / Dify 当产品壳。模型不能改步骤、不能发表。

DAG：素材分析 → 人确认锚点 → 大纲 → 母稿 → 一次删减 → 排版（长文+笔记）→ 适配 → 检查。

内置工具：`analyze_media` `fetch_url` `compose_layout` `copy_pack`。无 publish。
