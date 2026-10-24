const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {load}=require('cheerio');
const root=path.resolve(__dirname,'..');
const page=slug=>load(fs.readFileSync(path.join(root,'services/doors-windows-glass-screens',slug,'index.html'),'utf8'));
// Catches a repair enquiry being routed to the mixed-task anchor instead of the existing repair owner.
test('ordinary door repair choices resolve to the dedicated door repair service',()=>{
 const doc=page('door-installation');const links=doc('main a').toArray().filter(e=>/ordinary door repair assessment|internal-door adjustment/i.test(doc(e).text()));
 assert.equal(links.length,2);for(const e of links)assert.equal(new URL(doc(e).attr('href'),'https://www.perthhandymate.com.au/services/doors-windows-glass-screens/door-installation/').pathname,'/services/doors-windows-glass-screens/door-repairs/');
});
// Catches a window advice link promising an unrelated carpet/door-only scenario.
test('window advice link describes windows and resolves to a real guide section',()=>{
 const doc=page('window-repairs'),link=doc('#repair-planning-guides a').first();assert.match(link.text(),/window/i);
 const target=new URL(link.attr('href'),'https://www.perthhandymate.com.au/services/doors-windows-glass-screens/window-repairs/');
 const guide=load(fs.readFileSync(path.join(root,target.pathname,'index.html'),'utf8'));assert.ok(target.hash);assert.equal(guide(target.hash).length,1);
});
// Catches repeated assessment blocks reappearing after legacy writers are run.
test('window and slider decision details are grouped with scope rather than repeated in separate sections',()=>{
 for(const slug of ['window-repairs','sliding-door-repairs']){const doc=page(slug);assert.equal(doc('section#repair-assessment-details').length,0);assert.equal(doc('#repair-assessment-details').length,1);assert.equal(doc('section#assessment-questions').length,0);assert.ok(doc('#assessment-questions details').length>=4);assert.ok(doc('#assessment-questions details').length<=(slug==='window-repairs'?6:5));if(slug==='window-repairs')assert.equal(doc('#assessment-questions summary').toArray().filter(e=>doc(e).text()==='What information helps with a rental or strata window repair?').length,1);}
});
// Catches a repeated maintenance pass duplicating headings, questions or invitation blocks.
test('bounded service owner is repeatable and rejects missing owned content',()=>{
 const {reviseService}=require('../scripts/service-gsc-clarity');
 for(const slug of ['window-repairs','window-installation','door-installation','sliding-door-repairs','shower-screens']){const html=fs.readFileSync(path.join(root,'services/doors-windows-glass-screens',slug,'index.html'),'utf8');assert.equal(reviseService(html),html,slug);assert.equal(reviseService(reviseService(html)),html);}
 const broken=fs.readFileSync(path.join(root,'services/doors-windows-glass-screens/window-repairs/index.html'),'utf8').replace('id="timber-window-moisture-and-hardware"','id="missing-owned-content"');
 assert.throws(()=>reviseService(broken),/timber decisions/);
});
// Catches losing existing fragment destinations when splitting a service article into smaller topics.
test('installation and shower repair owner fragments remain usable',()=>{
 assert.equal(page('door-installation')('#door-installation-scope').length,1);
 assert.equal(page('shower-screens')('#shower-screen-repair-options').length,1);
});
