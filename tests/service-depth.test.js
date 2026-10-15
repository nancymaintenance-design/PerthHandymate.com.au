const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
test('all 67 services publish individual scope, quote factors and relevant routes across historical and current rounds',()=>{
 const copy=require('../tools/service-depth-copy');const seen=new Set();
 const current=require('../docs/seo/keyword-gap-round-2026-10-12/action-coverage.json').actions;
 for(const item of catalog.canonicalServices){
  const html=fs.readFileSync(path.join(root,item.url,'index.html'),'utf8');
  if(item.slug==='handymen'){
   assert.match(html, /class="handyman-task-grid"/);
   const booking=html.match(/<section class="section shell service-questions"><h2>Handyman Booking Questions[\s\S]*?<\/section>/)[0];
   assert.equal([...booking.matchAll(/<details\b/g)].length,6);
   for(const slug of ['carpenters','plasterers'])assert.ok(html.includes('href="../../../'+catalog.canonicalServices.find(x=>x.slug===slug).url+'"'));
   assert.ok(html.indexOf('id="service-work-options"')<html.indexOf('class="section shell service-questions"'));
   continue;
  }
  const section=html.match(/<section class="section shell" id="service-work-options">[\s\S]*?<\/section>/)?.[0];
  assert.ok(section,item.slug+' missing deep content');
  assert.equal((html.match(/id="service-work-options"/g)||[]).length,1,item.slug+' duplicate depth block');
  const [a,b,c,d,factors,related]=copy[item.slug];
  const actions=current.filter(action=>action.priority==='P2' && action.currentOwner.split('#')[0]==='/'+item.url);
  const fenceSibling=['fence-builders','fencing-contractors'].includes(item.slug);
  if(actions.length || fenceSibling) {
   // This round deliberately replaces prior scenarios on these existing owners.
   // Their independent task distinctions are exercised by keyword-gap-existing-content.test.js.
   const evidence=actions.flatMap(action=>action.evidence).filter(e=>e.path==='/'+item.url);
   if(fenceSibling) evidence.push({anchor:item.slug==='fence-builders'?'new-fence-owner':'fencing-project-owner'});
   for(const e of evidence) assert.ok(section.includes('id="'+e.anchor+'"'),item.slug+' missing accepted current task');
   assert.ok(section.includes(esc(factors)),item.slug+' missing individual quote factors');
   for(const slug of related){const target=catalog.canonicalServices.find(x=>x.slug===slug);assert.ok(section.includes('href="../../../'+target.url+'"'));}
   assert.match(section,/data-preserve-search href="\.\.\/\.\.\/\.\.\/contact\/\?service=/);
   assert.ok(html.indexOf('id="service-work-options"')<html.indexOf('class="section shell service-questions"'));
   continue;
  }
  for(const text of [a,b,c,d,factors])assert.ok(section.includes(esc(text)),item.slug+' missing custom copy');
  for(const paragraph of [b,d,factors]){assert.ok(!seen.has(paragraph),'repeated copy: '+item.slug);seen.add(paragraph);}
  assert.equal((section.match(/<article>/g)||[]).length,2);
  for(const slug of related){const target=catalog.canonicalServices.find(x=>x.slug===slug);assert.ok(section.includes('href="../../../'+target.url+'"'));}
  assert.match(section,/data-preserve-search href="\.\.\/\.\.\/\.\.\/contact\/\?service=/);
  assert.ok(html.indexOf('id="service-work-options"')<html.indexOf('class="section shell service-questions"'));
 }
});
