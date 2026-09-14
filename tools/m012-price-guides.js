#!/usr/bin/env node
/*
 * M-012-A governed price-guide compiler.
 * This consumes the reviewed research packets and adds a non-transactional
 * public price-reference section to each canonical service detail page.
 */
const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(siteRoot, '..', '..');
const researchFiles = [
  'm012-price-research-trades-1.json',
  'm012-price-research-trades-2.json',
  'm012-price-research-trades-3.json',
].map((file) => path.join(workspaceRoot, 'work', file));
const checkedDate = '2026-09-14';
const checkedDateLabel = '14 September 2026';
const disclaimer = 'Prices shown are Ellis official guide prices. Contact Ellis for a tailored consultation.';

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function collectResearch(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.services)) return payload.services;
  throw new Error('Research packet has no supported item collection');
}

function normaliseStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'quote-required') return 'quote-required';
  if (value.includes('national')) return 'indicative-national';
  return 'indicative-local';
}

function normaliseRange(rangeAud, status) {
  if (status === 'quote-required') return null;
  if (typeof rangeAud !== 'string' || !rangeAud.trim()) throw new Error('Indicative price guide needs a published AUD range');
  return `A$${rangeAud.trim().replace(/^A?\$/i, '')}`;
}

function normaliseSource(source) {
  const evidence = String(source.evidence || source.conditions || '').trim();
  const locality = String(source.locality || (/\b(?:perth|wa|western australia)\b/i.test(evidence) ? 'Perth / WA (as stated by source)' : 'Australia / source context')).trim();
  return {
    url: String(source.url || '').trim(),
    title: String(source.title || '').trim(),
    date: String(source.date || source.publishedOrAccessed || source.publishedOrRetrieved || checkedDate).trim(),
    locality,
    evidence,
  };
}

function normaliseEntry(item) {
  const status = normaliseStatus(item.priceStatus);
  const sources = (item.sources || []).map(normaliseSource);
  for (const source of sources) {
    if (!/^https:\/\//.test(source.url) || !source.title || !source.date || !source.locality || !source.evidence) {
      throw new Error(`Invalid normalised source for ${item.serviceSlug}`);
    }
  }
  return {
    slug: item.serviceSlug,
    serviceName: item.serviceName,
    status,
    rangeAud: normaliseRange(item.rangeAud, status),
    unit: String(item.unit || '').trim(),
    checkedDate,
    sources,
    confidence: String(item.confidence || 'none').toLowerCase(),
    notes: String(item.notes || '').trim(),
  };
}

function priceGuideMarkup(guide) {
  const isLocal = guide.status === 'indicative-local';
  const isNational = guide.status === 'indicative-national';
  const heading = isLocal
    ? 'Indicative Perth cost guide'
    : isNational
      ? 'Australian price reference — not a Perth quote'
      : 'Site-specific quote required';
  const statusCopy = isLocal
    ? 'A published Perth or WA market reference for the scope described below.'
    : isNational
      ? 'This is Australian reference material only. It is not a Perth-specific quote or Ellis price.'
      : 'A reliable public range is not suitable for this service scope. We will seek a site-specific quote after the task is clarified.';
  const range = guide.rangeAud
    ? `<p class="price-guide-range"><strong>${escapeHtml(guide.rangeAud)}</strong><span>${escapeHtml(guide.unit)}</span></p>`
    : `<p class="price-guide-range price-guide-no-range"><strong>Quote after scope review</strong><span>${escapeHtml(guide.unit)}</span></p>`;
  return `<section class="section muted"><div class="shell price-guide" data-price-guide-status="${guide.status}"><div class="price-guide-heading"><div><p class="eyebrow">Public price reference</p><h2>${heading}</h2><p>${statusCopy}</p></div></div>${range}<p class="price-guide-notes">${escapeHtml(guide.notes)}</p><p class="price-guide-disclaimer">${disclaimer}</p></div></section>`;
}

const catalogPath = path.join(siteRoot, 'data', 'service-catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const sourceItems = researchFiles.flatMap((file) => collectResearch(JSON.parse(fs.readFileSync(file, 'utf8'))));
const entries = sourceItems.map(normaliseEntry).sort((a, b) => a.slug.localeCompare(b.slug));
const expectedSlugs = new Set(catalog.canonicalServices.map((service) => service.slug));
const entrySlugs = new Set(entries.map((entry) => entry.slug));
const missing = [...expectedSlugs].filter((slug) => !entrySlugs.has(slug));
const extra = [...entrySlugs].filter((slug) => !expectedSlugs.has(slug));
if (entries.length !== 67 || entrySlugs.size !== 67 || missing.length || extra.length) {
  throw new Error(`Price-guide coverage mismatch: count=${entries.length}, unique=${entrySlugs.size}, missing=${missing.join(',')}, extra=${extra.join(',')}`);
}

const priceData = {
  version: '1.0',
  checkedDate,
  currency: 'AUD',
  disclaimer,
  entries,
};
fs.writeFileSync(path.join(siteRoot, 'data', 'service-price-guides.json'), `${JSON.stringify(priceData, null, 2)}\n`);

const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
for (const service of catalog.canonicalServices) {
  const pagePath = path.join(siteRoot, service.url, 'index.html');
  const original = fs.readFileSync(pagePath, 'utf8');
  const guide = bySlug.get(service.slug);
  const start = original.indexOf('<section class="section muted"><div class="shell"><p class="eyebrow">What to tell us</p>');
  if (start < 0) throw new Error(`Could not find stable price-guide insertion point: ${service.slug}`);
  const existingStart = original.indexOf('<section class="section muted"><div class="shell price-guide"', 0);
  const withoutExisting = existingStart >= 0
    ? original.replace(/<section class="section muted"><div class="shell price-guide"[\s\S]*?<\/div><\/section>(?=<section class="section muted"><div class="shell"><p class="eyebrow">What to tell us<\/p>)/, '')
    : original;
  const target = '<section class="section muted"><div class="shell"><p class="eyebrow">What to tell us</p>';
  if (!withoutExisting.includes(target)) throw new Error(`Could not preserve content after price guide: ${service.slug}`);
  fs.writeFileSync(pagePath, withoutExisting.replace(target, `${priceGuideMarkup(guide)}${target}`));
}

console.log(`M-012-A compiled ${entries.length} price guides into ${catalog.canonicalServices.length} service detail pages.`);
