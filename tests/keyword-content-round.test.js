const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const content=JSON.parse(fs.readFileSync(path.join(root,'data/keyword-content-round.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const landing=cluster=>cluster.owner==='O02'?'services/property-maintenance/index.html':cluster.slug==='home'?'index.html':cluster.slug==='contact'?'contact/index.html':catalog.canonicalServices.find(service=>service.slug===cluster.slug)?.url+'index.html';
const plain=html=>html.replace(/<[^>]*>/g,' ').replaceAll('&#39;',"'").replaceAll('&amp;','&').replace(/\s+/g,' ').trim();
function assertPropertyMaintenanceOwner(html){
 const plans=html.match(/<section[^>]*id="maintenance-plans"[^>]*>[\s\S]*?<\/section>/)?.[0];
 assert.ok(plans,'O02 current service plans exist');
 for(const distinction of [/Repeat property maintenance/,/condition.*past faults.*preferred interval/,/approvals and visit arrangements/,/enquiry does not establish ongoing attendance/])assert.match(plain(plans),distinction);
 const remote=html.match(/<details[^>]*id="remote-owners-and-multiple-properties"[^>]*>[\s\S]*?<\/details>/)?.[0];
 assert.ok(remote,'O02 remote-owner decision exists');
 for(const distinction of [/local access contact/,/approves quotes and variations/,/Agree any completion photos or summaries before booking/])assert.match(plain(remote),distinction);
 assert.match(plain(html),/Reporting a fault or opening the property does not authorise repairs or extra spending/);
 assert.match(plain(html),/specialist requirements.*accepted tasks and exclusions/);
 assert.doesNotMatch(html,/"@type":"FAQPage"/,'informational plans are not advertised as FAQ questions');
 assert.equal((html.match(/id="maintenance-plans"/g)||[]).length,1);
}
const renderedGuides=()=>fs.readdirSync(path.join(root,'guides')).filter(slug=>fs.existsSync(path.join(root,'guides',slug,'index.html'))).map(slug=>({page:`guides/${slug}/index.html`,html:fs.readFileSync(path.join(root,'guides',slug,'index.html'),'utf8')}));
const guideSlugs=['cupboard-hinges-drawer-runners-repair-guide','sticking-doors-windows-repair-guide','wall-patching-paint-touch-ups-guide','shower-silicone-grout-waterproofing-guide'];
test('booking FAQ stays focused and each research scenario retains a guide or service answer',()=>{
 const h=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const booking=h.match(/<section class="section shell service-questions"><h2>Handyman Booking Questions[\s\S]*?<\/section>/)[0];
 assert.equal([...booking.matchAll(/<details\b/g)].length,6,'booking FAQ remains separate from task decisions');
 assert.ok(!h.includes('id="keyword-repair-questions"'));
 const door=fs.readFileSync(path.join(root,'guides/sticking-doors-windows-repair-guide/index.html'),'utf8');
 assert.ok(door.includes('My apartment balcony door is jammed. What should I tell Ellis?'),'sliding-door scenario belongs in door guide');
 const moved=require('../data/service-guide-faq.json');
 const mapping=require('../data/service-guide-faq-owners.json');
 const guides=[...renderedGuides(),...Object.keys(moved).map(route=>({page:route.slice(1)+'index.html',html:fs.readFileSync(path.join(root,route.slice(1),'index.html'),'utf8')}))];
 for(const cluster of content.clusters){
  if(cluster.owner==='O02'){
   const owner=fs.readFileSync(path.join(root,landing(cluster)),'utf8');
   assertPropertyMaintenanceOwner(owner);
   const oldQuestion=mapping.questionOwners[cluster.scenario[0]]||cluster.scenario[0];
   assert.equal(guides.filter(guide=>guide.html.includes(`<summary>${escape(oldQuestion)}</summary>`)).length,0,'O02 migrated scenario is represented by the maintained service plan, not a duplicate FAQ');
   assert.ok(fs.readFileSync(path.join(root,'guides/seasonal-home-maintenance-australia/index.html'),'utf8').includes('/services/property-maintenance/'),'seasonal checklist links to the current maintenance owner');
   continue;
  }
  const scenarioQuestion=mapping.questionOwners[cluster.scenario[0]]||cluster.scenario[0];
  const scenarioAnswer=mapping.mergedAnswers[scenarioQuestion]||cluster.scenario[1];
  const owners=guides.filter(guide=>guide.html.includes(`<summary>${escape(scenarioQuestion)}</summary>`));
  assert.equal(owners.length,1,`${cluster.owner} detailed scenario has one current owner`);
  assert.ok(owners[0].html.includes(`<p>${escape(scenarioAnswer)}</p>`),`${cluster.owner} current scenario answer is rendered`);
  if(owners[0].page.startsWith('guides/'))assert.ok(owners[0].html.includes(`<h3>${escape(cluster.heading)}</h3>`),`${cluster.owner} topic heading is rendered`);
  // The committed renderer gives O30 a specific electrical-work answer.
  const sourceIntent=Object.values(moved).flat().find(item=>item.includes(`<p>${escape(cluster.answer)}</p>`)||item.includes(`<p>${cluster.answer}</p>`));
  const intentQuestion=sourceIntent?.match(/<summary>(.*?)<\/summary>/)[1];
  const intentAnswer=mapping.mergedAnswers[mapping.questionOwners[intentQuestion]]||(cluster.owner==='O30'?'A power point replacement is electrical work, separate from TV bracket fitting. Tell Ellis what needs changing so we can confirm the electrical work, applicable licensing requirements and quote before work starts.':cluster.answer);
  assert.ok(owners[0].html.includes(`<p>${escape(intentAnswer)}</p>`),`${cluster.owner} intent answer is rendered`);
  if(owners[0].page.startsWith('guides/'))assert.ok(owners[0].html.includes(`href="../../${landing(cluster).replace(/index\.html$/,'')}"`),`${cluster.owner} guide links to its landing owner`);
  const planning=fs.readFileSync(path.join(root,landing(cluster)),'utf8').match(/<(section|aside)\b[^>]*id="repair-planning-guides"[\s\S]*?<\/\1>/)?.[0];
  const guideRoute=owners[0].page.replace(/index\.html$/,'');
  const linkedViaHub=/href="[^"]*guides\/"/.test(planning||'')&&fs.readFileSync(path.join(root,'guides/index.html'),'utf8').includes(guideRoute.replace(/^guides\//,''));
  if(owners[0].page.startsWith('guides/'))assert.ok(planning?.includes(guideRoute)||linkedViaHub,`${cluster.owner} landing links to its guide owner directly or through the guide hub`);
  else assert.ok(fs.readFileSync(path.join(root,'guides/seasonal-home-maintenance-australia/index.html'),'utf8').includes('/'+guideRoute),`${cluster.owner} seasonal checklist links to the service owner`);
  const faq=[...owners[0].html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(match=>JSON.parse(match[1])).find(block=>block['@type']==='FAQPage');
  const scenario=faq.mainEntity.filter(question=>question.name===scenarioQuestion);
  assert.equal(scenario.length,1,`${cluster.owner} scenario has one structured FAQ owner`);
  assert.equal(scenario[0].acceptedAnswer.text,scenarioAnswer,`${cluster.owner} structured answer matches maintained merged answer`);
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
 const homeHtml=fs.readFileSync(path.join(root,landing(home)),'utf8');
 assert.match(plain(homeHtml.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]),/Handyman.*Perth/i);
 for(const cluster of content.clusters){
  const page=landing(cluster);assert.ok(fs.existsSync(path.join(root,page)),`${cluster.owner}: ${page}`);
  const html=fs.readFileSync(path.join(root,page),'utf8');assert.match(html,/<h1\b[^>]*>.+?<\/h1>/);
  if(cluster.owner==='O02'){
   assertPropertyMaintenanceOwner(html);
   assert.ok(html.includes('/guides/property-manager-maintenance-coordination/'),'O02 links to authority and access guidance');
   assert.ok(html.includes('/guides/prepare-before-home-repair-quote/'),'O02 links to repair-list preparation');
  }else assert.ok(html.includes('id="repair-planning-guides"'),`${cluster.owner} landing links to detailed guidance`);
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
