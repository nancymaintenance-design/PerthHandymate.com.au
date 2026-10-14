'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { categories, guides, updated } = require('../data/guide-library');
const root = path.resolve(__dirname, '..');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const plain = s => s.replace(/<[^>]+>/g, ' ').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
const paras = list => list.map(p => `<p>${esc(p)}</p>`).join('');
const hubTitle = 'Perth Handyman & Home Maintenance Guides';
function articleBody(g) {
  // Keep earlier body + scenario/FAQ evidence verbatim. Only H2 display labels and
  // section navigation attributes are adapted; factual places and FAQ text stay.
  let body = g.bodyHtml.replace('This guide helps you describe a fault and plan an assessment.', 'This guide helps you describe a fault and plan an on-site assessment.').replace(/<h2>(.*?)<\/h2>/gs, (all, text) => '<h2>' + text
    .replace('Describe Your Small Home Repair Jobs in Perth', 'Describe your small home repair jobs')
    .replace('Hiring a Handyman in Perth: Scope, Quote &amp; Booking', 'Hiring a handyman: scope, quote &amp; booking')
    .replace('Preventative Home Maintenance for Perth Conditions', 'Preventative maintenance for local conditions')
    .replace('Arrange your Perth site assessment', 'Arrange your local site assessment')
    .replace('Perth Service Area and Postcode Questions', 'Service Area and Postcode Questions') + '</h2>');
  const added = g.sections.map(([heading, paragraphs]) => `<section class="guide-decision"><h2>${esc(heading)}</h2>${paras(paragraphs)}</section>`).join('');
  // Put decision prose ahead of detailed FAQs, keeping the opening-to-decision
  // sequence readable; original sections and all their links remain available.
  const first = body.indexOf('<section');
  body = body.slice(0, first) + added + body.slice(first);
  let index = 0;
  const contents = [];
  body = body.replace(/<section\b([^>]*)><h2>(.*?)<\/h2>/gs, (all, attrs, heading, offset) => {
    const tail = body.slice(offset, body.indexOf('</section>', offset));
    const isFaq = tail.includes('<details');
    const existing = attrs.match(/\bid="([^"]+)"/)?.[1];
    const id = isFaq ? 'assessment-questions' : existing || `guide-section-${++index}`;
    attrs = attrs.replace(/\s*id="[^"]*"/, '').replace(/\s*tabindex="[^"]*"/, '');
    contents.push([id, plain(heading)]);
    return `<section${attrs} id="${id}" tabindex="-1"><h2>${heading}</h2>`;
  });
  body += `<section class="guide-conclusion" id="next-step" tabindex="-1"><h2>What to take from this guide</h2><p>${esc(g.conclusion)}</p><p><a href="#assessment-questions">Review the relevant questions</a> · <a href="../../services/${g.service[0]}/">${esc(g.service[1])}</a></p></section>`;
  contents.push(['next-step', 'What to take from this guide']);
  return { body, contents };
}
function renderMain(slug) {
  if (!slug) return `<main id="main" class="guide-library"><section class="page-hero"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="../">Home</a></li><li><span aria-current="page">Guides &amp; Advice</span></li></ol></nav><p class="eyebrow">Practical property notes</p><h1>${esc(hubTitle)}</h1><p class="lede">Start with the fault or the decision in front of you. Find practical explanations for repairs, bookings and property maintenance.</p><p>Descriptions are enough to begin; photos and measurements are optional. Ellis checks the property on site before confirming the repair scope and written quote.</p><nav class="guide-category-nav" aria-label="Guide categories">${categories.map(([id, title]) => `<a href="#${id}">${esc(title)}</a>`).join('')}</nav></div></section><div class="shell guide-groups">${categories.map(([id, title, description]) => `<section class="guide-category" id="${id}" tabindex="-1"><header><h2>${esc(title)}</h2><p>${esc(description)}</p></header><div class="guide-card-grid">${guides.filter(g => g.category === id).map(g => `<article class="guide-card"><h3><a href="../guides/${g.slug}/">${esc(g.title)}</a></h3><p>${esc(g.description)}</p><a class="text-link" href="../guides/${g.slug}/">Read guide <span aria-hidden="true">→</span></a></article>`).join('')}</div></section>`).join('')}</div><section class="cta-band"><div class="shell split"><div><p class="eyebrow">Start with one request</p><h2>Tell us what needs attention</h2><p>Share the task and location to start your service request.</p></div><a class="button button-light" data-preserve-search href="../contact/">Contact Us</a></div></section></main>`;
  const g = guides.find(x => x.slug === slug);
  if (!g) throw new Error(`Unknown guide source: ${slug}`);
  const { body, contents } = articleBody(g);
  return `<main id="main" class="guide-reading"><article class="article"><header class="page-hero"><div class="shell"><nav class="breadcrumbs" aria-label="Breadcrumb"><ol><li><a href="../../">Home</a></li><li><a href="../">Guides &amp; Advice</a></li><li><span aria-current="page">${esc(g.title)}</span></li></ol></nav><p class="eyebrow">${esc(categories.find(c => c[0] === g.category)[1])}</p><h1>${esc(g.title)}</h1><p class="article-meta">Updated ${updated}</p><div class="guide-introduction">${paras(g.intro)}</div></div></header><div class="shell guide-reading-layout"><nav class="guide-contents" aria-label="In this guide"><strong>In this guide</strong><ol>${contents.map(([id, heading]) => `<li><a href="#${id}">${esc(heading)}</a></li>`).join('')}</ol></nav><div class="article-body guide-prose">${body}</div></div></article><section class="shell guide-related" aria-labelledby="related-guides"><h2 id="related-guides">Continue with the repair plan</h2><div class="guide-card-grid"><article class="guide-card"><p class="eyebrow">Related service</p><h3><a href="../../services/${g.service[0]}/">${esc(g.service[1])}</a></h3><p>Read the service scope, then describe the fault and property access for assessment.</p><a class="text-link" href="../../contact/">Discuss your repair →</a></article>${g.related.map(slug => { const related = guides.find(x => x.slug === slug); return `<article class="guide-card"><p class="eyebrow">Related guide</p><h3><a href="../${slug}/">${esc(related.title)}</a></h3><p>${esc(related.description)}</p><a class="text-link" href="../${slug}/">Read guide →</a></article>`; }).join('')}</div><p class="guide-back"><a href="../#${g.category}">Back to ${esc(categories.find(c => c[0] === g.category)[1])}</a></p></section></main>`;
}
function renderGuide(html, slug = null) {
  const g = guides.find(x => x.slug === slug), title = g?.title || hubTitle;
  const main = renderMain(slug);
  html = html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, main)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} | Ellis</title>`)
    .replace(/(<meta name="description" content=")[^"]*(">)/, (_, a, b) => a + esc(g?.description || 'Explore practical repair guides by fault, booking decision, home maintenance plan or rental property needs.') + b);
  const href = `${slug ? '../../' : '../'}assets/css/guide-library.css`;
  if (!html.includes(href)) html = html.replace('</head>', `<link rel="stylesheet" href="${href}"></head>`);
  html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (all, open, source, close) => {
    const data = JSON.parse(source);
    for (const block of data['@graph'] || [data]) {
      if (block['@type'] === 'BreadcrumbList') block.itemListElement.at(-1).name = title;
      if (block['@type'] === 'Article') { block.headline = title; block.dateModified = updated; }
      if (block['@type'] === 'FAQPage' && g) block.mainEntity = [...main.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m => ({ '@type': 'Question', name: plain(m[1]), acceptedAnswer: { '@type': 'Answer', text: plain(m[2]) } }));
    }
    return open + JSON.stringify(data) + close;
  });
  return html;
}
function apply() {
  let count = 0;
  for (const slug of [null, ...guides.map(g => g.slug)]) {
    const file = path.join(root, 'guides', slug || '', 'index.html'), before = fs.readFileSync(file, 'utf8');
    const after = renderGuide(before, slug);
    if (after !== before) { fs.writeFileSync(file, after); count++; }
  }
  const inventoryFile = path.join(root, 'data/content.js'), sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(inventoryFile, 'utf8'), sandbox);
  for (const item of sandbox.window.ELLIS_CONTENT.guides) {
    const g = guides.find(x => x.slug === item.slug);
    Object.assign(item, { title: g.title, desc: g.description, metaTitle: g.title + ' | Ellis', metaDescription: g.description, intro: g.intro.join(' '), editorialSource: 'data/guide-library.js' });
  }
  fs.writeFileSync(inventoryFile, '/* Maintainable public content inventory. Edit source and regenerate pages before release. */\nwindow.ELLIS_CONTENT=' + JSON.stringify(sandbox.window.ELLIS_CONTENT, null, 2) + ';\n');
  const keywordFile = path.join(root, 'data/keyword-content-round.json'), keyword = JSON.parse(fs.readFileSync(keywordFile, 'utf8'));
  for (const item of keyword.guides) {
    const g = guides.find(x => x.slug === item.slug);
    Object.assign(item, { title: g.title, description: g.description, intro: g.intro.join(' '), editorialSource: 'data/guide-library.js' });
  }
  fs.writeFileSync(keywordFile, JSON.stringify(keyword, null, 2) + '\n');
  console.log(`Rendered guide library: ${count} of 13 pages changed.`);
}
module.exports = { renderGuide, renderMain, articleBody, apply, guides, categories };
if (require.main === module) apply();
