const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const content=JSON.parse(fs.readFileSync(path.join(root,'data/keyword-content-round.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const landing=cluster=>cluster.slug==='home'?'index.html':cluster.slug==='contact'?'contact/index.html':catalog.canonicalServices.find(service=>service.slug===cluster.slug)?.url+'index.html';
const renderedGuides=()=>fs.readdirSync(path.join(root,'guides')).filter(slug=>fs.existsSync(path.join(root,'guides',slug,'index.html'))).map(slug=>({page:`guides/${slug}/index.html`,html:fs.readFileSync(path.join(root,'guides',slug,'index.html'),'utf8')}));
const guideSlugs=['cupboard-hinges-drawer-runners-repair-guide','sticking-doors-windows-repair-guide','wall-patching-paint-touch-ups-guide','shower-silicone-grout-waterproofing-guide'];
test('handyman landing keeps one concise FAQ and detailed scenarios live in relevant guides',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 assert.equal([...h.matchAll(/<details\b/g)].length,6,'booking FAQ must not grow into a topic dump');
 assert.ok(!h.includes('id="keyword-repair-questions"'));
 const door=fs.readFileSync(path.join(root,'guides/sticking-doors-windows-repair-guide/index.html'),'utf8');
 assert.ok(door.includes('My apartment balcony door is jammed. What should I tell Ellis?'),'sliding-door scenario belongs in door guide');
 const guides=renderedGuides();
 for(const cluster of content.clusters){
  const owners=guides.filter(guide=>guide.html.includes(`<summary>${escape(cluster.scenario[0])}</summary>`));
  assert.equal(owners.length,1,`${cluster.owner} detailed scenario has one guide owner`);
  assert.ok(owners[0].page.startsWith('guides/'),cluster.owner);
  assert.ok(owners[0].html.includes(`<p>${escape(cluster.scenario[1])}</p>`),`${cluster.owner} scenario answer is rendered`);
  assert.ok(owners[0].html.includes(`<h3>${escape(cluster.heading)}</h3>`),`${cluster.owner} topic heading is rendered`);
  // The committed renderer gives O30 a specific electrical-work answer.
  const intentAnswer=cluster.owner==='O30'?'A power point replacement is electrical work, separate from TV bracket fitting. Tell Ellis what needs changing so we can confirm the electrical work, applicable licensing requirements and quote before work starts.':cluster.answer;
  assert.ok(owners[0].html.includes(`<p>${escape(intentAnswer)}</p>`),`${cluster.owner} intent answer is rendered`);
  assert.ok(owners[0].html.includes(`href="../../${landing(cluster).replace(/index\.html$/,'')}"`),`${cluster.owner} guide links to its landing owner`);
  const planning=fs.readFileSync(path.join(root,landing(cluster)),'utf8').match(/<(section|aside)\b[^>]*id="repair-planning-guides"[\s\S]*?<\/\1>/)?.[0];
  const guideRoute=owners[0].page.replace(/index\.html$/,'');
  const linkedViaHub=/href="[^"]*guides\/"/.test(planning||'')&&fs.readFileSync(path.join(root,'guides/index.html'),'utf8').includes(guideRoute.replace(/^guides\//,''));
  assert.ok(planning?.includes(guideRoute)||linkedViaHub,`${cluster.owner} landing links to its guide owner directly or through the guide hub`);
  const faq=[...owners[0].html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match=>JSON.parse(match[1])).find(block=>block['@type']==='FAQPage');
  const scenario=faq.mainEntity.filter(question=>question.name===cluster.scenario[0]);
  assert.equal(scenario.length,1,`${cluster.owner} scenario has one structured FAQ owner`);
  assert.equal(scenario[0].acceptedAnswer.text,cluster.scenario[1],`${cluster.owner} structured answer matches committed source`);
 }
});
test('guide FAQ structured data matches all visible questions without duplicate accordion sections',()=>{
 for(const slug of fs.readdirSync(path.join(root,'guides')).filter(s=>fs.existsSync(path.join(root,'guides',s,'index.html')))){
  const h=fs.readFileSync(path.join(root,'guides',slug,'index.html'),'utf8');
  const sections=[...h.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].filter(m=>m[0].includes('<details>'));
  assert.equal(sections.length,1,slug);
  const json=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1])).find(x=>x['@type']==='FAQPage');
  assert.equal(json.mainEntity.length,[...h.matchAll(/<summary>/g)].length,slug);
 }
});
test('new repair guides are discoverable and indexable with matching structured navigation',()=>{
 const hub=fs.readFileSync(path.join(root,'guides/index.html'),'utf8'),site=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
 for(const slug of guideSlugs){
  const route=`guides/${slug}/`;assert.ok(hub.includes(route),`guide hub is missing ${slug}`);
  assert.ok(site.includes(`https://www.perthhandymate.com.au/${route}`));
  const h=fs.readFileSync(path.join(root,route,'index.html'),'utf8');assert.equal([...h.matchAll(/<h1\b/g)].length,1);assert.match(h,/name="robots" content="index,follow"/);
  const blocks=[...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  assert.equal(blocks.find(x=>x['@type']==='BreadcrumbList').itemListElement.at(-1).item,`https://www.perthhandymate.com.au/${route}`);
  for(const q of blocks.find(x=>x['@type']==='FAQPage').mainEntity)assert.ok(h.includes(q.name.replaceAll('&','&amp;')));
 }
});
test('committed keyword clusters and guides have unique owners and valid rendered page targets',()=>{
 assert.equal(content.clusters.length,31);assert.equal(new Set(content.clusters.map(cluster=>cluster.owner)).size,31);
 const home=content.clusters.find(cluster=>cluster.owner==='O01');assert.equal(home.slug,'home');
 assert.match(fs.readFileSync(path.join(root,landing(home)),'utf8'),/<h1\b[^>]*>[^<]*Handyman[^<]*<\/h1>/i);
 for(const cluster of content.clusters){
  const page=landing(cluster);assert.ok(fs.existsSync(path.join(root,page)),`${cluster.owner}: ${page}`);
  const html=fs.readFileSync(path.join(root,page),'utf8');assert.match(html,/<h1\b[^>]*>.+?<\/h1>/);
  assert.ok(html.includes('id="repair-planning-guides"'),`${cluster.owner} landing links to detailed guidance`);
  assert.ok(cluster.heading&&cluster.answer&&cluster.scenario[0]&&cluster.scenario[1],cluster.owner);
 }
 assert.equal(content.guides.length,4);assert.equal(new Set(content.guides.map(guide=>guide.slug)).size,4);
 for(const guide of content.guides){
  assert.ok(guideSlugs.includes(guide.slug),guide.slug);
  const html=fs.readFileSync(path.join(root,'guides',guide.slug,'index.html'),'utf8');
  assert.ok(html.includes(`<h1>${escape(guide.title)}</h1>`),guide.slug);
  for(const [heading,paragraph] of guide.sections){assert.ok(html.includes(`<h2>${escape(heading)}</h2>`),heading);assert.ok(html.includes(`<p>${escape(paragraph)}</p>`),heading);}
  for(const [question,answer] of guide.qa){assert.ok(html.includes(`<summary>${escape(question)}</summary>`),question);assert.ok(html.includes(`<p>${escape(answer)}</p>`),question);}
 }
});
