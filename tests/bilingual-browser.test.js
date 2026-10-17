const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadPlaywright,browserLaunchOptions}=require('./helpers/browser-runtime');
const base='http://127.0.0.1:'+Number(process.env.ELLIS_PREVIEW_PORT||4282);
const evidence=path.resolve(__dirname,'../../reports/bilingual-local-2026-10-16');
let browser;
test.before(async()=>{const pw=loadPlaywright();browser=await pw.chromium.launch(browserLaunchOptions(pw.chromium.executablePath()));});
test.after(async()=>{await browser?.close();});
async function pageFor(t,options={}){
  const context=await browser.newContext({viewport:{width:1440,height:960},...options});
  t.after(()=>context.close());
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage();page.setDefaultTimeout(7000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  t.after(()=>assert.deepEqual(errors,[],'no browser runtime errors'));
  return page;
}
test('desktop language links follow Contact and preserve the equivalent page, query and anchor',async t=>{
  const page=await pageFor(t);
  await page.goto(base+'/contact/?suburb=Fremantle#enquiry-form');
  const links=page.locator('#main-nav a');
  assert.equal(await links.nth(5).innerText(),'Contact Us');
  assert.equal(await links.nth(6).innerText(),'中文服务');
  await links.nth(6).click();
  assert.equal(page.url(),base+'/zh/contact/?suburb=Fremantle#enquiry-form');
  assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hans');
  await page.waitForFunction(()=>document.querySelector('[name="postcode"]').value==='Fremantle');
  assert.equal(await page.locator('[name="postcode"]').inputValue(),'Fremantle');
  await page.locator('[data-language-switch]').click();
  assert.equal(page.url(),base+'/contact/?suburb=Fremantle#enquiry-form');
});
test('Chinese search suggestions and query route to Chinese detail pages with canonical form values',async t=>{
  const page=await pageFor(t);await page.goto(base+'/zh/');
  await page.locator('[name="q"]').fill('抽屉');
  await page.locator('[name="postcode"]').fill('6000');
  const option=page.locator('[data-suggestions] button').first();await option.waitFor();
  assert.match(await option.innerText(),/[\u4e00-\u9fff]/);
  await option.click();await page.locator('[data-service-search] button[type="submit"]').click();
  await page.waitForURL('**/zh/services/**');
  assert.match(page.url(),/cabinet-wardrobe-repairs/);
  assert.ok(new URL(page.url()).searchParams.get('service').includes('Handyman'));
  assert.equal(new URL(page.url()).searchParams.get('postcode'),'6000');
});
test('Chinese IME composition does not navigate before composition is complete',async t=>{
  const page=await pageFor(t);await page.goto(base+'/zh/');
  const input=page.locator('[name="q"]');
  await input.dispatchEvent('compositionstart');await input.fill('抽屉');
  await page.locator('[data-service-search]').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.equal(page.url(),base+'/zh/');
  await input.dispatchEvent('compositionend');
  await page.locator('[data-suggestions] button').first().waitFor();
});
test('Chinese form validation, server errors, pending state and successful reply stay Chinese',async t=>{
  const page=await pageFor(t);await page.goto(base+'/zh/contact/');
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator(':focus').getAttribute('name'),'name');
  assert.equal(await page.locator('[data-error="name"]').innerText(),'请填写您的姓名。');
  for(const [name,value] of Object.entries({name:'测试用户',email:'test@example.com',phone:'0400 000 000',message:'厨房抽屉滑轨损坏，需要检查更换。'}))await page.locator(`[name="${name}"]`).fill(value);
  await page.locator('[name="service"]').selectOption({label:'家居小修、室内及家电维修'});
  assert.equal(await page.locator('[name="service"]').inputValue(),'Handyman, interiors & appliance repairs');
  await page.route('**/api/contact',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Please check the highlighted details and try again.',errors:{email:'Enter a valid email address of at most 254 characters.'}})}));
  await page.locator('[type="submit"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-error="email"]').textContent.includes('电子邮箱'));
  assert.equal(await page.locator('[name="message"]').inputValue(),'厨房抽屉滑轨损坏，需要检查更换。');
  await page.unroute('**/api/contact');
  let release;const pending=new Promise(resolve=>{release=resolve;});let submitted;
  await page.route('**/api/contact',async route=>{submitted=route.request().postDataJSON();await pending;await route.fulfill({status:201,contentType:'application/json',body:JSON.stringify({ok:true,message:'Thanks. Our customer service team will call you about your request.'})});});
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator('[type="submit"]').innerText(),'正在发送…');
  assert.equal(await page.locator('[type="submit"]').isDisabled(),true);
  release();await page.waitForFunction(()=>document.querySelector('[data-form-status]').textContent.includes('已收到'));
  assert.equal(submitted.service,'Handyman, interiors & appliance repairs');
  assert.equal(submitted.message,'厨房抽屉滑轨损坏，需要检查更换。');
  assert.equal(await page.locator('[type="submit"]').innerText(),'联系我们的团队');
});
test('Chinese mobile menu and no-JavaScript content remain accessible without overflow',async t=>{
  const page=await pageFor(t,{viewport:{width:390,height:844}});await page.goto(base+'/zh/guides/');
  await page.locator('[data-nav-toggle]').click();
  assert.equal(await page.locator('[data-nav-toggle]').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('[data-language-switch]').isVisible(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(evidence,'zh-guides-mobile.png'),fullPage:true});
  const nojs=await pageFor(t,{javaScriptEnabled:false});await nojs.goto(base+'/zh/contact/');
  assert.match(await nojs.locator('h1').innerText(),/珀斯/);
  assert.equal(await nojs.locator('[type="submit"]').isDisabled(),true);
  assert.equal(await nojs.locator('noscript a[href="tel:+61403069685"]').isVisible(),true);
  assert.equal(await nojs.locator('[data-language-switch]').getAttribute('href'),'/contact/');
});
test('representative Chinese desktop screens retain usable header, images and layout',async t=>{
  const page=await pageFor(t);
  for(const [route,name] of [['/zh/','zh-home-desktop'],['/zh/guides/','zh-guides-desktop'],['/zh/services/handyman-interiors-appliance-repairs/handymen/','zh-handyman-desktop'],['/zh/contact/','zh-contact-desktop']]){
    await page.goto(base+route);assert.equal(await page.locator('[data-language-switch]').isVisible(),true);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route);
    await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:route!=='/zh/'});
  }
});
