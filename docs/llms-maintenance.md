# llms.txt 维护

本站：Ellis Services Group 珀斯办事处；正式域名 https://www.perthhandymate.com.au。仅维护 Perth Handymate，不复用其他 Ellis 网站或 Mel One 的公司、城市与服务资料。

## 唯一内容源

根目录 `llms.txt` 是人工精选的双语 Markdown 索引；构建原样复制到 `dist/llms.txt`。不要直接编辑 dist，不增加另一套站点资料库，不在请求期间调用模型或抓取网站。

页面正文仍是事实来源。文件不是 Google 排名、收录、AI 引用或推荐开关，也不能替代导航、sitemap、robots 或访问权限。默认不增加 llms-full.txt 或批量 Markdown 页面副本。

## 更新规则

1. 服务、案例或指南实质变更时，核对目标页实际正文，再更新对应摘要；不根据路径猜测内容。中英文链接和摘要同时审核。
2. 使用现有正式 Owner 绝对 URL；避免参数、锚点、中间跳转、重复同义服务页。确认目标有实质公开内容且适合本索引。
3. 不加入后台、草稿、预览、API、客户资料、404、noindex 页面。不得编造价格、资质、营业时间、案例结果或评论。
4. 如页面删除或变成跳转，先人工选择已有最终页面，再同步两个语言版本；不能为了索引新建空页。
5. 保持一个 H1、简短引言、H2 分组及 `- [页面名称](正式绝对URL): 正文支持的摘要`。保持精选，不机械导入全部 sitemap。

## 检查

- `npm run build`：严格 TypeScript 检查、双语构建及原样发布文件。
- `node --test --test-concurrency=1 tests/preview-server.test.js tests/local-build.test.js`：真实 GET、UTF-8 类型、两种语言偏好、公开路径、中英配对、canonical 与正文检查。
- `npm test`：全套网站及本地后台回归；浏览器测试需按项目说明提供运行中的本地预览。
- 发布前逐个 GET 文件内正式链接，核对最终 URL、状态、正文、语言、canonical、hreflang、noindex、robots 与 sitemap。失败应区分网络环境和网站问题。
- 发布仅在当次获得授权后走 GitHub → Vercel。推送前先核对分支和自动部署影响；部署后 GET 正式 `/llms.txt` 并比较实际字节及响应类型。仅 HEAD 200 不足以验收。

2026-10-20 本轮证据与逐链接结果：同级项目 reports/llms-2026-10-20。维护本文件和索引不授权改动页面、训练爬虫政策、robots、WAF、canonical 或 URL 体系。
