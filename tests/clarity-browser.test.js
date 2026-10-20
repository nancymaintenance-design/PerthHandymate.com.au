const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),vm=require('node:vm');
const {loadPlaywright,browserLaunchOptions}=require('./helpers/browser-runtime');
const base='http://127.0.0.1:'+Number(process.env.ELLIS_PREVIEW_PORT||4282);
const evidence=path.resolve(__dirname,'../../reports/bilingual-local-2026-10-16');
let browser;
test.before(async()=>{const pw=loadPlaywright();browser=await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));});
test.after(async()=>browser?.close());
for(const locale of ['','/zh'])test(`requested clarity changes work in ${locale||'English'} at desktop and mobile`,async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+locale+'/');
    assert.equal(await page.locator('#repair-quote-process,#local-repair-requests').count(),0);
    assert.equal(await page.locator('.project-feature-list>.support-feature').count(),13);
    assert.equal(await page.locator('.home-guide-card').count(),12);
    assert.equal(await page.locator('.home-office-phone a').getAttribute('href'),'tel:+61403069685');
    assert.ok(await page.locator('.hero h1').evaluate(e=>e.getBoundingClientRect().height)<190);
    await page.screenshot({path:path.join(evidence,`clarity${locale?'zh':'en'}-hero.png`)});
    const track=page.locator('#home-guide-track');
    await page.locator('[data-guide-next]').click();
    await page.waitForFunction(()=>document.querySelector('#home-guide-track').scrollLeft>100);
    await track.focus();await page.keyboard.press('End');
    await page.waitForFunction(()=>document.querySelector('[data-guide-next]').disabled);
    await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.querySelector('#home-guide-track').scrollLeft<5);
    await page.locator('#repair-projects>.section-heading').screenshot({path:path.join(evidence,`clarity${locale?'zh':'en'}-case-heading.png`)});
    await page.locator('#repair-planning-guides').screenshot({path:path.join(evidence,`clarity${locale?'zh':'en'}-guides.png`)});
    await page.goto(base+locale+'/services/');
    assert.equal(await page.locator('#choose-repair-service').count(),0);
    const categories=await page.locator('.services-overview-cards h3 a').evaluateAll(a=>a.map(e=>({label:e.textContent.trim(),href:e.href})));
    assert.equal(categories.length,9);
    for(const category of categories){await page.goto(category.href);assert.equal((await page.locator('h1').innerText()).trim(),category.label);}
    await page.goto(base+locale+'/services/property-maintenance/');
    assert.equal(await page.locator('main>section:not([data-service-path-links])').count(),6,'retain the six approved service sections');
    assert.equal(await page.locator('main>[data-service-path-links]').count(),1,'one compact related-guide entry, not duplicated explanation sections');
    assert.equal(await page.locator('main details[open]').count(),0);
    await page.screenshot({path:path.join(evidence,`clarity${locale?'zh':'en'}-property.png`),fullPage:true});
    await page.goto(base+locale+'/services/handyman-interiors-appliance-repairs/handymen/');
    assert.equal(await page.locator('.handyman-task-grid>article').count(),10);
    assert.equal(await page.locator('.handyman-topic-card[open]').count(),0);
    await page.locator('#older-residents-and-support-rails>summary').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('#older-residents-and-support-rails').getAttribute('open'),'');
    await page.screenshot({path:path.join(evidence,`clarity${locale?'zh':'en'}-handyman.png`),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    for(const route of ['/','/services/','/services/property-maintenance/','/services/handyman-interiors-appliance-repairs/handymen/']){
      await page.goto(base+locale+route);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);
    }
    assert.deepEqual(errors,[]);
  }finally{await context.close();}
});
