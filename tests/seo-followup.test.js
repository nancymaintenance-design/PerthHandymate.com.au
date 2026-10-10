const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('contact page loads analytics before the submission handler',()=>{
 const html=fs.readFileSync(path.join(root,'contact/index.html'),'utf8');
 assert.ok(html.includes('/analytics.js'));
 assert.ok(html.indexOf('/analytics.js')<html.indexOf('/site.js'));
});
test('conversion tracking excludes preview traffic and customer data',()=>{
 const run=hostname=>{const events=[];const context={window:{location:{hostname,pathname:'/contact/'},gtag:(...args)=>events.push(args)}};vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/analytics.js'),'utf8'),context);context.window.EllisAnalytics.track('generate_lead',{name:'Private',email:'private@example.com',method:'contact_form'});return events;};
 assert.equal(run('127.0.0.1').length,0);
 const events=run('www.perthhandymate.com.au');assert.equal(events.length,1);assert.equal(events[0][1],'generate_lead');assert.deepEqual(JSON.parse(JSON.stringify(events[0][2])),{method:'contact_form',page_path:'/contact/'});
});
test('failed contact responses do not count as successful leads',()=>{
 const events=[],context={window:{location:{hostname:'www.perthhandymate.com.au',pathname:'/contact/'},gtag:(...args)=>events.push(args)}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/analytics.js'),'utf8'),context);
 context.window.EllisAnalytics.contactResult(false);context.window.EllisAnalytics.contactResult(true);
 assert.deepEqual(events.map(x=>x[1]),['contact_form_error','generate_lead']);
});
test('homepage hero has smaller responsive image alternatives and is not lazy loaded',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),tag=html.match(/<img class="hero-media"[^>]*>/)[0];
 assert.match(tag,/srcset=/);assert.match(tag,/fetchpriority="high"/);assert.doesNotMatch(tag,/loading="lazy"/);
 const file=tag.match(/src="([^"]*)"/)[1];assert.ok(fs.statSync(path.join(root,file)).size<350*1024);
 for(const name of ['480','960','1440'])assert.ok(fs.existsSync(path.join(root,`assets/images/optimized/hero-homepage-v2-${name}.webp`)));
});
test('service breadcrumbs resolve to production URLs and reference the same business identity',()=>{
 const html=fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
 const crumbs=blocks.find(x=>x['@type']==='BreadcrumbList');assert.ok(crumbs);assert.equal(crumbs.itemListElement[0].item,'https://www.perthhandymate.com.au/');assert.equal(crumbs.itemListElement.at(-1).item,'https://www.perthhandymate.com.au/services/handyman-interiors-appliance-repairs/handymen/');
 const org=blocks.flatMap(x=>x['@graph']||[x]).find(x=>x['@type']==='Organization');assert.equal(org['@id'],'https://www.perthhandymate.com.au/#organization');
});
