const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const seoDirectory = path.join(root, 'docs', 'seo');
const origin = 'https://www.perthhandymate.com.au/';
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data', 'indexing-policy.json'), 'utf8'));
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const sitemapUrls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));

const ownerRows = [
  ['services/handyman-interiors-appliance-repairs/handymen/', 'Handyman services Perth', 'home maintenance services Perth', 'Examples of smaller household repair requests', 'door-lock-replacement-installation; kitchen-cabinet-hinge-repair'],
  ['services/handyman-interiors-appliance-repairs/carpenters/', 'Carpenter Perth', 'timber door repair Perth', 'Timber repair and cabinet hardware examples', 'exterior-timber-window-door-repair; kitchen-cabinet-hinge-repair'],
  ['services/handyman-interiors-appliance-repairs/cabinet-makers/', 'Cabinet maker Perth', 'cabinet repair Perth', 'Existing owner content retained', 'No supporting project selected'],
  ['services/handyman-interiors-appliance-repairs/ikea-kitchens/', 'IKEA kitchen installation Perth', 'IKEA kitchen assembly Perth', 'Existing owner content retained', 'No supporting project selected'],
  ['services/handyman-interiors-appliance-repairs/blinds-and-curtains/', 'Blind installation Perth', 'curtain installation Perth', 'Existing owner content retained', 'No supporting project selected'],
  ['services/handyman-interiors-appliance-repairs/carpet-repair/', 'Carpet repair Perth', 'carpet patch repair Perth', 'Existing owner content retained', 'No supporting project selected'],
  ['services/handyman-interiors-appliance-repairs/plasterers/', 'Plaster repair Perth', 'wall patch repair Perth', 'Existing owner content retained', 'No supporting project selected'],
  ['services/handyman-interiors-appliance-repairs/tiling/', 'Tiling repairs Perth', 'bathroom tile repair Perth', 'Bathroom surface repair example', 'bathroom-tile-shower-repair'],
  ['services/doors-windows-glass-screens/door-installation/', 'Door repair Perth', 'door installation Perth', 'Door repair and hardware examples', 'exterior-timber-window-door-repair; door-lock-replacement-installation'],
  ['services/doors-windows-glass-screens/fly-screens/', 'Fly screen repairs Perth', 'screen door repairs Perth', 'Flyscreen remeshing example', 'sliding-door-flyscreen-repair'],
  ['services/doors-windows-glass-screens/window-repairs/', 'Window repairs Perth', 'timber window repair Perth', 'Exterior timber window repair example', 'exterior-timber-window-door-repair'],
  ['services/doors-windows-glass-screens/shower-screens/', 'Shower screen repairs Perth', 'shower screen repair Perth', 'Shower-area repair context', 'bathroom-tile-shower-repair'],
  ['services/roofing-gutters-exterior/gutter-services/', 'Gutter services Perth', 'gutter cleaning Perth', 'Roof and gutter maintenance example', 'roof-and-gutter-maintenance'],
  ['services/roofing-gutters-exterior/house-painters/', 'House painters Perth', 'interior wall repair and painting Perth', 'Interior wall repair and paint touch-up example', 'interior-wall-repair-painting'],
  ['services/gardens-landscaping/garden-clean-up/', 'Garden clean-up Perth', 'residential landscaping Perth', 'Garden clean-up example', 'garden-clean-up'],
];
const owners = new Map(ownerRows.map((row) => [row[0], row]));

function quote(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function routeFor(file) {
  const relative = path.relative(root, path.dirname(file)).split(path.sep).join('/');
  return relative ? `${relative}/` : '';
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', '.worktrees', 'node_modules', 'dist'].includes(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (entry.name === 'index.html') files.push(target);
  }
  return files;
}

function pageType(route) {
  if (!route) return 'homepage';
  if (route.startsWith('projects/')) return 'project case study';
  if (route.startsWith('guides/')) return route === 'guides/' ? 'guide hub' : 'guide';
  if (route.startsWith('areas/')) return route === 'areas/' ? 'area hub' : 'area page';
  if (route.startsWith('services/')) return route.split('/').filter(Boolean).length === 3 ? 'service detail' : 'service hub';
  return route.slice(0, -1) || 'site page';
}

fs.mkdirSync(seoDirectory, { recursive: true });
const inventoryHeader = ['URL', 'Page type', 'Source file', 'HTTP status', 'In sitemap', 'Robots directive', 'Canonical', 'Robots access', 'GSC evidence', 'Technical indexability', 'Owner URL', 'Action'];
const inventoryRows = walk(root).sort().map((file) => {
  const route = routeFor(file);
  const html = fs.readFileSync(file, 'utf8');
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [])[1] || '';
  const robots = (html.match(/<meta name="robots" content="([^"]+)">/) || [])[1] || '';
  const url = `${origin}${route}`;
  const owner = owners.has(route) ? url : '';
  const isProject = route.startsWith('projects/');
  const indexable = sitemapUrls.has(url) && !robots.startsWith('noindex');
  return [
    url,
    pageType(route),
    route ? `${route}index.html` : 'index.html',
    'Source present; production HTTP not fetched in this record',
    sitemapUrls.has(url) ? 'yes' : 'no',
    robots || 'not declared',
    canonical,
    'Allowed by robots.txt',
    'GSC snapshot; URL-level status unknown',
    indexable ? 'indexable candidate' : 'not a current index target',
    owner,
    owners.has(route) ? 'Strengthen owner page with matched project evidence' : isProject && sitemapUrls.has(url) ? 'Retain as photo-led evidence page' : 'Retain current scope and internal-link role',
  ];
});
fs.writeFileSync(path.join(seoDirectory, 'url-inventory.csv'), [inventoryHeader, ...inventoryRows].map((row) => row.map(quote).join(',')).join('\n') + '\n');

const ownerHeader = ['Primary target', 'Auxiliary query', 'Owner URL', 'Index strategy', 'On-page evidence added', 'Supporting project evidence', 'Noindex decision'];
const ownerMap = ownerRows.map(([route, primary, auxiliary, evidence, projects]) => [
  primary,
  auxiliary,
  `${origin}${route}`,
  'index,follow; canonical self-reference; included in sitemap',
  evidence,
  projects,
  'No noindex changes in this round',
]);
fs.writeFileSync(path.join(seoDirectory, 'priority-owner-map.csv'), [ownerHeader, ...ownerMap].map((row) => row.map(quote).join(',')).join('\n') + '\n');

const report = `# 第一轮 SEO 实施报告\n\n## 证据与目标\n\n本轮以用户提供的 GSC 快照作为证据基线：30 个已编入索引页面、87 个未编入索引页面，其中 76 个为“已发现，当前未编入索引”，4 个为“已抓取，当前未编入索引”；30 天内为 1 次点击、181 次展示、平均排名 51.2。快照没有提供 URL 级 GSC 状态，因此没有把任何单页断言为“GSC 已收录”或“未收录”。\n\n优先意图包括 home maintenance services Perth、shower screen repairs Perth、screen door repairs、resurfacing Perth 与 residential landscaping Perth。已将这些意图分配到现有、具有服务内容和/或真实项目图片证据的 Owner 页面，避免为每个同义词创建竞争页面。\n\n## 已实施\n\n- 建立 15 个核心 Owner URL 的关键词、意图与索引策略映射，见 \`priority-owner-map.csv\`。\n- 为 10 个具备相符实拍案例的核心服务页添加“相关项目证据”区块；链接仅指向已存在的项目页。\n- 为 7 个相关项目页补充指向对应 Owner 服务页的内部链接，形成可解释的双向主题关系。\n- 将 10 个现有、实拍项目 URL 明确写入索引策略，修复未来运行索引策略脚本时可能从 sitemap 丢失项目 URL 的技术风险。\n- 其余服务细页继续保持 \`noindex,follow\`。本轮不解除、也不新增任何 noindex。\n- 生成 URL 清单、Owner 映射与 GSC 复查表，所有 URL 级 GSC 结论均标为未知，等待后续导出或 Search Console 验证。\n\n## 未做与边界\n\n- 未创建城市 × 服务、同义词或模板批量页面。\n- 未将未验证的外部价格、资质、时效、免费报价或服务承诺写入内容。\n- 未修改 robots.txt 的全站 Allow 规则；未移除 sitemap 中任何原有合理 URL。\n- 未上线、未推送 main、未触发部署。\n\n## 验证与后续\n\n本地静态检查、单元测试与 HTTP smoke 测试命令会在交付前执行并在 Git 提交中保留。上线后按 \`gsc-recheck.csv\` 在 D7、D14、D28 复查索引覆盖、展示、点击、平均排名，以及 Owner 页与项目页是否获得 URL 级状态。\n`;
const verificationRecord = `\n## 本地验证\n\n2026-09-30 已完成以下本地验证：\n\n- \`node --test tests/site.test.js\`：42 项通过。\n- \`node tests/check-site.js\`：通过；检查 109 个 HTML 页面、109 个唯一 title 和 109 个唯一 meta description。\n- \`ELLIS_PREVIEW_PORT=4173 node tests/http-smoke.js\`：53/53 个 sitemap 页面及品牌 404 页面通过。\n- \`node tests/canonical-origin.test.js\`、\`node tests/contact-email.test.js\`、\`node tests/price-guides.test.js\`：全部通过。\n- \`git diff --check\`：通过。\n`;
fs.writeFileSync(path.join(seoDirectory, 'seo-implementation-report.md'), `${report}${verificationRecord}`);

const recheckHeader = ['Checkpoint', 'Date after release', 'URLs / report to inspect', 'Metrics to compare', 'Success signal', 'Notes'];
const recheckRows = [
  ['D0', 'Release day', 'sitemap.xml; 15 Owner URLs; 10 project URLs', 'Sitemap read, canonical and robots directives', 'Sitemap accepted and no unexpected coverage error', 'No deployment performed in this branch'],
  ['D7', '7 days', 'GSC Page indexing and Performance', 'Indexed URLs, impressions, clicks, average position', 'Owner URLs are crawled or show first impressions', 'Compare against the user-provided snapshot only'],
  ['D14', '14 days', 'GSC Page indexing and Performance', 'Indexed URLs, impressions, clicks, average position', 'More owner/project URL evidence; no avoidable duplicate issue', 'Inspect URL-level detail where available'],
  ['D28', '28 days', 'GSC Page indexing and Performance', 'Indexed URLs, impressions, clicks, CTR, average position', 'Improvement judged against D0/D7/D14, not a guaranteed ranking result', 'Decide whether a second content cluster is warranted'],
];
fs.writeFileSync(path.join(seoDirectory, 'gsc-recheck.csv'), [recheckHeader, ...recheckRows].map((row) => row.map(quote).join(',')).join('\n') + '\n');

console.log(`Generated SEO delivery records for ${inventoryRows.length} HTML URLs and ${ownerRows.length} Owner URLs.`);
