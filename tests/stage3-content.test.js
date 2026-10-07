const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'guides/property-manager-maintenance-coordination/index.html'), 'utf8');
const main = html.match(/<main[\s\S]*?<\/main>/)[0];

test('maintenance workflow distinguishes assessment authorisation, repair approval and pending work', () => {
  assert.match(main, /assessment authorisation/i);
  assert.match(main, /repair authorisation/i);
  assert.match(main, /temporary measures/i);
  assert.match(main, /reschedul/i);
  assert.match(main, /hidden damage/i);
});
test('mixed requests have triage and a completion record without changing canonical or FAQ agreement', () => {
  assert.match(main, /<table/);
  assert.match(main, /handover record/i);
  assert.match(html, /rel="canonical" href="https:\/\/www\.perthhandymate\.com\.au\/guides\/property-manager-maintenance-coordination\/"/);
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const faq = scripts.find(s => s['@type'] === 'FAQPage');
  for (const q of faq.mainEntity) {
    assert.ok(main.includes(q.name));
    assert.ok(main.includes(q.acceptedAnswer.text));
  }
});
test('maintenance coordination provides actual service and preparation routes', () => {
  for (const route of ['services/handyman-interiors-appliance-repairs/', 'guides/home-repair-priorities/', 'guides/prepare-before-home-repair-quote/', 'contact/']) {
    assert.ok(main.includes(`href="../../${route}"`), route);
    assert.ok(fs.existsSync(path.join(root, route, 'index.html')), route);
  }
});
