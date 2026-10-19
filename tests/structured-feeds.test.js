const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {load} = require('cheerio');
const {sourceFiles,routeOf,languageShell,renderChinese,translator} = require('../scripts/lib/locales');
const root = path.resolve(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,'dist',file),'utf8');
const graph = html => load(html)('script[type="application/ld+json"]').toArray().flatMap(e=>{const d=JSON.parse(load(html)(e).text());return d['@graph']||[d];});

// Missing entity connections would make crawlers unable to identify the page's primary subject.
test('bilingual pages connect stable business, website and unique primary page entities',()=>{
 for(const f of sourceFiles(root).filter(f=>f!=='404.html')) for(const prefix of ['', 'zh/']){
  const html=read(prefix+f),$=load(html),nodes=graph(html),url=$('link[rel=canonical]').attr('href');
  const page=nodes.find(n=>n['@id']===url+'#webpage');
  assert.ok(page,`${prefix+f}: missing page entity`);
  assert.equal(page.name,$('h1').first().text().replace(/\s+/g,' ').trim());
  assert.equal(page.inLanguage,prefix?'zh-Hans':'en-AU');
  assert.equal(nodes.filter(n=>n['@type']==='WebSite').length,1);
  assert.ok(nodes.some(n=>n['@id']==='https://www.perthhandymate.com.au/#perth-office'));
  const ids=nodes.map(n=>n['@id']).filter(Boolean);assert.equal(ids.length,new Set(ids).size);
  const target=nodes.find(n=>n['@id']===page.mainEntity?.['@id']);assert.ok(target);
  if(f.startsWith('projects/')&&f!=='projects/index.html')assert.equal(target['@type'],'CreativeWork');
  for(const term of page.keywords||[]) assert.ok($('main').text().replace(/\s+/g,' ').includes(term),term);
 }
});

test('feeds expose matching canonical titles, visible content and topics in both languages',()=>{
 for(const prefix of ['', 'zh/']){
  assert.ok(fs.existsSync(path.join(root,'dist',prefix,'feed.json')),'missing real JSON Feed');
  const feed=JSON.parse(read(prefix+'feed.json')),$xml=load(read(prefix+'feed.xml'),{xmlMode:true});
  assert.equal(feed.version,'https://jsonfeed.org/version/1.1');assert.ok(feed.items.length>100);
  assert.equal(feed.language,prefix?'zh-Hans':'en-AU');
  assert.equal($xml('item').length,feed.items.length);
  assert.equal(new Set(feed.items.map(i=>i.id)).size,feed.items.length);
  for(const [index,item] of feed.items.entries()){
   const rss=$xml('item').eq(index);
   assert.equal(rss.find('title').text(),item.title);assert.equal(rss.find('guid').text(),item.id);
   assert.equal(rss.find('description').text(),item.summary);assert.equal(rss.find('content\\:encoded').text(),item.content_html);
   const file=new URL(item.url).pathname.replace(/^\//,'')+'index.html';const $=load(read(file));
   assert.equal(item.title,$('h1').first().text().replace(/\s+/g,' ').trim());
   assert.equal(item.id,item.url);assert.ok(item.content_html.length>100);
   assert.ok(!item.date_published&&!item.date_modified,'do not invent publication dates');
   assert.ok(!item.authors,'no unseen byline');
   const text=load(item.content_html).text().replace(/\s+/g,' ').trim();
   assert.ok($('main').text().replace(/\s+/g,' ').includes(text.slice(0,80)));
   assert.doesNotMatch(item.content_html,/<script|<form|<iframe|javascript:|__editor/i);
   const content=load(item.content_html);
   content('img[src]').each((_,e)=>assert.match(content(e).attr('src'),/^https:\/\/www\.perthhandymate\.com\.au\//));
   content('[srcset]').each((_,e)=>{for(const candidate of content(e).attr('srcset').split(','))assert.match(candidate.trim(),/^https:\/\/www\.perthhandymate\.com\.au\//,'feed responsive image must be absolute');});
   for(const tag of item.tags)assert.ok($('main').text().replace(/\s+/g,' ').includes(tag));
  }
  assert.doesNotMatch(JSON.stringify(feed),/example\.com|\{\{BRAND\}\}/);
 }
});

test('enrichment preserves every pre-existing rendered body and presentation asset byte-for-byte',()=>{
 const dictionary={...JSON.parse(fs.readFileSync(path.join(root,'locales/zh-Hans.json')))};
 for(const f of fs.readdirSync(path.join(root,'locales/parts')).filter(f=>f.endsWith('.json')&&!f.startsWith('revision-')).sort())Object.assign(dictionary,JSON.parse(fs.readFileSync(path.join(root,'locales/parts',f))));
 const overrides=JSON.parse(fs.readFileSync(path.join(root,'locales/editorial-overrides.json')));Object.assign(dictionary,overrides);
 for(const f of fs.readdirSync(path.join(root,'locales/parts')).filter(f=>/^revision-.*\.json$/.test(f)).sort())Object.assign(dictionary,JSON.parse(fs.readFileSync(path.join(root,'locales/parts',f))));
 const files=sourceFiles(root),known=new Set(files.map(routeOf));
 for(const [en,zh] of Object.entries(overrides))if(Object.hasOwn(dictionary,en+' | Ellis'))dictionary[en+' | Ellis']=zh+' | Ellis';
 const {clean}=require('../scripts/lib/locales');
 for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8'),title=src.match(/<title>(.*?)<\/title>/)?.[1],h1=src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];if(title&&h1&&!Object.hasOwn(overrides,clean(title))&&Object.hasOwn(dictionary,clean(h1)))dictionary[clean(title)]=dictionary[clean(h1)]+' | Ellis';}
 const t=translator(dictionary);
 const body=h=>h.match(/<body\b[^>]*>[\s\S]*<\/body>/i)?.[0];
 for(const f of files){const src=fs.readFileSync(path.join(root,f),'utf8');
  assert.equal(body(read(f)),body(languageShell(src,f,false)),f);
  assert.equal(body(read('zh/'+f)),body(renderChinese(src,f,known,t)),'zh/'+f);
 }
});

test('only emitted language-specific feeds are discoverable without changing index policy',()=>{
 for(const prefix of ['', 'zh/']){
  const $=load(read(prefix+'guides/index.html'));
  assert.equal($('link[type="application/feed+json"]').attr('href'),`https://www.perthhandymate.com.au/${prefix}feed.json`);
  assert.equal($('link[type="application/rss+xml"]').attr('href'),`https://www.perthhandymate.com.au/${prefix}feed.xml`);
  assert.equal($('link[type="application/atom+xml"]').length,0);
 }
 assert.doesNotMatch(read('404.html'),/feed\+json/);
});
