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
  const local = guide.status === 'indicative-local';
  const national = guide.status === 'indicative-national';
  const title = local ? 'Indicative Perth cost guide' : national ? 'Australian price reference — not a Perth quote' : 'Site-specific quote required';
  const context = local
    ? 'This published Perth or WA reference applies only to the scope described below.'
    : national
      ? 'This is an Australian market reference, not a Perth-specific price.'
      : 'A meaningful price needs the property details and work scope first.';
  const range = guide.rangeAud
    ? `<p class="price-guide-range"><strong>${escapeHtml(guide.rangeAud)}</strong><span>${escapeHtml(guide.unit)}</span></p>`
    : `<p class="price-guide-range price-guide-no-range"><strong>Quote after scope review</strong><span>${escapeHtml(guide.unit)}</span></p>`;
  const sources = guide.sources.length
    ? `<div class="price-guide-sources"><h3>Published references</h3><ul>${guide.sources.map((source) => `<li><a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a> <span>(${escapeHtml(source.locality)})</span></li>`).join('')}</ul></div>`
    : '<p class="price-guide-sources">No reliable public range was verified for this scope.</p>';
  return `<section class="section muted"><div class="shell price-guide" data-price-guide-status="${guide.status}"><p class="eyebrow">Pricing and scope</p><h2>${title}</h2><p>${context}</p>${range}<p class="price-guide-notes">${escapeHtml(guide.notes)}</p><p class="price-guide-disclaimer">${escapeHtml(pricing.disclaimer)}</p><p class="price-guide-date">Reference checked ${escapeHtml(guide.checkedDate)}</p>${sources}</div></section>`;
}

if (guides.size !== 67 || catalog.canonicalServices.length !== 67) throw new Error('Expected 67 unique service price guides');
for (const service of catalog.canonicalServices) {
  const guide = guides.get(service.slug);
  if (!guide) throw new Error(`Missing price guide for ${service.slug}`);
  const file = path.join(root, service.url, 'index.html');
  const current = fs.readFileSync(file, 'utf8');
  const withoutOldGuide = current.replace(existingGuide, '');
  if (!withoutOldGuide.includes(insertionPoint) || !withoutOldGuide.includes('service-questions')) {
    throw new Error(`Missing current service-page insertion point: ${service.slug}`);
  }
  const updated = withoutOldGuide.replace(insertionPoint, `${markup(guide)}${insertionPoint}`);
  if (updated !== current) fs.writeFileSync(file, updated);
}

console.log(`Rendered ${guides.size} dated service price guides.`);
