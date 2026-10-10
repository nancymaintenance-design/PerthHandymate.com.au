'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { editServiceHtml, replaceFaq } = require('../tools/service-content-round2');
const root = path.resolve(__dirname, '..');
const catalog = require('../data/service-catalog.json').canonicalServices;
const read = slug => fs.readFileSync(path.join(root, catalog.find(s => s.slug === slug).url, 'index.html'), 'utf8');
const page = html => html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)[0];
const outsideMain = html => html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, 'MAIN');

test('targeted service editing consolidates overlapping scenarios without losing the approved depth or price', () => {
  let before = read('window-repairs').replace('>Discuss window repairs</a>','>Describe this request</a>').replace('>Discuss window repairs</a>','>Arrange an assessment with Ellis</a>');
  if (!before.includes('id="keyword-map-repair-scenes"')) before = before.replace('<section class="section shell service-questions">','<section class="section shell" id="keyword-map-repair-scenes"><h2>Repeated window repair scene</h2><p>Legacy duplicate.</p></section><section class="section shell service-questions">');
  const after = editServiceHtml(before, {kind:'detail', slug:'window-repairs', title:'Window Repairs'});
  assert.doesNotMatch(page(after), /id="keyword-map-repair-scenes"/);
  assert.match(after, />Discuss window repairs<\/a>/);
  assert.match(after, /href="\.\.\/\.\.\/\.\.\/services\/doors-windows-glass-screens\/glass-glaziers\/"/);
  assert.equal(outsideMain(after), outsideMain(before), 'entities, canonical, global navigation and footer are untouched');
  assert.equal(after.match(/<div class="shell price-guide"[\s\S]*?<\/div>/)[0], before.match(/<div class="shell price-guide"[\s\S]*?<\/div>/)[0]);
  assert.equal(after.match(/id="service-work-options"[\s\S]*?<\/section>/)[0].replace(/>Discuss window repairs<\/a>/, '>Arrange an assessment with Ellis</a>'), before.match(/id="service-work-options"[\s\S]*?<\/section>/)[0]);
  assert.equal(editServiceHtml(after, {kind:'detail', slug:'window-repairs', title:'Window Repairs'}), after);
});

test('category editing replaces unhelpful generic questions with three distinct choosing and booking answers', () => {
  const before = fs.readFileSync(path.join(root, 'services/gardens-landscaping/index.html'),'utf8');
  const after = editServiceHtml(before, {kind:'category', slug:'gardens-landscaping'});
  assert.match(after, /<h1>Garden &amp; Landscaping Services in Perth<\/h1>/);
  assert.doesNotMatch(page(after), /Can I book this service directly online\?|Is this service available in every suburb\?/);
  assert.match(after, /href="\.\.\/\.\.\/services\/gardens-landscaping\/garden-clean-up\/"/);
  assert.match(after, /Photos and measurements are optional/);
  assert.equal([...after.matchAll(/<details>/g)].length, 3);
  assert.equal(editServiceHtml(after, {kind:'category', slug:'gardens-landscaping'}), after);
});

test('service hero CTA cannot be masked by an already updated scope CTA', () => {
  const source = read('window-repairs');
  const spec = {kind:'detail', slug:'window-repairs'};
  const hero = source.match(/<section class="page-hero service-hero">[\s\S]*?<\/section>/)[0];
  const cta = hero.match(/<a class="button"[^>]*>Discuss window repairs<\/a>/)[0];
  assert.throws(() => editServiceHtml(source.replace(hero, hero.replace(cta, '')), spec), /Missing hero assessment CTA/);
  assert.throws(() => editServiceHtml(source.replace(hero, hero.replace(cta, cta + cta)), spec), /Ambiguous hero assessment CTA/);
  const oldHero = source.replace(hero, hero.replace('>Discuss window repairs</a>', '>Describe this request</a>'));
  assert.equal(editServiceHtml(oldHero, spec), source, 'the untouched scope does not prevent completing the hero');
});

test('FAQ answer replacement updates existing FAQPage text to match linked visible answers', () => {
  const html='<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is this glass work?","acceptedAnswer":{"@type":"Answer","text":"Old answer."}}]}</script><main><details><summary>Is this glass work?</summary><p>Old answer.</p></details></main>';
  const answer='Yes. See <a href="/services/glass/">glass replacement</a> &amp; assessment.';
  const after=replaceFaq(html, 'Is this glass work?', answer);
  assert.ok(after.includes('<p>'+answer+'</p>'));
  const faq=JSON.parse(after.match(/<script[^>]*>(.*?)<\/script>/)[1]);
  assert.equal(faq.mainEntity[0].acceptedAnswer.text,'Yes. See glass replacement & assessment.');
  assert.equal(replaceFaq(after, 'Is this glass work?', answer),after);
  assert.throws(()=>replaceFaq('<main></main>', 'Is this glass work?',answer),/missing.*question/i);
});

test('editor refuses unknown page scopes and missing owned markup rather than damaging a page', () => {
  assert.throws(()=>editServiceHtml('<main><h1>Window</h1></main>', {kind:'detail',slug:'window-repairs',title:'Window Repairs'}), /missing/i);
  assert.throws(()=>editServiceHtml('<main></main>', {kind:'detail',slug:'made-up-service'}), /unknown/i);
});

test('all 77 reviewed service pages are stable and preserve concrete scope rather than a new repeated block', () => {
  const specs = [...catalog.map(s=>({file:s.url+'index.html',kind:'detail',slug:s.slug,title:s.title})),
    ...[...new Set(catalog.map(s=>s.category))].map(s=>({file:'services/'+s+'/index.html',kind:'category',slug:s})),
    {file:'services/index.html',kind:'hub'}];
  assert.equal(specs.length,77);
  for (const spec of specs) {
    const html=fs.readFileSync(path.join(root,spec.file),'utf8');
    assert.equal(editServiceHtml(html,spec),html,spec.file+' drifted from its bounded editorial edits');
    assert.doesNotMatch(page(html), /id="keyword-map-repair-scenes"|HM\d{4}|[\u3400-\u9fff]/,spec.file);
    if(spec.kind==='detail') {
      const depth=html.match(/<section[^>]*id="service-work-options"[^>]*>[\s\S]*?<\/section>/)[0];
      assert.ok(depth.includes('<article'),spec.slug+' retained task-level scope');
      assert.match(page(html),/written quote|written scope and quote/i,spec.slug);
    }
  }
});

test('new service links resolve to existing pages and anchors, with unique category choosing questions', () => {
  const {faqEdits,categories}=require('../tools/service-content-round2-copy');
  const questions=[];
  const blocks=[...Object.entries(faqEdits).map(([slug,qa])=>[catalog.find(s=>s.slug===slug).url,qa]),
    ...Object.entries(categories).map(([slug,c])=>['services/'+slug+'/',c.qa])];
  for(const [route,qa] of blocks)for(const [q,a] of qa){
    assert.doesNotMatch(a,/outsourc|referral|NDIS.?registered|guaranteed|licen[cs]e number/i);
    for(const [,href] of a.matchAll(/href="([^"]+)"/g)){
      const target=new URL(href,'https://www.perthhandymate.com.au/'+route);
      const file=path.join(root,target.pathname,'index.html');
      assert.ok(fs.existsSync(file),route+' -> '+target.pathname);
      if(target.hash)assert.ok(fs.readFileSync(file,'utf8').includes('id="'+target.hash.slice(1)+'"'),target.href);
    }
    if(route.split('/').filter(Boolean).length===2)questions.push(q);
  }
  assert.equal(questions.length,27);
  assert.equal(new Set(questions).size,27,'category answers address distinct decisions');
});

test('compact handyman page keeps six sections, nine advice links and explicit own licensed personnel', () => {
  const main=page(read('handymen'));
  assert.equal([...main.matchAll(/<section\b/g)].length,6);
  assert.equal([...main.matchAll(/<details>/g)].length,6);
  assert.equal([...main.match(/<div class="handyman-task-grid">[\s\S]*?<\/div>/)[0].matchAll(/href=/g)].length,9);
  assert.match(main,/own appropriately licensed personnel/);
  assert.match(main,/Photos, measurements and a repair list are optional/);
});
