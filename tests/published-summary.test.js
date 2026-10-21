const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('cheerio');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,'dist',file),'utf8');
const graph=$=>$('script[type="application/ld+json"]').toArray().flatMap(e=>{const d=JSON.parse($(e).text());return d['@graph']||[d];});

// A length threshold selecting a later repair-warning paragraph must fail this test.
test('short Chinese introductions remain the subject of schema and feed summaries',()=>{
 const cases=[
  ['zh/projects/drawer-runner-replacement-southern-corridor/index.html','在南部走廊地区，为损坏的抽屉滑轨进行了更换。前后对比照片展示原有抽屉及更换滑轨后的状态。'],
  ['zh/services/doors-windows-glass-screens/door-installation/index.html','门安装服务涵盖室内外门、门框、铰链、五金及必要调整，让门安装牢固、开合顺畅。'],
 ];
 const feed=JSON.parse(read('zh/feed.json')),$rss=load(read('zh/feed.xml'),{xmlMode:true});
 for(const [file,want] of cases){
  const $=load(read(file)),nodes=graph($),url=$('link[rel=canonical]').attr('href');
  assert.equal(nodes.find(n=>n['@id']===url+'#webpage').description,want,file);
  assert.equal(feed.items.find(i=>i.url===url).summary,want,file+' JSON Feed');
  assert.equal($rss('item').filter((_,e)=>$rss(e).children('link').text()===url).children('description').text(),want,file+' RSS');
 }
});

// Leaving CreativeWork.description as a separate old synopsis must fail this contract.
test('every primary content entity and both feeds share the published introduction',()=>{
 const {sourceFiles}=require('../scripts/lib/locales');
 for(const prefix of ['','zh/']){
  const feed=JSON.parse(read(prefix+'feed.json')),$rss=load(read(prefix+'feed.xml'),{xmlMode:true});
  for(const file of sourceFiles(root).filter(f=>f!=='404.html')){
   const $=load(read(prefix+file)),nodes=graph($),url=$('link[rel=canonical]').attr('href');
   const intro=$('main h1').first().nextAll('p.hero-copy,p.lede').first();
   const summary=(intro.length?intro:$('main .guide-introduction p').first()).text().replace(/\s+/g,' ').trim();
   assert.ok(summary,'missing published introduction: '+prefix+file);
   const page=nodes.find(n=>n['@id']===url+'#webpage');
   assert.equal(page.description,summary,prefix+file+' page summary');
   const primary=nodes.find(n=>n['@id']===page.mainEntity?.['@id']);
   if(['Service','Article','CreativeWork'].includes(primary?.['@type']))assert.equal(primary.description,summary,prefix+file+' primary summary');
   const item=feed.items.find(i=>i.url===url);assert.ok(item,prefix+file);
   assert.equal(item.summary,summary,prefix+file+' JSON Feed');
   assert.equal($rss('item').filter((_,e)=>$rss(e).children('link').text()===url).children('description').text(),summary,prefix+file+' RSS');
  }
 }
});
