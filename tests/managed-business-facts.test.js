const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

// Catches stale migrated facts after an authoritative JSON update, and overbroad
// replacements that would alter directions, unrelated links or office content.
test('normalizer continuously refreshes managed visible facts and schema without collateral edits', t => {
  const reports = path.resolve(root, '../reports/seo-optimization-local-2026-10-13');
  fs.mkdirSync(reports, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(reports, 'managed-facts-'));
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }));
  const facts = JSON.parse(fs.readFileSync(path.join(root, 'data/business-facts.json'), 'utf8'));
  facts.officeReception = 'Office reception: Monday–Sunday, 10:00–18:00 Perth local time.';
  facts.openingHoursSpecification.opens = '10:00';
  facts.openingHoursSpecification.closes = '18:00';
  facts.googleReviews = 'https://example.invalid/synthetic-reviews?source=test&kind=review';
  facts.sameAs = ['https://www.instagram.com/synthetic-test/', 'https://www.linkedin.com/in/synthetic-test/', 'https://www.facebook.com/synthetic-test/'];
  fs.mkdirSync(path.join(fixture, 'data'));
  fs.writeFileSync(path.join(fixture, 'data/business-facts.json'), JSON.stringify(facts));
  const routes = ['index.html', 'about/index.html', 'contact/index.html', 'services/handyman-interiors-appliance-repairs/handymen/index.html'];
  const extra = '<p id="unmanaged-office-note">Synthetic unrelated office note.</p><a id="unmanaged-review-link" href="https://maps.app.goo.gl/iqNh8cGNbaZhBuP17">Unmanaged saved reference</a><a id="unmanaged-social-link" href="https://www.linkedin.com/in/unrelated/">Other profile</a>';
  const originals = new Map();
  for (const route of routes) {
    const file = path.join(fixture, route);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Explicit synthetic fixture exercises optional managed paragraph refresh;
    // the live site intentionally keeps reception hours only in the shared footer.
    const optionalOffice = '<section id="office-reception"><h2>Office reception</h2><p id="unmanaged-within-office">Preserve this paragraph.</p><p>Monday–Sunday, 09:00–21:00 Perth local time.</p></section>';
    const original = fs.readFileSync(path.join(root, route), 'utf8').replace('</main>', `${optionalOffice}${extra}</main>`);
    fs.writeFileSync(file, original);
    originals.set(route, original);
  }
  const script = path.join(root, 'scripts/normalize-entity-graph.js');
  execFileSync(process.execPath, [script, fixture]);
  const first = new Map();
  for (const route of routes) {
    const html = fs.readFileSync(path.join(fixture, route), 'utf8');
    first.set(route, html);
    assert.match(html, /class="footer-office-hours">Office reception: Monday–Sunday, 10:00–18:00 Perth local time\.<\/p>/, route);
    if (!route.startsWith('services/')) assert.match(html, /id="office-reception">[\s\S]*?<p>Monday–Sunday, 10:00–18:00 Perth local time\.<\/p>/, route);
    const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(x => x[0]);
    for (const anchor of anchors) {
      const cls = anchor.match(/class="([^"]*)"/)?.[1].split(/\s+/) || [];
      if (cls.includes('hero-reviews') || cls.includes('footer-google-reviews') || /Read our Google reviews/.test(anchor)) assert.ok(anchor.includes('href="https://example.invalid/synthetic-reviews?source=test&amp;kind=review"'), route + ': managed reviews');
      for (const [name, url] of [['instagram', facts.sameAs[0]], ['linkedin', facts.sameAs[1]], ['facebook', facts.sameAs[2]]]) if (cls.includes('footer-' + name)) assert.ok(anchor.includes(`href="${url}"`), route + ': ' + name);
    }
    const graphs = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(([, json]) => { const b = JSON.parse(json); return b['@graph'] || [b]; });
    const office = graphs.find(x => x['@id'] === 'https://www.perthhandymate.com.au/#perth-office');
    assert.equal(office.openingHoursSpecification.opens, '10:00');
    assert.equal(office.openingHoursSpecification.closes, '18:00');
    for (const entity of graphs.filter(x => ['Organization', 'HomeAndConstructionBusiness'].includes(x['@type']))) assert.deepEqual(entity.sameAs, facts.sameAs);
    // Remove only allowed refresh targets; the entire remaining document must match.
    const unmanaged = text => text.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, '')
      .replace(/(<p class="footer-office-hours">)[^<]*(<\/p>)/g, '$1MANAGED$2')
      .replace(/<p>(?:Monday–Sunday, (?:09:00–21:00|10:00–18:00) Perth local time\.)<\/p>/g, '<p>MANAGED</p>')
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, anchor => /class="[^"]*\b(?:hero-reviews|footer-google-reviews|footer-instagram|footer-linkedin|footer-facebook)\b/.test(anchor) || /Read our Google reviews/.test(anchor) ? anchor.replace(/href="[^"]*"/, 'href="MANAGED"') : anchor);
    assert.equal(unmanaged(html), unmanaged(originals.get(route)), route + ': all unmanaged HTML preserved');
    assert.ok(html.includes(extra), route + ': unknown links preserved');
    const originalScripts = [...originals.get(route).matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(([, json]) => JSON.parse(json));
    for (const block of originalScripts.filter(x => !x['@graph'])) assert.ok(html.includes(JSON.stringify(block)), route + ': unrelated schema preserved');
  }
  execFileSync(process.execPath, [script, fixture]);
  for (const route of routes) assert.equal(fs.readFileSync(path.join(fixture, route), 'utf8'), first.get(route), route + ': idempotent');
});
