# 类目源目录

fetched_at: 2026-09-18（执行落盘 2026-09-18）

## 已确认、进仓库

| 源 | URL | 许可证 | 用途 | 文件 |
| --- | --- | --- | --- | --- |
| IAB Content Taxonomy 3.1 TSV | https://raw.githubusercontent.com/InteractiveAdvertisingBureau/Taxonomies/main/Content%20Taxonomies/Content%20Taxonomy%203.1.tsv | CC BY 3.0，署名 IAB Tech Lab | 领域树主源 | sources/iab-3.1.tsv |
| IPTC Media Topics 顶级 zh-Hans | https://www.iptc.org/std/NewsCodes/treeview/mediatopic/mediatopic-zh-Hans.html as of 2025-10-10 | CC BY 4.0 | 17 顶级中文 | sources/iptc-mediatopic/top-zh-Hans.md |
| 微信公众号服务类目 | https://developers.weixin.qq.com/doc/subscription/guide/product/subscription_messages/category.html | 官方文档摘录 | risk 叠加，不是选题 | sources/wechat-mp-service-categories.md |
| 掘金分类 | https://api.juejin.cn/tag_api/v1/query_category_briefs | 官方接口 JSON | 技术二级 | sources/juejin-categories.json |
| GB/T 20093-2022 表1 | 官方预览 https://openstd.samr.gov.cn/bzgk/std/showGb?type=online&hcno=88537A39BE1C3D1B5C6294F70838096E&request_locale=zh ；本地 PDF 不进 git 全文 | 国家标准，只摘表 | 对照一级 | sources/gb-t-20093-l1.yaml |

百家号手册只摘领域举例（新闻、娱乐、体育、财经、动漫、游戏）+ 资质提示，无全表。

## 民间/过期，不 vendor

B 站 tid、YouTube gist、小红书第三方 24 品类、THUCNews 14 类、IAB 1.0 中文。

## 后置

YouTube videoCategories（无 key 不编造）；登录各站扫码采集。
