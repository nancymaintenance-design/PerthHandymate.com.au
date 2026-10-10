const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createBuildFixture, buildLocal } = require('./helpers/local-build');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
test('all 67 detail pages have Perth titles and unique task-specific questions', () => {
  const titles = new Set();
  for (const item of catalog.canonicalServices) {
    const html = fs.readFileSync(path.join(root, item.url, 'index.html'), 'utf8');
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert.match(title, /Perth/, item.slug);
    assert.ok(!titles.has(title), item.slug + ' duplicate title'); titles.add(title);
    const faq = html.match(/<section class="section shell service-questions">[\s\S]*?<\/section>/)[0];
    const questions = [...faq.matchAll(/<summary>(.*?)<\/summary>/g)].map(match => match[1]);
    assert.ok(questions.length >= 2, item.slug + ' lacks concrete questions');
    assert.equal(new Set(questions).size, questions.length, item.slug + ' duplicate questions');
    assert.doesNotMatch(faq, /What information helps confirm the scope\?|What work is typically included|covered by this service\?|What can change the recommended approach\?/);
  }
});
test('local distribution and source service pages are identical', t => {
  const fixture = createBuildFixture(t);
  const result = buildLocal(fixture);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const pages = new Set(['services/index.html', ...catalog.canonicalServices.map(x => x.url+'index.html'), ...catalog.canonicalServices.map(x => `services/${x.category}/index.html`)]);
  for (const file of pages) assert.equal(fs.readFileSync(path.join(fixture, 'dist', file), 'utf8'), fs.readFileSync(path.join(root,file),'utf8'), file);
});
test('all 31 committed research owners retain source content and rendered guide coverage', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'data/keyword-content-round.json'), 'utf8'));
  const guidePages = fs.readdirSync(path.join(root, 'guides')).filter(slug => fs.existsSync(path.join(root, 'guides', slug, 'index.html')))
    .map(slug => fs.readFileSync(path.join(root, 'guides', slug, 'index.html'), 'utf8'));
  assert.equal(data.clusters.length, 31);
  assert.deepEqual(data.clusters.map(cluster => cluster.owner).sort(), Array.from({ length: 31 }, (_, i) => `O${String(i + 1).padStart(2, '0')}`));
  for (const cluster of data.clusters) {
    assert.ok(cluster.heading && cluster.answer && cluster.scenario.length === 2, cluster.owner);
    const question = cluster.scenario[0].replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    assert.equal(guidePages.filter(html => html.includes(`<summary>${question}</summary>`)).length, 1, `${cluster.owner} scenario has one guide owner`);
  }
});
test('confirmed handyman scope includes eight actual service descriptions and contact routes', () => {
  const html = fs.readFileSync(path.join(root,'services/handyman-interiors-appliance-repairs/handymen/index.html'),'utf8');
  for (const id of ['sliding-door-repairs','clothesline-repairs','outdoor-fixtures','pet-door-installation','minor-floor-repairs','pressure-cleaning','grab-rail-installation','eaves-patio-repairs']) {
    const article = html.match(new RegExp(`<article id="${id}">[\\s\\S]*?<\\/article>`))?.[0];
    assert.ok(article, id);
    assert.match(article, /<h3>.+?<\/h3><p>.+?<\/p>/);
    assert.ok(!article.includes('<details>'),'service cards use descriptions, not separate FAQ blocks');
    assert.match(article, /href="\.\.\/\.\.\/\.\.\/guides\//);
  }
  const guide=fs.readFileSync(path.join(root,'guides/when-home-maintenance-needs-a-licensed-trade/index.html'),'utf8');
  assert.match(html,/data-preserve-search href="\.\.\/\.\.\/\.\.\/contact\/\?service=Handyman/);
  assert.match(guide, /Confirm funding eligibility, invoicing, registration requirements and approval/);
});
