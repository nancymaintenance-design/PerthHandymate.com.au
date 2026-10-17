'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const copy = require('../data/property-maintenance-page.json');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const en = pair => esc(pair[0]);
const contact = '../../contact/?service=Handyman%2C%20interiors%20%26%20appliance%20repairs&amp;q=Property%20Maintenance';
function details(item) {
  const id = item.title[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `<details class="property-disclosure" id="${id}"><summary>${en(item.title)}</summary>${item.text ? `<p>${en(item.text)}</p>` : `<ul>${item.links.map(link => `<li><a href="${link.href}">${en(link.label)}</a></li>`).join('')}</ul>`}</details>`;
}
function renderMain(html) {
  const hero = html.match(/<section\b[^>]*class="[^"]*service-hero[^"]*"[^>]*>[\s\S]*?<\/section>/)?.[0]
    || html.match(/<div class="page-hero service-hero property-hero">[\s\S]*?<\/nav>[\s\S]*?<\/div><\/div>/)?.[0];
  if (!hero) throw new Error('Missing property maintenance hero');
  const crumb = hero.match(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/)?.[0];
  const h1 = hero.match(/<h1>[\s\S]*?<\/h1>/)?.[0];
  if (!crumb || !h1) throw new Error('Missing property maintenance heading or breadcrumbs');
  const navigation = `<nav class="property-jumps" aria-label="${en(copy.navLabel)}">${copy.sections.map(s=>`<a href="#${s.id}">${en(s.title)}</a>`).join('')}</nav>`;
  const sections = copy.sections.map((section, index) => `<section class="property-section shell" id="${section.id}" aria-labelledby="${section.id}-title"><div class="property-heading"><span aria-hidden="true">0${index + 1}</span><h2 id="${section.id}-title">${en(section.title)}</h2></div>${section.intro ? `<p class="property-intro">${en(section.intro)}</p>` : ''}${section.cards ? `<div class="property-cards">${section.cards.map(card=>`<article class="property-card"><h3>${en(card.title)}</h3><p>${en(card.text)}</p></article>`).join('')}</div>` : ''}${section.steps ? `<ol class="property-steps">${section.steps.map(step=>`<li><h3>${en(step.title)}</h3><p>${en(step.text)}</p></li>`).join('')}</ol>` : ''}${section.contact ? `<div class="property-contact-actions"><a class="button" data-preserve-search href="${contact}">${en(copy.cta)}</a><a class="property-call" href="tel:+61403069685">${en(copy.call)}</a></div>` : ''}${(section.details || []).map(details).join('')}</section>`).join('\n');
  return `<main id="main" class="property-clarity"><div class="page-hero service-hero property-hero"><div class="shell">${crumb}<p class="eyebrow">${en(copy.intro)}</p>${h1}<p class="lede">${en(copy.lede)}</p>${navigation}</div></div>\n${sections}\n</main>`;
}
function compactPropertyPage(html) {
  html = html.replace(/<main\b[\s\S]*?<\/main>/, renderMain(html));
  if (!html.includes('assets/css/property-clarity.css')) html = html.replace('</head>', '<link rel="stylesheet" href="../../assets/css/property-clarity.css"></head>');
  // Removed duplicate questions are no longer advertised as a separate FAQ graph.
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, (block, source) => JSON.parse(source)['@type'] === 'FAQPage' ? '' : block);
  return html;
}
module.exports = compactPropertyPage;
if (require.main === module) {
  const file = path.join(root, 'services/property-maintenance/index.html');
  fs.writeFileSync(file, compactPropertyPage(fs.readFileSync(file, 'utf8')));
  const translations = {};
  function collect(value) {
    if (Array.isArray(value) && value.length === 2 && value.every(v => typeof v === 'string')) translations[value[0]] = value[1];
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  collect(copy);
  fs.writeFileSync(path.join(root, 'locales/parts/revision-property.json'), JSON.stringify(translations, null, 2) + '\n');
  console.log('Rendered property maintenance and its Chinese translation part.');
}
