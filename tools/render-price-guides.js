#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/service-catalog.json'), 'utf8'));
const pricing = JSON.parse(fs.readFileSync(path.join(root, 'data/service-price-guides.json'), 'utf8'));
const guides = new Map(pricing.entries.map((entry) => [entry.slug, entry]));
const insertionPoint = '<section class="section shell city-service-band">';
const existingGuide = /<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/section>/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

// Presentation rules select only amounts already in the governed public range/unit.
// Fail closed when a source changes: the new factual wording needs review.
function priceRows(guide) {
  const rules = {
    'air-conditioning': [
      ['rangeAud', /^A\$(.+)$/, ['Installation project']],
      ['unit', /^installation project; split-installation labour (.+) labour$/, ['Split-installation labour']],
    ],
    'blinds-and-curtains': [['rangeAud', /^A\$(.+) labour-only per window; (.+) roller blind supply-and-install per window$/, ['Labour only per window', 'Roller blind supply and installation per window']]],
    'cabinet-makers': [['rangeAud', /^A\$(.+) per hour; (.+) per cabinet$/, ['Labour per hour', 'Per cabinet']]],
    electricians: [['rangeAud', /^A\$(.+) service fee; (.+) per hour$/, ['Service fee', 'Labour per hour; materials extra unless included']]],
    handymen: [['rangeAud', /^A\$(.+) per hour; (.+) half-day; (.+) full-day$/, ['Labour per hour', 'Half-day booking', 'Full-day booking']]],
    'house-painters': [
      ['rangeAud', /^A\$(.+)$/, ['Exterior painting per m²']],
      ['unit', /^per m² of exterior painting; typical full exterior \$(.+)$/, ['Typical full exterior']],
    ],
    plasterers: [
      ['rangeAud', /^A\$(.+)$/, ['Per m² depending on plaster type']],
      ['unit', /^per m² depending on plaster type; Perth plasterboard installation average (.+) per hour$/, ['Perth plasterboard installation average per hour']],
    ],
    plumbers: [
      ['rangeAud', /^A\$(.+) per hour; (.+) call-out$/, ['Labour per hour', 'Call-out']],
      ['unit', /^labour hour and call-out; emergency WA call-outs (.+) plus (.+) per hour$/, ['Emergency WA call-out', 'Emergency WA labour per hour']],
    ],
    'shower-screens': [['rangeAud', /^A\$(.+) plus (.+) per hour installation$/, ['Screen supply', 'Installation per hour; additional to supply']]],
    'window-installation': [['rangeAud', /^A\$(.+) per hour; windows (.+) per m² supply$/, ['Installation labour per hour', 'Selected window supply per m²']]],
  };
  if (!rules[guide.slug]) return [[guide.rangeAud, guide.unit]];
  return rules[guide.slug].flatMap(([field, pattern, labels]) => {
    const match = guide[field].match(pattern);
    if (!match || match.length !== labels.length + 1) throw new Error(`Review changed price basis: ${guide.slug}/${field}`);
    return labels.map((label, index) => ['A$' + match[index + 1], label]);
  });
}

function markup(guide) {
  const context = guide.rangeAud ? 'Ellis Services Group service price range' : 'Ellis Services Group project quote';
  const range = guide.rangeAud
    ? priceRows(guide).map(([amount, basis]) => `<p class="price-guide-range"><strong>${escapeHtml(amount)}</strong><span>${escapeHtml(basis)}</span></p>`).join('')
    : `<p class="price-guide-range price-guide-no-range"><strong>Request your project price</strong><span>${escapeHtml(guide.unit)}</span></p>`;
  const scope = guide.scope ? `<p class="price-guide-scope">${escapeHtml(guide.scope)}</p>` : '';
  const heading = guide.rangeAud ? 'Service price range' : 'Project price';
  const confirmed = '<p>Ask us to confirm the applicable price basis and any fees or inclusions in your written quote.</p>';
  return `<section class="section muted"><div class="shell price-guide" data-price-guide-status="${guide.status}"><p class="eyebrow">Service pricing</p><h2>${heading}</h2><p>${context}</p>${range}${scope}<p>We provide a written quote after an on-site assessment of the property, materials, access and agreed work scope. Contact Ellis Services Group to arrange your assessment.</p>${confirmed}</div></section>`;
}

if (guides.size !== 67 || catalog.canonicalServices.length !== 67) throw new Error('Expected 67 unique service price guides');
for (const service of catalog.canonicalServices) {
  const guide = guides.get(service.slug);
  if (!guide) throw new Error(`Missing price guide for ${service.slug}`);
  const file = path.join(root, service.url, 'index.html');
  const current = fs.readFileSync(file, 'utf8');
  if(service.slug==='handymen'&&current.includes('class="handyman-compact"')){
    const inner=markup(guide).replace('<section class="section muted">','').replace('</section>','');
    const updated=current.replace(/<div class="shell price-guide"[\s\S]*?<\/div>/,inner);
    if(updated!==current)fs.writeFileSync(file,updated);
    continue;
  }
  const withoutOldGuide = current.replace(existingGuide, '');
  if (!withoutOldGuide.includes(insertionPoint) || !withoutOldGuide.includes('service-questions')) {
    throw new Error(`Missing current service-page insertion point: ${service.slug}`);
  }
  const updated = withoutOldGuide.replace(insertionPoint, `${markup(guide)}${insertionPoint}`);
  if (updated !== current) fs.writeFileSync(file, updated);
}

console.log(`Rendered ${guides.size} dated service price guides.`);
