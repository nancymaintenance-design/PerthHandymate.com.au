const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const catalog = require('../data/service-catalog.json').canonicalServices;
const {loadPlaywright, browserLaunchOptions} = require('./helpers/browser-runtime');
let browser, server, base;
test.before(async()=>{
  server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+pathname,pathname.endsWith('/')?'index.html':'');
    if(path.relative(root,file).startsWith('..')||!fs.existsSync(file))return res.writeHead(404).end();
    res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
  const pw=loadPlaywright();browser=await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));
});
test.after(async()=>{await browser?.close();await new Promise(r=>server.close(r));});
// Catches restoring doubled section padding or removing FAQ/scope visual separation.
test('service content and FAQ have compact gaps and independent scope panels at desktop and narrow widths',async()=>{
  for(const width of [1920,390]){
    const context=await browser.newContext({viewport:{width,height:1080},reducedMotion:'reduce'});
    await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    const page=await context.newPage();
    for(const item of catalog){
      await page.goto(base+'/'+item.url,{waitUntil:'load'});
      const m=await page.evaluate(()=>{
        const work=document.querySelector('#service-work-options'),faq=document.querySelector('.service-questions');
        const before=faq.previousElementSibling;
        const last=before.lastElementChild.getBoundingClientRect();
        const first=faq.firstElementChild.getBoundingClientRect();
        const accordion=faq.querySelector('.accordion-list');
        const next=accordion?.nextElementSibling;
        return {gap:first.top-last.bottom,scopeGap:next?next.getBoundingClientRect().top-accordion.getBoundingClientRect().bottom:32,overflow:document.documentElement.scrollWidth-innerWidth};
      });
      assert.ok(m.gap<=100,item.slug+' work/FAQ gap '+m.gap);
      assert.ok(m.scopeGap>=24,item.slug+' FAQ/scope gap '+m.scopeGap);
      assert.equal(m.overflow,0,item.slug+' horizontal overflow');
    }
    await context.close();
  }
});
// Catches dumping related-service navigation back into unlabelled prose/bullet lists.
test('related service collections retain their destinations in clearly labelled card groups',()=>{
  for(const item of catalog.filter(x=>x.slug!=='handymen')){
    const html=fs.readFileSync(path.join(root,item.url,'index.html'),'utf8');
    assert.match(html,/<div class="service-related-links">[\s\S]*?<h3>Related Services for This Job<\/h3>[\s\S]*?<ul class="service-link-cards">/,item.slug);
  }
});

test('presentation adapter preserves every word, URL and schema and is stable on repeat runs',()=>{
  const {normalizeServiceClarity}=require('../tools/normalize-service-clarity');
  const fixture='<script type="application/ld+json">{"name":"Retaining walls"}</script><section class="section shell" id="service-work-options"><article><h3>Leaning wall</h3><p>Investigate the cause.</p></article><h3>What Affects the Quote?</h3><p>A$210–$630; height dependent.</p><h3>Related Services for This Job</h3><ul><li><a href="/services/engineering/">Engineering</a></li></ul></section><section class="section shell service-questions"><h2>Questions</h2><div class="accordion-list" id="assessment-questions"><details><summary>Can it be repaired?</summary><p>Assess first.</p></details></div><h3>Work We Assess</h3><ul><li>Drainage</li></ul><h3>Wall: On-site Checks &amp; Optional Details</h3><p>Photos optional.</p></section>';
  const after=normalizeServiceClarity(fixture);
  const text=x=>x.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
  assert.equal(text(after),text(fixture));
  assert.deepEqual([...after.matchAll(/href="([^"]*)"/g)].map(x=>x[1]),['/services/engineering/']);
  assert.match(after,/<div class="service-scope-panel">/);
  assert.match(after,/<div class="service-preparation-panel">/);
  assert.ok(after.startsWith('<script type="application/ld+json">{"name":"Retaining walls"}</script>'));
  assert.equal(normalizeServiceClarity(after),after);
});

test('FAQ keyboard disclosure keeps scope separate when answers expand',async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();
  try {
    await page.goto(base+'/services/outdoor-structures-fencing-pools/retaining-walls/',{waitUntil:'load'});
    const detail=page.locator('.service-questions details').first();
    await detail.locator('summary').focus();await page.keyboard.press('Enter');
    assert.equal(await detail.getAttribute('open'),'');
    assert.ok(await detail.locator('p').isVisible());
    const separation=await page.evaluate(()=>document.querySelector('.service-scope-panel').getBoundingClientRect().top-document.querySelector('.accordion-list').getBoundingClientRect().bottom);
    assert.ok(separation>=24,'scope remains outside expanded answer');
    await page.locator('.service-related-links').scrollIntoViewIfNeeded();
    const directory=path.resolve(root,'../reports/service-clarity-2026-10-14/screenshots');
    fs.mkdirSync(directory,{recursive:true});
    await page.screenshot({path:path.join(directory,'retaining-wall-clarity.png'),fullPage:true});
    await detail.locator('summary').focus();await page.keyboard.press('Space');
    assert.equal(await detail.getAttribute('open'),null);
  } finally {await context.close();}
});

test('handyman task disclosures reveal complete advice by keyboard and legacy fragment',async()=>{
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
    const page=await context.newPage();
    try {
      const route=base+'/services/handyman-interiors-appliance-repairs/handymen/';
      await page.goto(route,{waitUntil:'load'});
      assert.equal(await page.locator('.handyman-task-grid > article').count(),10);
      assert.equal(await page.locator('details.handyman-topic-card[open]').count(),0);
      for(const id of ['outdoor-posts-and-wall-fixtures','pet-flaps-and-panel-type','floor-edge-movement-and-moisture','surface-cleaning-and-material-risk','older-residents-and-support-rails','patio-supports-and-eaves-material']) {
        const detail=page.locator('#'+id);
        await detail.locator('summary').focus(); await page.keyboard.press('Enter');
        assert.equal(await detail.getAttribute('open'),'');
        assert.ok(await detail.locator('p').first().isVisible());
        await page.keyboard.press('Space');
        assert.equal(await detail.getAttribute('open'),null);
      }
      await page.goto(route+'#older-residents-and-support-rails-placement-and-structural-fixing',{waitUntil:'load'});
      assert.equal(await page.locator('#older-residents-and-support-rails').getAttribute('open'),'');
      assert.ok(await page.locator('#older-residents-and-support-rails-placement-and-structural-fixing p').isVisible());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
    } finally { await context.close(); }
  }
});
