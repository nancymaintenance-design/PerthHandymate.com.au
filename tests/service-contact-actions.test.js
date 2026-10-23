const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const {loadPlaywright,browserLaunchOptions}=require('./helpers/browser-runtime');
const base='http://127.0.0.1:'+Number(process.env.ELLIS_PREVIEW_PORT||4287);

test('service urgency strip offers the verified phone instead of an external review link in both languages',()=>{
 for(const prefix of ['','zh/']){const $=load(fs.readFileSync(path.join(__dirname,'../dist',prefix,'services/index.html'),'utf8'));
  const link=$('.availability-strip .text-link');assert.equal(link.length,1);assert.equal(link.attr('href'),'tel:+61403069685');assert.match(link.text(),/0403 069 685/);assert.equal(link.attr('target'),undefined);
  assert.equal($('footer a').filter((_,e)=>($(e).attr('href')||'').includes('maps.app.goo.gl')).length,1,'the footer review link is outside this change');
 }
});

test('existing contact CTA retains its style and position without wrapping English or Chinese labels',async()=>{
 const {chromium}=loadPlaywright(),browser=await chromium.launch(browserLaunchOptions(chromium.executablePath()));
 try{for(const prefix of ['','/zh'])for(const width of [360,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:960}});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  assert.equal((await page.goto(base+prefix+'/services/')).status(),200);
  const button=page.locator('.cta-band .button-light');assert.equal(await button.count(),1);
  const geometry=await button.evaluate(e=>{const s=getComputedStyle(e),r=document.createRange();r.selectNodeContents(e);return {whiteSpace:s.whiteSpace,shrink:s.flexShrink,lines:[...r.getClientRects()].length,color:s.color,background:s.backgroundColor,height:e.getBoundingClientRect().height,layout:getComputedStyle(e.parentElement).flexDirection,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.equal(geometry.whiteSpace,'nowrap');assert.equal(geometry.shrink,'0');assert.equal(geometry.lines,1);assert.equal(geometry.overflow,false);assert.ok(geometry.height>=44);assert.equal(geometry.background,'rgb(255, 255, 255)');assert.equal(geometry.layout,width<=700?'column':'row','existing responsive split layout must not change');
  await button.focus();assert.equal(await button.evaluate(e=>e===document.activeElement),true);await button.click();await page.waitForLoadState();assert.equal(new URL(page.url()).pathname,prefix+'/contact/');await page.close();
 }}finally{await browser.close();}
});

test('case and service contact actions retain a single readable line without losing their prefilled destination',async()=>{
 const {chromium}=loadPlaywright(),browser=await chromium.launch(browserLaunchOptions(chromium.executablePath()));
 try{for(const prefix of ['','/zh'])for(const width of [320,768,1440])for(const route of ['/projects/exterior-timber-window-door-repair/','/services/handyman-interiors-appliance-repairs/rangehood-installation/']){
  const page=await browser.newPage({viewport:{width,height:960}});await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  await page.goto(base+prefix+route,{waitUntil:'load'});const action=page.locator('.cta-band a.button');
  assert.equal(await action.count(),1);assert.equal(await action.innerText(),prefix?'联系我们':'Contact Us');
  const geometry=await action.evaluate(e=>{const s=getComputedStyle(e),r=document.createRange();r.selectNodeContents(e);return {lines:r.getClientRects().length,width:e.getBoundingClientRect().width,overflow:e.scrollWidth>e.clientWidth+1,shrink:s.flexShrink,whiteSpace:s.whiteSpace,layout:getComputedStyle(e.parentElement).flexDirection};});
  assert.equal(geometry.lines,1);assert.equal(geometry.overflow,false);assert.equal(geometry.whiteSpace,'nowrap');assert.equal(geometry.shrink,'0');assert.equal(geometry.layout,width<=700?'column':'row');
  const target=await action.getAttribute('href');assert.match(target,/contact\//);assert.match(target,/service=/);await action.focus();assert.equal(await action.evaluate(e=>e===document.activeElement),true);
  await action.click();await page.waitForLoadState();assert.equal(new URL(page.url()).pathname,prefix+'/contact/');assert.equal(new URL(page.url()).searchParams.get('service'),new URL(target,base+prefix+route).searchParams.get('service'));await page.close();
 }}finally{await browser.close();}
});
