const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const api=()=>require('../scripts/lib/service-navigation');
const origin='https://www.perthhandymate.com.au';
const repair='/services/doors-windows-glass-screens/window-repairs/';
test('priority service has a direct home path, with matching Chinese ancestors',()=>{
 const {trailFor}=api();assert.deepEqual(trailFor(repair).map(n=>n.path),['/',repair]);
 assert.deepEqual(trailFor('/zh'+repair).map(n=>n.path),['/zh/','/zh'+repair]);
});
test('actual screen-mesh case returns to flyscreen work, mixed trade guide keeps guide hub',()=>{
 const {trailFor}=api();assert.equal(trailFor('/projects/sliding-door-flyscreen-repair/').at(-2).path,'/services/doors-windows-glass-screens/fly-screens/');
 assert.equal(trailFor('/guides/shower-silicone-grout-waterproofing-guide/').at(-2).path,'/guides/');
});
test('renderer marks current text, emits absolute ancestors, safely serializes and removes duplicate breadcrumbs only',()=>{
 const {applyNavigation,renderBreadcrumb}=api();const raw='<html><head><script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script><script type="application/ld+json">{"@type":"Organization","name":"Ellis"}</script></head><body><main><nav class="breadcrumbs"><ol><li>Old</li></ol></nav><h1>Existing heading</h1></main></body></html>';
 const out=applyNavigation(raw,'services/doors-windows-glass-screens/window-repairs/index.html',false),$=load(out);
 assert.equal($('nav.breadcrumbs').length,1);assert.equal($('nav.breadcrumbs [aria-current=page]').text(),'Window repairs');
 assert.equal($('nav.breadcrumbs a').attr('href'),origin+'/');assert.equal($('nav.breadcrumbs [aria-current=page] a').length,0);
 assert.equal($('h1').text(),'Existing heading');const nodes=$('script[type="application/ld+json"]').toArray().flatMap(e=>{const d=JSON.parse($(e).text());return d['@graph']||[d]});
 assert.equal(nodes.filter(n=>n['@type']==='BreadcrumbList').length,1);assert.equal(nodes.filter(n=>n['@type']==='Organization').length,1);
 const items=nodes.find(n=>n['@type']==='BreadcrumbList').itemListElement;assert.deepEqual(items.map(i=>i.name),['Home','Window repairs']);assert.equal(items.at(-1).item,origin+repair);
 assert.equal(applyNavigation(out,'services/doors-windows-glass-screens/window-repairs/index.html',false),out,'idempotent');
 assert.doesNotMatch(renderBreadcrumb('/'),/BreadcrumbList|<nav/);
});
test('explicit map rejects missing parents, cycles, language crossing and wrong owner targets',()=>{
 const {validateMap,map}=api();assert.doesNotThrow(()=>validateMap(map));
 for(const mutation of [r=>{r[repair].primary_parent_url='/missing/';},r=>{r[repair].primary_parent_url=repair;},r=>{r[repair].primary_parent_url='/zh/';},r=>{r[repair].commercial_owner_url='/missing/';}]){
  const records=structuredClone(map);mutation(records);assert.throws(()=>validateMap(records));
 }
});
test('duplicate legacy navigation is consolidated and special labels cannot terminate JSON scripts',()=>{
 const {applyNavigation,map}=api(),record=map[repair],original=record.breadcrumb_label;
 const raw='<html><head></head><body><main><nav class="breadcrumbs"><ol><li>A</li></ol></nav><h1>Existing</h1><nav class="breadcrumbs"><ol><li>B</li></ol></nav></main></body></html>';
 try{record.breadcrumb_label='Window "A" & </script><b>glass</b>';const html=applyNavigation(raw,'services/doors-windows-glass-screens/window-repairs/index.html',false),$=load(html);
 assert.equal($('nav.breadcrumbs').length,1);assert.equal($('nav.breadcrumbs [aria-current=page]').text(),record.breadcrumb_label);assert.equal($('nav.breadcrumbs b').length,0);
 assert.equal($('script[type="application/ld+json"]').length,1);assert.equal(JSON.parse($('script[type="application/ld+json"]').text()).itemListElement.at(-1).name,record.breadcrumb_label);
 }finally{record.breadcrumb_label=original;}
});
test('all mapped published outputs retain language metadata and visible/schema path, and parents link back',()=>{
 const {map,trailFor}=api();let checked=0;
 const {sourceFiles}=require('../scripts/lib/locales');
 const expected=sourceFiles(path.resolve(__dirname,'..')).filter(f=>f!=='404.html').flatMap(f=>['/'+f.replace('index.html',''),'/zh/'+f.replace('index.html','')]).sort();
 assert.deepEqual(Object.keys(map).sort(),expected,'every canonical page and real language counterpart is explicitly mapped');
 for(const [route,record] of Object.entries(map)){
  const file=route==='/'?'index.html':route.slice(1)+'index.html',html=fs.readFileSync(path.resolve(__dirname,'../dist',file),'utf8'),$=load(html),trail=trailFor(route);
  assert.equal($('link[rel=canonical]').attr('href'),origin+route);assert.equal($('html').attr('lang'),record.locale);
  const nodes=$('script[type="application/ld+json"]').toArray().flatMap(e=>{const d=JSON.parse($(e).text());return d['@graph']||[d]});
  const crumbs=nodes.filter(n=>n['@type']==='BreadcrumbList');
  if(trail.length<2){assert.equal(crumbs.length,0);continue;}
  assert.equal(crumbs.length,1,route);assert.equal($('nav.breadcrumbs').length,1,route);
  assert.deepEqual($('nav.breadcrumbs li').toArray().map(e=>$(e).text().trim()),trail.map(n=>n.breadcrumb_label));
  assert.deepEqual(crumbs[0].itemListElement.map(n=>[n.position,n.name,n.item]),trail.map((n,i)=>[i+1,n.breadcrumb_label,origin+n.path]));
  const parent=record.primary_parent_url,pfile=parent.endsWith('/')?parent.slice(1)+'index.html':'index.html',p$=load(fs.readFileSync(path.resolve(__dirname,'../dist',pfile),'utf8'));
  assert.ok(p$('a[href]').toArray().some(e=>new URL(p$(e).attr('href'),origin+parent).pathname===route),'parent back-link '+route);checked++;
 }
 assert.equal(checked,252);
});
