const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function walk(dir) { return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []); }
function visible(file) { return fs.readFileSync(file,'utf8').replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '); }
const forbidden = /appropriate local pathway|single intake process|manually reviews whether|discuss the practical next step|explain what caused the damage|Upload elevation|qualified local professional can assess|appropriate specialist pathway|hazard referrals|whether our local team can|whether the job can be assessed remotely|right air-conditioning pathway|specialist referral|search result is a confirmed booking|discuss the job and next practical step|check fit and serviceability|pest triage|arborist triage|glazier triage/i;
test('rendered customer journey gives service assessment rather than deflection, diagnosis burden or editorial copy', () => {
 const files = ['index.html',...['about','areas','contact','faq','guides','projects','services'].flatMap(d=>walk(path.join(root,d)))].map(f=>path.isAbsolute(f)?f:path.join(root,f));
 const hits = files.flatMap(file => { const m=visible(file).match(forbidden); return m ? [{file:path.relative(root,file),copy:m[0]}] : []; });
 assert.deepEqual(hits, [], JSON.stringify(hits,null,2));
});
test('first screen and contact route offer an assessment and quote with optional email photos', () => {
 const home=visible(path.join(root,'index.html'));
 assert.match(home, /assessment/i); assert.match(home,/quote/i);
 const contact=visible(path.join(root,'contact/index.html'));
 assert.match(contact,/photos.{0,60}(?:optional|if available)|optional.{0,60}photos/i);
 assert.match(contact, /Ellis/i);
});
test('customer FAQ answers match their schema and optional photos use the existing email route', () => {
 const files = ['index.html',...['about','areas','contact','faq','guides','projects','services'].flatMap(d=>walk(path.join(root,d)))].map(f=>path.isAbsolute(f)?f:path.join(root,f));
 const decode = value => String(value).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:0?39|x27);/gi,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
 let answers=0;
 for(const file of files) {
  const raw=fs.readFileSync(file,'utf8');
  const body=decode(visible(file));
  assert.doesNotMatch(body, /\bUpload (?:photos|images|elevation)/i, path.relative(root,file));
  for(const block of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
   const data=JSON.parse(block[1]);
   const graph=data['@graph'] || [data];
   for(const faq of graph.filter(v=>v['@type']==='FAQPage')) for(const q of faq.mainEntity) {
    assert.ok(body.includes(decode(q.name)), path.relative(root,file)+': visible question');
    assert.ok(body.includes(decode(q.acceptedAnswer.text)), path.relative(root,file)+': visible answer');
    answers++;
   }
  }
 }
 assert.ok(answers>0,'real rendered FAQ answers checked');
 const contact=fs.readFileSync(path.join(root,'contact/index.html'),'utf8');
 assert.match(contact,/handyman\.maintenance\.au@outlook\.com/);
 assert.doesNotMatch(contact, /type="file"/i,'form offers no attachment upload');
});

test('service preparation treats photos and dimensions as optional, with company assessment', () => {
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/service-catalog.json'),'utf8'));
 for(const service of catalog.canonicalServices) {
  if(/photos?|measurements|dimensions|room sizes/i.test(service.nextStep)) {
   assert.match(service.nextStep,/optional|if available|where available/i,service.slug);
   assert.match(service.nextStep,/on site|on-site|assess|measure|check|inspect/i,service.slug);
   const rendered=visible(path.join(root,service.url,'index.html'));
   assert.ok(rendered.includes(service.nextStep),service.slug+': published preparation matches current catalogue');
  }
 }
 for(const slug of ['carpenters','carpet-repair','fly-screens','door-installation']) {
  const file=walk(path.join(root,'services')).find(f=>f.endsWith(path.sep+slug+path.sep+'index.html'));
  assert.ok(file,'actual published route found: '+slug);
  const text=visible(file);
  assert.doesNotMatch(text,/Provide dimensions, close-up photos|Send a wide photo, a close-up|Send frame measurements and photos|Send opening measurements, frame photos/i,slug);
 }
});

