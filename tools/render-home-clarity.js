'use strict';
// Homepage presentation owner. Run after any historical homepage/content renderer.
// Maintained guide titles/excerpts come from data/guide-library.js; case content
// stays in index.html so applying this pass never replaces approved evidence.
const fs = require('node:fs');
const path = require('node:path');
const { guides } = require('../data/guide-library');
const escape = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function renderHome(html) {
  if (!html.includes('assets/css/home-clarity.css')) html = html.replace('</head>', '<link rel="stylesheet" href="./assets/css/home-clarity.css"></head>');
  if (!html.includes('assets/js/home-guides.js')) html = html.replace('</body>', '<script src="./assets/js/home-guides.js" defer></script></body>');
  html = html.replace('<main id="main">', '<main id="main" class="home-clarity">');
  html = html.replace('<section class="hero">', '<section class="hero" id="home-services">');
  html = html.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, '<h1><span class="home-title-line">Handyman Services Perth</span> <span class="home-title-line home-title-detail">for Home Repairs &amp; Maintenance</span></h1>');
  html = html.replace(/<a href="#repair-quote-process">Quotes<\/a>/g, '');
  for (const id of ['repair-quote-process', 'local-repair-requests']) html = html.replace(new RegExp('<section\\b[^>]*id="' + id + '"[^>]*>[\\s\\S]*?<\\/section>'), '');
  html = html.replace(/<section class="section shell project-feature"(?: id="repair-projects")?>[\s\S]*?<\/section>/, section => {
    section = section.replace('<section class="section shell project-feature">', '<section class="section shell project-feature" id="repair-projects">').replace('class="eyebrow" id="repair-projects"', 'class="eyebrow"');
    const start = section.indexOf('<div class="project-feature-list">');
    return section.slice(0, start) + section.slice(start).replace(/<h2>([\s\S]*?)<\/h2>/g, '<h3>$1</h3>');
  });
  const first = ['how-to-find-the-right-home-repairer', 'when-home-maintenance-needs-a-licensed-trade', 'prepare-before-home-repair-quote'];
  const ordered = [...first.map(slug => guides.find(g => g.slug === slug)), ...guides.filter(g => !first.includes(g.slug))];
  const cards = ordered.map(g => `<article class="home-guide-card"><h3><a href="guides/${g.slug}/">${escape(g.title)}</a></h3><p>${escape(g.description)}</p></article>`).join('');
  const library = `<section class="section insight-strip" id="repair-planning-guides"><div class="shell"><div class="section-heading"><div><p class="eyebrow">Guides &amp; Advice</p><h2 id="home-guides-title">Home Maintenance Guides &amp; Advice</h2></div><a class="text-link" href="guides/">Browse all guides →</a></div><div class="home-guides-toolbar"><div class="home-guides-controls" hidden><button type="button" data-guide-autoplay aria-controls="home-guide-track"><span data-guide-pause-label>Pause automatic guides</span><span data-guide-resume-label hidden>Resume automatic guides</span></button><button type="button" data-guide-prev aria-controls="home-guide-track"><span aria-hidden="true">←</span><span class="sr-only">Previous guides</span></button><span data-guide-position aria-live="off" aria-atomic="true">1 / 12</span><button type="button" data-guide-next aria-controls="home-guide-track"><span aria-hidden="true">→</span><span class="sr-only">Next guides</span></button></div></div><div class="home-guide-track" id="home-guide-track" tabindex="0" role="group" aria-label="Guide articles">${cards}</div></div></section>`;
  html = html.replace(/<section class="section insight-strip" id="repair-planning-guides">[\s\S]*?<\/section>/, library);
  if (!html.includes('class="home-office-phone"')) html = html.replace('</address>', '</address><p class="home-office-phone"><a href="tel:+61403069685">0403 069685</a></p>');
  return html;
}
if (require.main === module) {
  const file = path.resolve(__dirname, '../index.html');
  const before = fs.readFileSync(file, 'utf8'), after = renderHome(before);
  if (after !== before) fs.writeFileSync(file, after);
  console.log('Homepage clarity presentation refreshed from maintained sources.');
}
module.exports = { renderHome };
