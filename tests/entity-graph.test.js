const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const organizationId = 'https://www.perthhandymate.com.au/#organization';
const officeId = 'https://www.perthhandymate.com.au/#perth-office';
const sentence = "Regulated work is completed by Ellis's own appropriately licensed team.";
const publicDirectories = ['about', 'areas', 'contact', 'faq', 'guides', 'privacy', 'projects', 'services'];
const regulatedPages = [
  'electrical-plumbing-gas-air-conditioning',
  'electrical-plumbing-gas-air-conditioning/electricians',
  'electrical-plumbing-gas-air-conditioning/plumbers',
  'electrical-plumbing-gas-air-conditioning/gas-fitters',
  'electrical-plumbing-gas-air-conditioning/air-conditioning',
  'cleaning-removals-pest-hazard/asbestos-removal',
  'building-renovation-structural',
  'building-renovation-structural/builders',
  'building-renovation-structural/home-renovators',
  'building-renovation-structural/restumping',
  'building-renovation-structural/demolition',
  'planning-inspection-compliance/structural-engineers',
];

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

function blocks(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => JSON.parse(match[1]));
}

function nodes(html) {
  return blocks(html).flatMap(block => block['@graph'] || [block]);
}

test('all public pages resolve the same organization and Perth operating entity', () => {
  const pages = ['index.html', '404.html'].map(file => path.join(root, file));
  for (const directory of publicDirectories) pages.push(...htmlFiles(path.join(root, directory)));
  assert.ok(pages.length >= 114);
  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const graph = nodes(html);
    const organizations = graph.filter(node => node['@type'] === 'Organization');
    const offices = graph.filter(node => node['@type'] === 'HomeAndConstructionBusiness');
    assert.equal(organizations.length, 1, `${file}: one organization`);
    assert.equal(offices.length, 1, `${file}: one operating entity`);
    assert.equal(organizations[0]['@id'], organizationId, file);
    assert.equal(offices[0]['@id'], officeId, file);
    assert.deepEqual(offices[0].parentOrganization, { '@id': organizationId }, file);
    assert.doesNotMatch(JSON.stringify(graph), /#business/, file);
    assert.equal(graph.filter(node => ['Organization', 'LocalBusiness', 'HomeAndConstructionBusiness'].includes(node['@type'])).length, 2, file);
  }
});

test('every service names the Perth office as provider', () => {
  let serviceCount = 0;
  for (const file of htmlFiles(path.join(root, 'services'))) {
    for (const service of nodes(fs.readFileSync(file, 'utf8')).filter(node => node['@type'] === 'Service')) {
      serviceCount++;
      assert.deepEqual(service.provider, { '@id': officeId }, file);
      assert.equal(service.brand, undefined, file);
      assert.deepEqual(service.areaServed.map(area => area.name), ['Perth metropolitan area'], file);
    }
  }
  assert.equal(serviceCount, 76);
});

test('shared entity retains verified NAP, hours, logo and Perth service area', () => {
  for (const file of ['index.html', 'about/index.html', 'contact/index.html']) {
    const graph = nodes(fs.readFileSync(path.join(root, file), 'utf8'));
    const office = graph.find(node => node['@id'] === officeId);
    assert.ok(office, file);
    assert.equal(office.name, 'Ellis Services Group');
    assert.equal(office.telephone, '+61403069685');
    assert.equal(office.openingHours, 'Mo-Su 00:00-23:59');
    assert.deepEqual(office.address, {
      '@type': 'PostalAddress', streetAddress: '140 St Georges Terrace',
      addressLocality: 'Perth', addressRegion: 'WA', postalCode: '6000', addressCountry: 'AU',
    });
    assert.equal(office.logo, 'https://www.perthhandymate.com.au/assets/images/ellis-services-group-logo.png');
    assert.deepEqual(office.areaServed, { '@type': 'AdministrativeArea', name: 'Perth metropolitan area' });
  }
});

test('regulated service scope names the in-house licensed team without invented credentials or ratings', () => {
  for (const route of regulatedPages) {
    const html = fs.readFileSync(path.join(root, 'services', route, 'index.html'), 'utf8');
    const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ');
    assert.equal(visible.split(sentence).length - 1, 1, route);
    assert.doesNotMatch(visible, /licen[cs]e\s*(?:number|no\.?|#)\s*[:#-]?\s*[A-Z]*\d+/i, route);
    assert.doesNotMatch(JSON.stringify(nodes(html)), /AggregateRating|ratingValue|reviewCount/, route);
  }
});

test('normalizer preserves unrelated JSON-LD and visible content and is idempotent', () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ellis-entity-graph-'));
  try {
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const service = fs.readFileSync(path.join(root, 'services/electrical-plumbing-gas-air-conditioning/electricians/index.html'), 'utf8');
    const guide = fs.readFileSync(path.join(root, 'guides/when-home-maintenance-needs-a-licensed-trade/index.html'), 'utf8');
    fs.mkdirSync(path.join(temporaryRoot, 'services/electrical-plumbing-gas-air-conditioning/electricians'), { recursive: true });
    fs.mkdirSync(path.join(temporaryRoot, 'guides'), { recursive: true });
    const serviceFile = path.join(temporaryRoot, 'services/electrical-plumbing-gas-air-conditioning/electricians/index.html');
    const guideFile = path.join(temporaryRoot, 'guides/index.html');
    fs.writeFileSync(path.join(temporaryRoot, 'index.html'), home);
    fs.writeFileSync(serviceFile, service.replace(`<p class="licensed-team-scope">${sentence}</p>`, ''));
    fs.writeFileSync(guideFile, guide);
    const script = path.join(root, 'scripts/normalize-entity-graph.js');
    execFileSync(process.execPath, [script, temporaryRoot]);
    const first = fs.readFileSync(serviceFile, 'utf8');
    assert.equal(first, service);
    assert.equal(fs.readFileSync(guideFile, 'utf8'), guide);
    const preservedTypes = new Set(['FAQPage', 'BreadcrumbList']);
    assert.deepEqual(blocks(first).filter(block => preservedTypes.has(block['@type'])), blocks(service).filter(block => preservedTypes.has(block['@type'])));
    execFileSync(process.execPath, [script, temporaryRoot]);
    assert.equal(fs.readFileSync(serviceFile, 'utf8'), first);
    assert.equal(fs.readFileSync(path.join(temporaryRoot, 'index.html'), 'utf8'), home);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
