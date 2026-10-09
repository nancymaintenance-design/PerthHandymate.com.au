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

function markup(guide) {
  const context = guide.rangeAud ? 'Ellis Services Group service price range' : 'Ellis Services Group project quote';
  const range = guide.rangeAud
    ? `<p class="price-guide-range"><strong>${escapeHtml(guide.rangeAud)}</strong><span>${escapeHtml(guide.unit)}</span></p>`
    : `<p class="price-guide-range price-guide-no-range"><strong>Request your project price</strong><span>${escapeHtml(guide.unit)}</span></p>`;
  const scope = guide.scope ? `<p class="price-guide-scope">${escapeHtml(guide.scope)}</p>` : '';
  const heading = guide.rangeAud ? 'Service price range' : 'Project price';
  const confirmed = '';
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
