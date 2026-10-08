const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = 'C:/Users/UFTR/Desktop/Entry/4、perthhandymate/Perth_Handyman_AI_Keyword_Map.md';
const map = fs.readFileSync(source, 'utf8');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const url = slug => catalog.canonicalServices.find(item => item.slug === slug).url;
const handy = url('handymen');
const owners = [
  ['index.html', '首页核心服务；小活详细内容在handymen页'], [handy, '维护清单、评估与书面报价'],
  [handy, '门铰链、门框饰条、擦地调整；新门另有安装页'], [handy, '用户已确认：滑门滚轮、轨道与重玻璃门维修；按现场材料和安全要求评估'],
  [url('fly-screens'), '纱网、更换网布、框与普通屏门'], [url('window-repairs'), '木窗框、五金、卡顿和水损'],
  [handy, '橱柜门铰链、抽屉滑轨；新柜另归cabinet-makers'], [url('plasterers'), 'Gyprock、墙洞、天花、cornice与水损边界'],
  [url('carpenters'), '踢脚线、architrave、腐木与结构边界'], [url('house-painters'), '补漆、小面积、门和饰条；登记资料仍需核验'],
  [handy, 'Flat-pack家具组装；IKEA厨房独立原有页面'], [handy, 'TV支架、画、镜、浮动搁板与固定面'],
  [url('blinds-and-curtains'), '窗帘杆、非电动百叶与支架'], [handy, '用户已确认：晾衣架安装、维修、换绳'],
  [handy, '用户已确认：信箱、hose reel等户外配件'], [handy, '用户已确认：宠物门安装；玻璃及安全门采用合适产品和安装要求'],
  [handy, '毛巾杆、厕纸架和普通浴室配件'], [url('tiling'), '局部砖、grout；与防水层维修分开'],
  [handy, '用户已确认：laminate/vinyl局部维修；裂砖另归tiling页'], [url('timber-fencing'), '木围栏、门铰链、latch、倾斜支撑'],
  [url('deck-builders'), '板更换、维护与结构评估；保留既有案例'], [handy, '用户已确认：檐口、露台与pergola局部维修；结构/石棉边界保留'],
  [url('gutter-services'), '单层房、溢水、漏水、清理与支撑'], [handy, '用户已确认：patio/paving压力清洗；庭院整理另有页面'],
  [handy, '出租、房东、vacate；管理授权与进场'], [handy, '售前修缮，不承诺成交/售价'],
  [handy, 'strata、office、shop；公共区域审批与营业时段'], [handy, '用户已确认：老人维修与扶手安装；NDIS可咨询，不等于注册或报销资格'],
  ['contact/index.html', '计价方式、材料、最低/出勤费需书面确认；不虚构金额'], [url('electricians'), '专业电工与水管/gas独立原有服务页，不归普通handyman'],
  [url('waterproofing'), '漏水与防水层/基层区别；完整浴室另有页面']
];
const mainText = rel => {
  const file = path.join(root, rel.endsWith('.html') ? rel : rel + 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  return (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '')
    .replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ').toLowerCase();
};
let owner, type; const terms = [];
const lines = map.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const heading = lines[i].match(/^### (O\d+) /); if (heading) owner = heading[1];
  const kind = lines[i].match(/^#### (.+)/); if (kind) type = kind[1];
  const term = lines[i].match(/^- `([^`]+)`/), id = lines[i+1]?.match(/ID: (HM\d+)/);
  if (term && id && owner) {
    const [page, note] = owners[Number(owner.slice(1))-1];
    const exact = mainText(page).includes(term[1].toLowerCase());
    terms.push({ id:id[1], owner, type, term:term[1], page, exact, note });
  }
}
assert.equal(terms.length, 527); assert.equal(new Set(terms.map(x => x.id)).size, 527);
const out = path.join(root, 'docs/keyword-map-round3'); fs.mkdirSync(out, {recursive:true});
const csv = value => '"' + String(value).replaceAll('"', '""') + '"';
fs.writeFileSync(path.join(out,'527词条逐项核查.csv'), '\uFEFF' + ['ID,Owner,类型,词条,现有主页面,正文完全字面匹配,内容或待确认说明', ...terms.map(x => [x.id,x.owner,x.type,x.term,x.page,x.exact?'是':'否（不等于语义未覆盖）',x.note].map(csv).join(','))].join('\n'));
const report = `# 第三批词条目录核查（仅本地）\n\n以用户文件的527条主词和31个Owner为基础，不新建批量服务/地区页。服务细节页全部67个已有页面均有Perth标题，62页重新编写具体问答，另5个核心页保留已审核问答并增加场景段落。目录75张卡片合并为67个唯一入口，75个原有搜索别名保留。\n\n逐项CSV记录字面匹配，而不是SEO得分或语义覆盖保证。${terms.filter(x=>x.exact).length}条在分配主页面正文完全字面匹配；未字面匹配不意味着缺失，含自然英文变化、中文研究词和条件服务。不要为提高这个数堆叠527个原词。\n\n## 31类主题落位与未完成门禁\n\n| Owner | 本地现有主页面 | 核查结果/边界 |\n| --- | --- | --- |\n${owners.map(([page,note],i)=>`| O${String(i+1).padStart(2,'0')} | /${page} | ${note} |`).join('\n')}\n\n## 仍需业务资料\n\n重玻璃滑门、晾衣架、信箱/卷盘、宠物门、laminate/vinyl地板局部维修、压力清洗、扶手及NDIS、eaves具体承接范围尚未确认，不新增承诺。收费金额/最低收费/出勤费、登记及资质展示需真实资料，不复制同行事实。\n\n## 已保护与验证边界\n\n没有修改规范URL、footer、收件API、实际邮箱、24小时/最快30分钟已有附条件说明。没有上线、没有真实测试邮件。本地源文件检查不等于Google已收录，也不等于获取流量；部署后再核验GSC。\n`;
const confirmedReport = report.replace('重玻璃滑门、晾衣架、信箱/卷盘、宠物门、laminate/vinyl地板局部维修、压力清洗、扶手及NDIS、eaves具体承接范围尚未确认，不新增承诺。', '2026-10-08用户已明确确认上述项目包含在handyman服务中。已补充8组服务说明及对应问答、6个相关服务链接和分类页入口。保留玻璃、安全门、结构、防水及石棉等工作的评估边界。NDIS仅作为咨询场景，不能把服务能力确认当成NDIS注册或资助报销资格确认。');
fs.writeFileSync(path.join(out,'第三批优化与词条覆盖说明.md'),confirmedReport);
console.log(JSON.stringify({terms:terms.length,owners:owners.length,exactMainPageMatches:terms.filter(x=>x.exact).length,reportDirectory:out}));
