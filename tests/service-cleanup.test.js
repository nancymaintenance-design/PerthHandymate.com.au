'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{load}=require('cheerio');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.name==='index.html'?[dir+'/'+e.name]:[]);
test('every service ends its main content at the final contact band',()=>{
 const failures=[];
 for(const f of walk('services')){const $=load(read(f));if($('main .cta-band').last().nextAll().length)failures.push(f);}
 assert.deepEqual(failures,[],'No service explanation or FAQ may appear after the final contact action');
});
test('ordinary service pages keep their booking and detailed questions in one FAQ section',()=>{
 const failures=[];
 for(const f of walk('services')){if(/\/(handymen|property-maintenance)\/index.html$/.test(f))continue;const $=load(read(f));const sections=$('main > section').toArray().filter(e=>$(e).find('.accordion-list details').length);if(sections.length>1)failures.push(f);}
 assert.deepEqual(failures,[],'Educational expanders on the compact handyman/property pages are deliberately preserved');
});
test('door category answers repair versus installation once, with the correct existing owners',()=>{
 const $=load(read('services/doors-windows-glass-screens/index.html'));
 const choice=$('details#door-repair-or-installation');
 assert.equal(choice.length,1,'the decision belongs in FAQ, not a standalone oversized heading');
 for(const slug of ['door-repairs','door-installation','sliding-door-repairs'])assert.ok(choice.find('a').toArray().some(e=>$(e).attr('href').includes('/'+slug+'/')),slug);
 assert.equal($('main > section').filter((i,e)=>/A sliding door that drags|Door adjustment and hardware repairs/.test($(e).children('h2').text())).length,0);
});
test('category cleanup keeps immediate glass safety advice visible outside the FAQ',()=>{
 const $=load(read('services/doors-windows-glass-screens/index.html'));
 const warning=$('main aside.note').filter((i,e)=>$(e).text().includes('Broken or unstable glass'));
 assert.equal(warning.length,1,'removing a repeated task list must not remove its adjacent safety note');
 assert.equal(warning.parents('details').length,0);
});
test('cleanup preserves additional FAQ anchors, useful answers and runtime idempotence',()=>{
 const {cleanup}=require('../scripts/service-content-cleanup');
 const input='<link rel="canonical" href="https://www.perthhandymate.com.au/services/gardens-landscaping/garden-clean-up/"><main><section class="section shell service-questions"><h2>Questions</h2><div class="accordion-list"><details><summary>What is included?</summary><p>Agree the work.</p></details></div></section><section class="cta-band"><a href="/contact/">Contact</a></section><section class="section shell service-questions" id="assessment-questions"><h2>More questions</h2><div class="accordion-list"><details><summary>What about waste?</summary><p>Confirm collection and disposal.</p></details></div></section></main>';
 const after=cleanup(input),$=load(after);
 assert.equal($('main > section:has(details)').length,1);
 assert.equal($('#assessment-questions details').length,1);
 assert.equal($('.accordion-list').length,1,'the merged questions share one disclosure list, not stacked unstyled lists');
 assert.equal($('summary').length,2);
 assert.match($('main').text(),/Confirm collection and disposal/);
 assert.equal($('main > section').last().hasClass('cta-band'),true);
 assert.equal(cleanup(after),after);
 assert.equal(cleanup('<main><details>Unscoped fixture</details></main>'),'<main><details>Unscoped fixture</details></main>');
});
test('rerunning the cleanup cannot remove a merged FAQ or duplicate anchors',()=>{
 const {cleanup}=require('../scripts/service-content-cleanup');
 for(const f of walk('services')){const html=read(f),after=cleanup(html);assert.equal(after,html,f+' cleanup drift');const $=load(after),ids=$('[id]').toArray().map(e=>$(e).attr('id'));assert.equal(new Set(ids).size,ids.length,f+' duplicate fragment');}
});
