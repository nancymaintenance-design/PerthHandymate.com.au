# JSON-LD 与 Feed 维护

2026-10-19，本地候选，未部署。

`npm run build` 先严格检查并编译 TypeScript，再完成原双语生成，最后运行结构化数据增强。维护入口是 `typescript/scripts/enrich-structured-data.ts`。不要手改 dist，也不要将桌面模板目录整体复制到公开网站。

## 页面与实体

保留现有 `#organization`、`#perth-office` 及已有实体标识。新增统一 `#website` 与逐页 `#webpage`，服务页连接 `#service`、指南连接 `#article`、案例连接原 CreativeWork（缺 ID 时补 `#work`）。关于、联系及目录按真实用途使用 AboutPage、ContactPage、CollectionPage；保留既有 FAQ 和面包屑内容。

2026-10-20 FAQ 修复：在双语正文生成完成后，FAQPage 的每个问题必须唯一匹配同页 main 中的 details/summary，acceptedAnswer.text 直接取该可见答案的文本，不再使用独立翻译。保留其余实体字段和原始页面字节；问题缺失或重复匹配时中止构建。中英文全部584条问题由回归测试检查。

公司简介来自关于页现有段落；页面摘要来自本页公开段落；keywords/tags 来自本页 H1/H2，最多六项。它们是主题描述，不是额外的隐形广告文案或权重承诺。没有公开署名及可靠首次发布时间，不虚构作者、发布时间或构建日期。

## Feed

英语 `/feed.json`、`/feed.xml`；中文 `/zh/feed.json`、`/zh/feed.xml`。每种语言包含 126 个可索引内容页，排除 404；按全站服务、公司信息、指南及案例分发，不只覆盖近期文章。

JSON Feed 1.1 使用 summary、content_html、稳定 canonical ID、tags；RSS 2.0 使用 description、content:encoded、guid、category。内容取自公开 main/指南 article，去除表单、导航及可执行/外部嵌入，不包含后台草稿。链接及图片 src 转为绝对网址，去掉依赖网页布局的 srcset。输出是全文内容分发，不制造关键词追加段落。

Feed 不代替现有全量 sitemap。保留 sitemap 内容、lastmod、robots、canonical 和 hreflang；仅在 head 添加实际存在的两个 Feed 发现链接。不生成无真实时间依据的 Atom。

## 验证与边界

- `npm run typecheck`
- `npm run build`
- `node --test tests/structured-feeds.test.js`
- `npm test`（浏览器测试前启动本地 preview，默认测试端口 4282）

专项测试逐页比较构建前后 body 原始字节、语言、实体关系、词条来源、RSS/JSON Feed 标题摘要正文一致性及图片地址。生产 Content-Type 配置保存在 vercel.json，但本轮未部署，不能声称线上端点已可用。

本地语法与一致性检查不是 Google Rich Results Test、Schema.org 在线验证或 Search Console 收录证明。结构化数据不保证排名、富结果、AI 收录或引用。
