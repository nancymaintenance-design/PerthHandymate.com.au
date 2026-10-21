const test=require('node:test');
const assert=require('node:assert/strict');
const {publicCopy}=require('../scripts/lib/customer-voice');

// Reintroducing the client-burden quote wording or a literal pronoun artefact breaks these contracts.
test('window quote explanation assigns written scope to us without making hourly prices all inclusive',()=>{
 const html=publicCopy('<p>Hourly installation labour and window supply per square metre are different price bases, not a complete installed-window total. Confirm measurement, supply, removal, disposal, sealing and finishing in the written quote.</p><p>A$40-50</p><span>Installation labour per hour</span><p>A$100-1,250</p><span>Selected window supply per m²</span>');
 assert.match(html,/We provide|we provide|we set out/i);assert.match(html,/priced separately|separate charges/i);assert.doesNotMatch(html,/Confirm measurement/);assert.match(html,/A\$40-50/);assert.match(html,/A\$100-1,250/);assert.match(html,/per hour/);assert.match(html,/per m²/);
});
test('Chinese contact and quote copy is a complete operator sentence',()=>{
 const html=publicCopy('<p>告诉我们 珀斯办事处待修事项、房屋位置及方便联系您的方式。</p><p>请要求我们在书面报价中确认适用的计价方式、相关费用及包含项目。</p>',true);
 assert.doesNotMatch(html,/告诉我们\s*珀斯办事处|请要求我们/);assert.match(html,/我们会在书面报价中列明/);
});
test('exact operator edits preserve safety actions, brand identity, prices, URLs and other speakers',()=>{
 const html='<p>Do not drill or cut an existing toughened-glass pane.</p><a href="/contact/?service=Window%20Installation">Contact</a><p>Ellis Services Group</p><p>A$40-50 per hour</p><blockquote><p>Ellis checks the work carefully.</p></blockquote>';
 const out=publicCopy(html);assert.match(out,/Do not drill or cut/);assert.match(out,/href="\/contact\/\?service=Window%20Installation"/);assert.match(out,/Ellis Services Group/);assert.match(out,/A\$40-50 per hour/);assert.match(out,/<blockquote><p>Ellis checks the work carefully\.<\/p><\/blockquote>/);
});
test('linked scope paragraphs are revised without dropping their real service links',()=>{
 const html=publicCopy('<p>Only work explicitly agreed in the quote is included. <a href="/services/building-renovation-structural/">Building work</a>, <a href="/services/planning-inspection-compliance/draftsmen/">drafting</a> and <a href="/services/planning-inspection-compliance/building-certifiers/">certification documentation</a> are distinct tasks. Confirm the project objective, access and documents you need so each stage can be scoped clearly.</p>');
 assert.match(html,/We set out the engineering work/);for(const url of ['/services/building-renovation-structural/','/services/planning-inspection-compliance/draftsmen/','/services/planning-inspection-compliance/building-certifiers/'])assert.ok(html.includes('href="'+url+'"'));
 assert.ok(html.indexOf('Related:')<html.indexOf('href="/services/planning-inspection-compliance/draftsmen/"'),'rewritten bilingual paragraphs keep matching link-node positions for the local editor');
});
test('marketing revision does not rewrite privacy terms even when they contain a copy artefact',()=>{
 const html='<html><head><link rel="canonical" href="https://www.perthhandymate.com.au/privacy/"></head><body><p>When you contact us Perth, you may provide your name.</p></body></html>';
 assert.match(publicCopy(html),/When you contact us Perth, you may provide your name/);
});
test('review corrections preserve the customer voice in FAQ questions',()=>{
 assert.match(publicCopy('<summary>What should I tell us about a circuit that keeps tripping?</summary>'),/tell your team/);
 assert.match(publicCopy('<summary>My apartment balcony door is jammed. What should I tell us?</summary>'),/What details should I provide/);
 assert.match(publicCopy('<summary>谁会来做 我们维修评估？</summary>',true),/谁会上门为我做维修评估/);
 assert.match(publicCopy('<p>Seven Perth-area entry points</p>'),/Perth service areas/);
});
test('unchanged language keeps its existing inline structure in paired grammar-only edits',()=>{
 const rule=require('../config/operator-copy-review.json').find(r=>r.en[0].includes('Photos are optional aids'));
 const html='<p>'+rule.en[0].replace('optional photos and clear repair descriptions','<a href="/guides/photos-and-clear-scope-for-home-repairs/">optional photos and clear repair descriptions</a>')+'</p>';
 assert.equal(publicCopy(html),html);
 const door=require('../config/operator-copy-review.json').find(r=>r.en[0].startsWith('A sound hinged door'));
 const translated='<p>'+door.zh[0].replace('门维修','<a href="/zh/services/doors-windows-glass-screens/door-repairs/">门维修</a>')+'</p>';
 const out=publicCopy(translated,true);
 assert.doesNotMatch(out,/相关内容：/,'grammar-only changes must not relocate existing links in either language');
 assert.match(out,/请向我们描述/);
});
