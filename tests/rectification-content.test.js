const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const hm = 'services/handyman-interiors-appliance-repairs/handymen/index.html';

// Catches migrated synonyms being appended beside an existing answer to the same decision.
test('migrated repair FAQs merge demonstrated overlaps and retain unique safety details',()=>{
  const cases=[
    ['services/roofing-gutters-exterior/gutter-services/index.html',/overflow.*cleaning|overflow.*leaves/i,[/outlet size/i,/light or heavy rain/i,/drainage/i]],
    ['services/doors-windows-glass-screens/fly-screens/index.html',/replace.*mesh.*frame/i,[/corners/i,/spline/i,/security screen/i]],
    ['services/handyman-interiors-appliance-repairs/clothesline-repairs-installation/index.html',/repair.*replacement|repaired rather than replaced/i,[/compatible parts/i,/winds or folds/i,/purchases/i]],
    ['services/handyman-interiors-appliance-repairs/clothesline-repairs-installation/index.html',/loose clothesline bracket|coming loose from brickwork/i,[/unstable/i,/retensioning/i,/wall or post/i]],
  ];
  for(const [file,intent,details] of cases){
    const matches=[...read(file).matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g)].filter(m=>intent.test(m[1]));
    assert.equal(matches.length,1,file+' has one answer for '+intent);
    for(const detail of details)assert.match(matches[0][2],detail,file+' retains useful distinction');
  }
});

// Catches unmapped migration, alias duplication, or dropped distinctive approval/material facts.
test('all migrated intents resolve once and merged owners retain their practical distinctions',()=>{
  const data=require('../data/service-guide-faq.json'),mapping=require('../data/service-guide-faq-owners.json');
  const sources=Object.values(data).flat().map(s=>s.match(/<summary>(.*?)<\/summary>/)[1]);
  assert.equal(sources.length,26);assert.deepEqual(Object.keys(mapping.questionOwners).sort(),sources.sort());
  for(const [route,items] of Object.entries(data)){
    const html=read(route.slice(1)+'index.html');
    const questions=[...html.matchAll(/<summary>(.*?)<\/summary>/g)].map(m=>m[1]);
    // Consolidated task disclosures retain these educational answers as a headed
    // paragraph inside the decision, rather than a second independent FAQ.
    if(route==='/services/handyman-interiors-appliance-repairs/handymen/')questions.push(...[...html.matchAll(/<div class="handyman-explanation"><h4>(.*?)<\/h4>/g)].map(m=>m[1]));
    for(const item of items){
      const source=item.match(/<summary>(.*?)<\/summary>/)[1],owner=mapping.questionOwners[source];
      if(route==='/services/property-maintenance/'){
        const id=/overseas/i.test(source)?'remote-owners-and-multiple-properties':'maintenance-plans';
        assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,source+' has one current service-content owner');
        assert.ok(!questions.includes(source)&&!questions.includes(owner),source+' is represented as practical service content without a duplicate FAQ');
      }else{
        assert.equal(questions.filter(q=>q===owner).length,1,source+' has one current owner');
        if(source!==owner)assert.ok(!questions.includes(source),source+' alias not appended');
      }
    }
  }
  const checks=[
    ['Can you repair or replace damaged skirting boards and architraves?',[/profile/i,/matching timber/i,/moisture/i,/finish/i]],
    ['What needs checking before a letterbox post is installed?',[/boundaries/i,/underground services/i,/old post/i]],
    ['Why do outdoor wall fixings loosen over time?',[/corrosion|movement/i,/supporting surface/i,/Retightening.*cause/i]],
    ['Why is laminate lifting at its edges?',[/moisture/i,/joint damage|uneven backing/i,/underlying problem/i]],
    ['Should moisture damage be addressed before floorboard replacement?',[/moisture source/i,/substrate/i,/cause.*resolved/i]],
    ['Can pressure cleaning damage pavers or grout?',[/jointing/i,/unsuitable method/i,/drainage/i,/separate scope/i]],
    ['Can loose or damaged timber palings be replaced individually?',[/posts and rails/i,/shared boundary/i,/approval/i]],
    ['Can a sagging timber side gate be repaired without replacement?',[/after rain/i,/pool gates/i,/powered gates/i,/latch alone/i]],
    ['Should damaged boards be addressed before oiling?',[/unstable/i,/supports/i,/screws/i,/structural support/i]],
    ['What do you need to assess gutter cleaning on a single-storey home?',[/safe access/i,/do not climb/i,/separate quote/i]],
    ['Can you quote for cat-damaged flyscreens before a rental inspection?',[/approve/i,/access/i,/timing/i]]
  ];
  const all=Object.keys(data).map(route=>read(route.slice(1)+'index.html')).join('');
  const answers=[...all.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g),...all.matchAll(/<div class="handyman-explanation"><h4>(.*?)<\/h4>([\s\S]*?)<\/div>/g)];
  for(const [question,patterns] of checks){const answer=answers.find(m=>m[1]===question)?.[2];assert.ok(answer,question);for(const pattern of patterns)assert.match(answer,pattern,question);}
  const property=read('services/property-maintenance/index.html');
  const plans=property.match(/<section[^>]*id="maintenance-plans"[^>]*>[\s\S]*?<\/section>/)?.[0];
  assert.ok(plans,'ongoing maintenance remains in the service plans');
  for(const distinction of [/approval/i,/specialist/i,/one-off/i,/preferred interval/i,/enquiry does not establish ongoing attendance/i])assert.match(plans,distinction,'routine maintenance retains its approvals and attendance limits');
  const remote=property.match(/<details[^>]*id="remote-owners-and-multiple-properties"[^>]*>[\s\S]*?<\/details>/)?.[0];
  assert.ok(remote,'overseas-owner arrangements remain in the relevant plan disclosure');
  for(const distinction of [/local access contact/i,/approves quotes and variations/i,/completion photos/i,/before booking/i])assert.match(remote,distinction,'remote owners retain access, spending and reporting decisions');
  assert.match(property,/Reporting a fault or opening the property does not authorise repairs or extra spending/,'access does not approve repairs');
});

// Catches duplicate related-list containers and loss of useful destinations during merging.
test('guide related choices use one list and preserve every unique destination',()=>{
  const bodies=require('../data/guide-library-body.json');
  const old=JSON.parse(execFileSync('git',['show','6159aecc8176df5dd783c412930c7cb1843f17f6:data/guide-library-body.json'],{cwd:root,encoding:'utf8'}));
  const lists=s=>[...s.matchAll(/<section\b[^>]*><h2>Related (?:Repair Services &amp; Guides|repair services)<\/h2>[\s\S]*?<\/section>/g)].map(m=>m[0]);
  const links=s=>[...new Set([...s.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))].sort();
  for(const slug of Object.keys(bodies)){
    assert.ok(lists(bodies[slug].bodyHtml).length<=1,slug+' duplicate related headings');
    assert.deepEqual(links(lists(bodies[slug].bodyHtml).join('')),links(lists(old[slug].bodyHtml).join('')),slug+' useful destinations retained');
    assert.ok(!bodies[slug].bodyHtml.includes('>the related small-repair explanation</a>'),slug+' distinguish linked topics');
  }
});

// Catches a deep diagnostic answer returning inside a task-selection card.
test('handyman cards separate concise selection from detailed safe-scope advice', () => {
  const h = read(hm), grid = h.match(/<div class="handyman-task-grid">([\s\S]*?)<\/div>/)[1];
  assert.equal([...grid.matchAll(/<article /g)].length, 10);
  assert.doesNotMatch(grid, /<h4>/);
  for (const id of ['pet-flaps-and-panel-type', 'surface-cleaning-and-material-risk', 'older-residents-and-support-rails']) {
    assert.ok(h.includes(`id="${id}"`));
    assert.ok(!grid.includes(`id="${id}"`));
  }
  assert.match(h, /toughened-glass|toughened glass/i);
  assert.match(h, /must not be pressure cleaned/);
  assert.match(h, /towel rail is not a substitute/);
});
// Catches the old compact writer silently deleting later substantive anchors.
test('handyman canonical writer preserves current decisions and is idempotent', () => {
  const current = read(hm), render = require('../tools/compact-handyman-page');
  const after = render(current);
  assert.equal(after, current);
  assert.equal(render(after), after);
});

// Catches repeating the same photos/assessment invitation inside service decision prose.
test('service decision prose collects generic preparation invitations into related reading', () => {
  const h=read('services/doors-windows-glass-screens/window-repairs/index.html');
  assert.ok(!h.includes('<p>For related preparation, read '));
  assert.ok(h.includes('/guides/prepare-before-home-repair-quote/'));
  assert.match(h, /broken|loose|unsuitable glass/i);
});
// Catches unrelated job selection depending on a suburb's array position.
test('region location selection is independent of repair type and retains query prefill', () => {
  const { areas } = require('../tools/render-regions');
  for (const a of areas) {
    const h = read(`areas/${a.slug}/index.html`);
    assert.match(h, /id="choose-your-suburb"/);
    for (const suburb of a.suburbs) assert.ok(h.includes(`contact/?suburb=${encodeURIComponent(suburb)}`), suburb);
    const choices = h.match(/<section[^>]+id="suburb-repair-links"[\s\S]*?<\/section>/)[0];
    for (const route of ['door-repairs', 'window-repairs', 'cabinet-wardrobe-repairs', 'gutter-services', 'plasterers', 'fly-screens']) assert.ok(choices.includes('/' + route + '/'), a.slug + route);
  }
});
// Catches an expanding unrelated FAQ catalogue replacing the seasonal checklist.
test('seasonal guide keeps rainwater exterior and indoor checklist with a small seasonal FAQ', () => {
  const h = read('guides/seasonal-home-maintenance-australia/index.html');
  for (const id of ['rainwater-checks', 'exterior-checks', 'indoor-checks', 'seasonal-checklist']) assert.ok(h.includes(`id="${id}"`), id);
  const faq = [...h.matchAll(/<details\b/g)];
  assert.ok(faq.length <= 6 && faq.length >= 3, faq.length + ' FAQs');
  assert.match(h, /ground.level|safe ground/);
  assert.match(h, /asbestos|unidentified older material/);
});
// Catches deletion, reordering or image reduction in the thirteen home groups.
test('home jump links bypass all thirteen preserved full-size alternating cases', () => {
  const h = read('index.html');
  const before = execFileSync('git', ['show', '3d05ecdd3aed27bcf5533082a5a308d4323fd140:index.html'], { cwd: root, encoding: 'utf8' });
  const groups = source => source.match(/<div class="project-feature-list">([\s\S]*?)<\/section>/)[0];
  assert.equal(groups(h).replace(/<h3>/g,'<h2>').replace(/<\/h3>/g,'</h2>'), groups(before));
  assert.equal([...groups(h).matchAll(/class="support-feature(?: |")/g)].length, 13);
  const nav = h.match(/<nav class="quick-paths"[\s\S]*?<\/nav>/)[0];
  for (const id of ['repair-planning-guides', 'contact-team']) {
    assert.ok(nav.includes(`href="#${id}"`)); assert.ok(h.includes(`id="${id}"`));
  }
  assert.equal([...h.matchAll(/id="repair-planning-guides"/g)].length, 1);
});

// Catches sending a repair-first home choice to an installation-first owner.
test('home door repair choice opens the existing repair service', () => {
  const h=read('index.html');
  assert.match(h, /href="\.\/services\/doors-windows-glass-screens\/door-repairs\/">Door repairs<\/a>/);
  assert.ok(!/href="[^\"]*door-installation\/">Door repairs/.test(h));
});

// Catches a current writer reintroducing removed content or duplicating owner sections.
test('current content writers converge without changing protected routes or term ownership', () => {
  const {renderGuide,guides}=require('../tools/render-guide-library');
  const {renderRegion,areas}=require('../tools/render-regions');
  const {consolidateService,consolidateHome,consolidateDirectory}=require('../tools/consolidate-content');
  for(const [file,render] of [['index.html',consolidateHome],['services/index.html',h=>consolidateDirectory(consolidateService(h))],...guides.map(g=>[`guides/${g.slug}/index.html`,h=>renderGuide(h,g.slug)]),...areas.map(a=>[`areas/${a.slug}/index.html`,h=>renderRegion(h,a)])]){
    const current=read(file);assert.equal(render(current),current,file);assert.equal(render(render(current)),current,file+' second pass');
    const ids=[...current.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicated owner');
  }
  const before=execFileSync('git',['show','3d05ecdd3aed27bcf5533082a5a308d4323fd140:docs/seo/content-round2/term-routing.json'],{cwd:root});
  // Git stores LF while this Windows checkout uses CRLF. Compare the unchanged
  // tracked content without generating a huge Buffer diff for line endings.
  assert.equal(read('docs/seo/content-round2/term-routing.json').replace(/\r\n/g,'\n'),before.toString('utf8'));
  assert.equal([...read('sitemap.xml').matchAll(/<loc>/g)].length,126);
});
