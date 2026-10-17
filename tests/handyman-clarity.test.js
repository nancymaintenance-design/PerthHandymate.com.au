'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'services/handyman-interiors-appliance-repairs/handymen/index.html'), 'utf8');
const renderer = require('../tools/compact-handyman-page');
test('ten original task cards lead to closed topic detail cards and maintenance stays idempotent', () => {
  const tasks = page.match(/<div class="handyman-task-grid">[\s\S]*?<\/div>/)[0];
  assert.equal([...tasks.matchAll(/<article\b/g)].length,10);
  const topics = [...page.matchAll(/<details class="handyman-topic-card" id="([^"]+)"><summary><h3>(.*?)<\/h3><\/summary>/g)];
  assert.equal(topics.length,12);
  assert.equal(new Set(topics.map(m=>m[1])).size,12);
  assert.doesNotMatch(page, /<details class="handyman-topic-card"[^>]*\bopen\b/);
  assert.equal(renderer(page).trim(),page.trim());
  assert.equal(renderer(renderer(page)),renderer(page));
});
test('educational answers remain in associated service prose while FAQ schema contains service questions only', () => {
  const faq = page.match(/<section[^>]*id="maintenance-task-questions"[\s\S]*?<\/section>/)[0];
  assert.equal([...faq.matchAll(/<details>/g)].length,7);
  for (const question of [
    'Why do outdoor wall fixings loosen over time?',
    'Why is laminate lifting at its edges?',
    'Should moisture damage be addressed before floorboard replacement?',
    'Can pressure cleaning damage pavers or grout?'
  ]) {
    assert.ok(page.includes('<h4>'+question+'</h4>'));
    assert.ok(!faq.includes(question));
  }
  const schema = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map(m=>JSON.parse(m[1])).flatMap(v=>v['@graph']||[v]).find(v=>v['@type']==='FAQPage');
  assert.equal(schema.mainEntity.length,13);
  assert.ok(schema.mainEntity.every(v=>v.name.endsWith('?')));
  for(const marker of ['the manufacturer’s toughened-glass guidance','WorkSafe asbestos guidance','NDIS home-modification guidance']) assert.ok(page.includes(marker));
});
test('legacy topic and nested fragment links open their disclosure on load and repeated clicks', () => {
  const parent = {tagName:'DETAILS',open:false,parentElement:null};
  const nested = {tagName:'DIV',parentElement:parent,scrollIntoView(){ this.scrolled=true; }};
  const events = {}, hashEvents = {};
  const context = {
    location:{hash:'#older-residents-and-support-rails-placement-and-structural-fixing'},
    document:{getElementById:id=>id==='older-residents-and-support-rails-placement-and-structural-fixing'?nested:null,
      addEventListener:(name,callback)=>events[name]=callback},
    window:{addEventListener:(name,callback)=>hashEvents[name]=callback},
    requestAnimationFrame:callback=>callback()
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/handyman-clarity.js'),'utf8'),context);
  assert.equal(parent.open,true);
  assert.equal(nested.scrolled,true);
  parent.open=false;
  events.click({target:{closest:()=>({hash:context.location.hash})}});
  assert.equal(parent.open,true);
  context.location.hash='#bad%zz'; assert.doesNotThrow(()=>hashEvents.hashchange());
  for(const id of ['older-residents-and-support-rails','older-residents-and-support-rails-placement-and-structural-fixing','outdoor-posts-and-wall-fixtures','quote-inclusions-and-business-checks','requested-deadlines-and-immediate-danger']) assert.ok(page.includes('id="'+id+'"'));
});
