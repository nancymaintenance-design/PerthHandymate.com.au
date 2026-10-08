const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
const copy = require('./service-depth-copy');
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bySlug = new Map(catalog.canonicalServices.map(item=>[item.slug,item]));
assert.equal(Object.keys(copy).length,67);
const evidence = {
  carpenters:['exterior-timber-window-door-repair','Timber window and door repair example'],
  'window-repairs':['exterior-timber-window-door-repair','Timber window repair example'],
  'fly-screens':['sliding-door-flyscreen-repair','Screen door remeshing example'],
  plasterers:['interior-wall-repair-painting','Wall repair and painting example'],
  'house-painters':['interior-wall-repair-painting','Painting after wall repairs example'],
  'cabinet-makers':['kitchen-cabinet-hinge-repair','Cupboard hinge repair example'],
  handymen:['kitchen-cabinet-hinge-repair','Small cupboard hinge repair example'],
  roofing:['roof-and-gutter-maintenance','Roof and gutter maintenance example'],
  'gutter-services':['roof-and-gutter-maintenance','Roof and gutter maintenance example'],
  'deck-builders':['decking-refinishing-maintenance','Deck surface maintenance examples'],
  'timber-fencing':['timber-fence-repair','Timber fence repair example'],
  'garden-clean-up':['garden-clean-up','Garden clean-up example'],
  tiling:['bathroom-tile-shower-repair','Bathroom tile and shower repair example']
};
const rows=[];
for(const item of catalog.canonicalServices) {
  const data = copy[item.slug]; assert.ok(data, item.slug);
  const [scene1,text1,scene2,text2,factors,related] = data;
  assert.equal(new Set(related).size,2,item.slug+' duplicate related service');
  const file=path.join(root,item.url,'index.html');
  let html=fs.readFileSync(file,'utf8');
  html=html.replace(/<section class="section shell" id="service-work-options">[\s\S]*?<\/section>/,'');
  const before=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const h1=html.match(/<h1>(.*?)<\/h1>/)[1];
  const heading=h1.replace(/ in Perth$/,'').replace(/&amp;/g,'&') + ' — Work & Quote Details';
  const links=related.map(slug=>{
    const target=bySlug.get(slug);assert.ok(target,'unknown related service '+slug);assert.notEqual(slug,item.slug);
    return `<li><a data-preserve-search href="../../../${target.url}">${esc(target.title)} in Perth</a></li>`;
  }).join('');
  const project=evidence[item.slug];
  let projectLink='';
  if(project && !html.includes('projects/'+project[0]+'/')){
    assert.ok(fs.existsSync(path.join(root,'projects',project[0],'index.html')));
    projectLink=`<p><a href="../../../projects/${project[0]}/">${esc(project[1])}</a></p>`;
  }
  const section=`<section class="section shell" id="service-work-options"><h2>${esc(heading)}</h2><article><h3>${esc(scene1)}</h3><p>${esc(text1)}</p></article><article><h3>${esc(scene2)}</h3><p>${esc(text2)}</p></article><h3>What Affects the Quote?</h3><p>${esc(factors)}</p><h3>Related Services for This Job</h3><ul>${links}</ul>${projectLink}<p><a class="text-link" data-preserve-search href="../../../contact/?service=${encodeURIComponent(item.categoryTitle)}&amp;q=${encodeURIComponent(item.title)}">Arrange an assessment with Ellis</a></p></section>`;
  const marker='<section class="section shell service-questions">';assert.ok(html.includes(marker));
  html=html.replace(marker,section+marker);
  fs.writeFileSync(file,html);
  const after=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const words=text=>text.replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').trim().split(/\s+/).length;
  rows.push([item.slug,item.url,scene1,scene2,words(before),words(after),related.join(';'),project?.[0]||'无对应现有案例，不虚构']);
}
const out=path.join(root,'docs/service-depth-review');fs.mkdirSync(out,{recursive:true});
const csv=x=>'"'+String(x).replaceAll('"','""')+'"';
fs.writeFileSync(path.join(out,'67服务逐页深化核查.csv'),'\uFEFF'+['服务,URL,场景一,场景二,修改前正文词数,修改后正文词数,相关服务,关联现有案例',...rows.map(r=>r.map(csv).join(','))].join('\n'));
fs.writeFileSync(path.join(out,'逐页深化说明.md'),'# 67个服务详情页逐页深化\n\n仅本地，等待用户确认后部署。\n\n每个原有详情页补充两个独立的工作场景、处理选项与服务特定报价因素，并连接两个相关服务及带服务上下文的Contact。内容放在问答前，便于客户先了解范围，再查看具体问题。已有问答、任务列表、准备资料和必要安全边界保留。已有真实案例仅在相关项目使用；没有案例的专业服务不虚构案例。\n\n67页共134组场景说明及134个相关服务入口。Word count仅统计正文用于比较，不是SEO得分；没有把关键词密度或固定篇幅当排名指标。未新建URL，未更改标题、canonical、页脚、价格金额或表单API。\n\n文案编辑检查：使用直接的Ellis服务表达；每段说明一个客户问题；避免同一通用段落批量复制；不新增注册、资助、结果保证或施工时限承诺。\n\n本地核查CSV记录每页的场景与链接落位。静态检查不能证明Google已收录或实际询盘增长，需部署后通过GSC和真实转化数据复核。\n');
console.log(JSON.stringify({deepenedPages:rows.length,scenarioSections:rows.length*2,relatedLinks:rows.length*2,report:out}));
