# 一意

给不会写、没运营过账号的人用的成稿台：主题 + 亲历锚点 + 自己的图/短视频 → 长文插图稿 + 小红书多图笔记 → **复制并打开后台**。人发表。

## 本地

1. PostgreSQL，建库后把连接写进 `.env`（抄 `.env.example`）
2. `pnpm install`
3. `pnpm db:migrate` 然后 `pnpm db:seed`
4. `pnpm dev`
5. C 端 http://localhost:5173 　运营端 http://localhost:5174 　API http://localhost:3000/api

运营默认账号见 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD`。

产品规格在 [docs/product](docs/product/README.md)。类目源在 [docs/taxonomy/SOURCES.md](docs/taxonomy/SOURCES.md)。

未配置微信商户时，账号页开通走本地确认支付（`WECHAT_PAY_MOCK=true`）。无模型 Key 时仍拦锚点，并出降级稿。
