# 第一轮 SEO 实施报告

## 证据与目标

本轮以用户提供的 GSC 快照作为证据基线：30 个已编入索引页面、87 个未编入索引页面，其中 76 个为“已发现，当前未编入索引”，4 个为“已抓取，当前未编入索引”；30 天内为 1 次点击、181 次展示、平均排名 51.2。快照没有提供 URL 级 GSC 状态，因此没有把任何单页断言为“GSC 已收录”或“未收录”。

优先意图包括 home maintenance services Perth、shower screen repairs Perth、screen door repairs、resurfacing Perth 与 residential landscaping Perth。已将这些意图分配到现有、具有服务内容和/或真实项目图片证据的 Owner 页面，避免为每个同义词创建竞争页面。

## 已实施

- 建立 15 个核心 Owner URL 的关键词、意图与索引策略映射，见 `priority-owner-map.csv`。
- 为 10 个具备相符实拍案例的核心服务页添加“相关项目证据”区块；链接仅指向已存在的项目页。
- 为 7 个相关项目页补充指向对应 Owner 服务页的内部链接，形成可解释的双向主题关系。
- 将 10 个现有、实拍项目 URL 明确写入索引策略，修复未来运行索引策略脚本时可能从 sitemap 丢失项目 URL 的技术风险。
- 其余服务细页继续保持 `noindex,follow`。本轮不解除、也不新增任何 noindex。
- 生成 URL 清单、Owner 映射与 GSC 复查表，所有 URL 级 GSC 结论均标为未知，等待后续导出或 Search Console 验证。

## 未做与边界

- 未创建城市 × 服务、同义词或模板批量页面。
- 未将未验证的外部价格、资质、时效、免费报价或服务承诺写入内容。
- 未修改 robots.txt 的全站 Allow 规则；未移除 sitemap 中任何原有合理 URL。
- 未上线、未推送 main、未触发部署。

## 验证与后续

本地静态检查、单元测试与 HTTP smoke 测试命令会在交付前执行并在 Git 提交中保留。上线后按 `gsc-recheck.csv` 在 D7、D14、D28 复查索引覆盖、展示、点击、平均排名，以及 Owner 页与项目页是否获得 URL 级状态。

## 本地验证

2026-09-30 已完成以下本地验证：

- `node --test tests/site.test.js`：42 项通过。
- `node tests/check-site.js`：通过；检查 109 个 HTML 页面、109 个唯一 title 和 109 个唯一 meta description。
- `ELLIS_PREVIEW_PORT=4173 node tests/http-smoke.js`：53/53 个 sitemap 页面及品牌 404 页面通过。
- `node tests/canonical-origin.test.js`、`node tests/contact-email.test.js`、`node tests/price-guides.test.js`：全部通过。
- `git diff --check`：通过。
