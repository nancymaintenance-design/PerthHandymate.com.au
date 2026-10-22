const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {sourceFiles,routeOf,origin,translator,localUrl,clean}=require('../scripts/lib/locales');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const files=sourceFiles(root);
const read=(locale,file)=>fs.readFileSync(path.join(dist,locale,file),'utf8');
const matches=(html,re)=>[...html.matchAll(re)].map(m=>m[1]);
test('new or changed English copy cannot silently fall back to English on a Chinese page',()=>{
  assert.throws(()=>translator({})('A newly changed paragraph.'),/Missing Chinese translation/);
  assert.equal(translator({'A newly changed paragraph.':'新修改的段落。'})('A newly changed paragraph.'),'新修改的段落。');
});
test('all 128 content pages have static Chinese counterparts, reciprocal SEO and seventh navigation item',()=>{
  assert.equal(files.length,128);
  for(const file of files){
    const en=read('',file),zh=read('zh',file),route=routeOf(file);
    assert.match(en,/<html lang="en-AU">/);assert.match(zh,/<html lang="zh-Hans">/);
    for(const body of [en,zh]){
      assert.ok(body.includes(`hreflang="en-AU" href="${origin+route}"`),file);
      assert.ok(body.includes(`hreflang="zh-Hans" href="${origin+'/zh'+route}"`),file);
      assert.ok(body.includes(`hreflang="x-default" href="${origin+route}"`),file);
    }
    assert.ok(zh.includes(`rel="canonical" href="${origin+'/zh'+route}"`),file);
    const nav=en.match(/<nav\b[^>]*id="main-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(nav&&nav.indexOf('Contact Us')<nav.indexOf('中文服务'),file);
    assert.ok(zh.includes(`data-language-switch href="${route}"`),file);
    for(const tag of ['h1','h2','h3','img','figure','details'])assert.equal((en.match(new RegExp('<'+tag+'\\b','g'))||[]).length,(zh.match(new RegExp('<'+tag+'\\b','g'))||[]).length,`${file}: ${tag} parity`);
    assert.deepEqual(matches(zh,/href="((?:tel:|mailto:)[^"]+)"/g),matches(en,/href="((?:tel:|mailto:)[^"]+)"/g),file);
    assert.ok(!zh.includes('+611300838722'),file);
    assert.ok(/[\u4e00-\u9fff]/.test(zh.match(/<title>(.*?)<\/title>/)?.[1]),file);
    assert.ok(!zh.includes('▁'),`${file}: tokenizer artifact`);
    const schemas=matches(zh,/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    schemas.forEach(body=>JSON.parse(body));
  }
});
test('Chinese links stay in Chinese while assets, external links and API remain shared',()=>{
  const known=new Set(files.map(routeOf));
  assert.equal(localUrl('../contact/?suburb=Fremantle#enquiry-form','about/index.html',known,true),'/zh/contact/?suburb=Fremantle#enquiry-form');
  assert.equal(localUrl('../assets/css/global.css','about/index.html',known,true),'/assets/css/global.css');
  assert.equal(localUrl('/api/contact','about/index.html',known,true),'/api/contact');
  assert.equal(localUrl('https://maps.app.goo.gl/iqNh8cGNbaZhBuP17','about/index.html',known,true),'https://maps.app.goo.gl/iqNh8cGNbaZhBuP17');
  for(const file of files){
    const zh=read('zh',file);
    for(const src of matches(zh,/\bsrc="([^"]+)"/g))if(src.startsWith('/')&&!src.startsWith('//'))assert.ok(fs.existsSync(path.join(dist,new URL(src,origin).pathname)),`${file}: missing script/image ${src}`);
    for(const srcset of matches(zh,/\bsrcset="([^"]+)"/g))for(const candidate of srcset.split(',')){
      const src=candidate.trim().split(/\s+/)[0];if(src.startsWith('/'))assert.ok(fs.existsSync(path.join(dist,new URL(src,origin).pathname)),`${file}: missing responsive image ${src}`);
    }
    for(const href of matches(read('zh',file),/href="([^"]+)"/g)){
      if(!href.startsWith('/')||href.startsWith('//'))continue;
      const url=new URL(href,origin),base=url.pathname.replace(/^\/zh/,'');
      if(known.has(base)&&!href.startsWith('/zh')&&!read('zh',file).includes(`data-language-switch href="${href}"`))assert.fail(`${file}: English content link leaked: ${href}`);
      if(!url.pathname.startsWith('/api/')){const target=path.join(dist,url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);assert.ok(fs.existsSync(target),`${file}: missing ${href}`);}
    }
  }
});
test('Chinese forms preserve original English option values required by service prefills and the API',()=>{
  const zh=read('zh','contact/index.html');
  const original=fs.readFileSync(path.join(root,'contact/index.html'),'utf8');
  const enOptions=[...original.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map(m=>m[1].match(/value="([^"]*)"/)?.[1]??m[2]);
  const zhOptions=[...zh.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)].map(m=>m[1].match(/value="([^"]*)"/)?.[1]);
  assert.deepEqual(zhOptions.map(clean),enOptions.map(clean));
});
test('sitemap doubles only the approved indexable URL set and declares both alternates',()=>{
  const xml=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
  const urls=matches(xml,/<loc>(.*?)<\/loc>/g);assert.equal(urls.length,254);assert.equal(new Set(urls).size,254);
  assert.equal(urls.filter(url=>new URL(url).pathname.startsWith('/zh/')).length,127);
  for(const entry of matches(xml,/<url>(.*?)<\/url>/g))for(const language of ['en-AU','zh-Hans','x-default'])assert.ok(entry.includes(`hreflang="${language}"`));
  assert.ok(!urls.some(url=>url.includes('404.html')));
});
