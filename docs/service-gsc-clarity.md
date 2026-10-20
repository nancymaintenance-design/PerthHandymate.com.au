# GSC专项服务页维护（2026-10-20，本地待确认）

本轮只维护 doors-windows-glass-screens 下的 window-repairs、window-installation、door-installation、sliding-door-repairs，以及 shower-screens 的有限内容和分类卡片标签。不得据此扩展到其他站点或发布生产。

- 有限转换器：`typescript/scripts/service-gsc-clarity.ts`；`scripts/service-gsc-clarity.js` 是编译产物，不手改。
- 新的任务分组正文：`data/service-gsc-clarity.json`。木窗与推拉门原有的判断正文、图片、案例、锚点、价格和联系信息继续保留在英文源HTML中；转换器只重组其指定区块，不从旧模板整页覆盖。
- 中文定稿：`locales/parts/revision-service-gsc-20261020.json`；其余未改原文继续使用现有译文。新增英文必须同时维护中文并检查重复键优先级。
- 普通门维修的链接指向既有 door-repairs Owner；衣柜移门和露台推拉门仍分开说明。
- 当前审核未提供新的整窗安装、推拉门或淋浴屏实修案例，不把其他案例重新命名为这些工作的证明。
- 报价数字不变；窗户供应每平方米与安装人工每小时不是整窗安装总价，解释放在工作说明中，价格区块仍由原价格维护器负责。
- 原有 `door-installation-scope`、`shower-screen-repair-options`、木窗与推拉门判断锚点须保留且有实质内容，不用空锚点代替。

维护流程：`npm run compile` → `node scripts/service-gsc-clarity.js` → `npm run build` → `npm test` → 本地预览。旧服务整理器已在适当边界调用该转换器，防止恢复重复FAQ或旧链接。

FAQ正文合并后，原有FAQPage同步为可见问答；未原本使用FAQPage的页面不借此新增结构化数据架构。窗口/推拉门各保留5个集中问答，全站中英文原有FAQPage问答总数由584改为576，精确对应每种语言减少4个重复问答。

本地预览与编辑不授权推送、合并或部署。发布需当次明确授权。
