# Perth Handymate 中英双语维护

遵守 E:/Ellis-Services/AGENTS.md。2026-10-16 用户要求全站中英双语，后续修改必须同步两种语言。

- 英文维持原网址；简体中文对应 `/zh/`。所有公开内容页包含对应语言切换入口，英文导航“中文服务”紧跟 Contact Us。
- 英文内容与既有生成器仍为结构来源；公共中文文案维护在 `locales/zh-Hans.json`，非服务正文在 `locales/parts/content.json`，服务正文在 `locales/parts/servicesA.json` 与 `servicesB.json`。标题等定稿条目在 `locales/editorial-overrides.json` 中优先；修改前搜索英文原句确认条目所有者，避免在多文件重复覆盖。动态提示在 `locales/ui.zh-Hans.json`。
- 新增或修改英文文案时同时补充/修改对应中文。只修改中文时同时审阅英文是否需要同义更新；不得将已废弃的英文条目当作当前内容。
- `node scripts/build-local.js` 必须成功；构建会拒绝缺失中文文案，统一生成两套页面、语言切换、canonical、hreflang 和 sitemap。不要直接修改 `dist/` 中的生成页面。
- 中文版必须包含完整正文、案例、图注、SEO 元数据、无障碍标签、表单提示和搜索；不使用浏览器翻译插件作为中文版，不在访客浏览时调用翻译服务。
- 保留原图片及案例布局、各站实际电话 `tel:+61403069685`、现有邮箱/API/Resend 行为。客户自由输入内容不得自动翻译或传给第三方翻译服务。
- 任何本地预览版本须经用户确认才能推送 GitHub 触发生产发布；本次双语任务仅授权本地实现与预览。
- 2026-10-16 页面精简：主页使用 `tools/render-home-clarity.js`；物业页来源为 `data/property-maintenance-page.json`（中英文成对），使用 `tools/compact-property-page.js`；杂工页来源为 `data/handyman-body.inc`，通过 compact-handyman-page 和 handyman-clarity 保持十大服务及展开说明。服务分类 H1 必须与目录卡片名称相同，使用 `tools/service-directory-clarity.js`。旧生成器运行后须应用当前维护器、同步分享元数据，再统一双语构建；不得恢复用户已删除的首页费用和重复段落。
- `locales/parts/revision-*.json` 为本轮定稿翻译，优先于旧 editorial-overrides；更改同一英文句子前检查所有重复键并同步当前优先所有者。
- 2026-10-17 用户确认发布本轮双语与界面精简，并要求删除关于页联系卡片中的 Google Review 链接、去掉指南卡片/文章标题重复地名。对应维护器为 `tools/release-title-polish.js`；指南标题来自 guide-library.js，翻译来自 revision-guide-titles.json。页脚评价入口与地图路线链接保留。此确认仅适用于本轮，后续发布仍需当次授权。
