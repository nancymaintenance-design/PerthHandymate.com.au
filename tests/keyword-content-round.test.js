const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const guideSlugs=['cupboard-hinges-drawer-runners-repair-guide','sticking-doors-windows-repair-guide','wall-patching-paint-touch-ups-guide','shower-silicone-grout-waterproofing-guide'];
test('handyman landing keeps one concise FAQ and detailed scenarios live in relevant guides',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 assert.equal([...h.matchAll(/<details\b/g)].length,6,'booking FAQ must not grow into a topic dump');
 assert.ok(!h.includes('id="keyword-repair-questions"'));
 const door=fs.readFileSync(path.join(root,'guides/sticking-doors-windows-repair-guide/index.html'),'utf8');
 assert.ok(door.includes('My apartment balcony door is jammed. What should I tell Ellis?'),'sliding-door scenario belongs in door guide');
 const rows=JSON.parse(fs.readFileSync(path.join(root,'docs/keyword-content-round/coverage.json'),'utf8'));
 for(const r of rows.filter(r=>['意向提问词','场景使用词'].includes(r.type)))assert.ok(r.page.startsWith('guides/'),r.id);
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
test('keyword coverage inventory gives each source ID one owner and valid page targets',()=>{
 const rows=JSON.parse(fs.readFileSync(path.join(root,'docs/keyword-content-round/coverage.json'),'utf8'));
 assert.equal(rows.length,527);assert.equal(new Set(rows.map(r=>r.id)).size,527);
 const rowsById=new Map(rows.map(r=>[r.id,r]));assert.equal(rowsById.get('HM0002').placement,'H1');
 for(const r of rows){assert.ok(r.page);assert.ok(fs.existsSync(path.join(root,r.page)));assert.ok(['H1','FAQ','H2/H3','Guides & Advice'].includes(r.placement));assert.ok(r.status);}
});
