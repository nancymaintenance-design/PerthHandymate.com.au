'use strict';
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const plain = s => s.replace(/<[^>]*>/g, ' ').replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replace(/\s+/g, ' ').trim();
function syncFaq(html) {
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] || html;
  const questions = [...main.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m => ({ '@type': 'Question', name: plain(m[1]), acceptedAnswer: { '@type': 'Answer', text: plain(m[2]) } }));
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (all, a, source, b) => {
    const json = JSON.parse(source); let changed = false;
    for (const block of json['@graph'] || [json]) if (block['@type'] === 'FAQPage') { block.mainEntity = questions; changed = true; }
    return changed ? a + JSON.stringify(json) + b : all;
  });
}
function consolidateService(html) {
  if(html.includes('rel="canonical" href="https://www.perthhandymate.com.au/services/property-maintenance/"'))return require('./compact-property-page')(html);
  const links = [];
  html = html.replace(/<section[^>]*id="repair-related-reading"[\s\S]*?<\/section>/g, block => {
    links.push(...block.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)); return '';
  });
  html = html.replace(/<p>Read (<a\b[^>]*>more about [\s\S]*?<\/a>) for related preparation and questions\.<\/p>/g, (_, a) => {
    links.push([a.replace('>more about ', '>')]); return '';
  });
  html = html.replace(/<p>For related preparation, read (<a\b[^>]*>[\s\S]*?<\/a>)\. Describe your task and suburb; photos are optional\. Ellis confirms the work and written quote after an on-site assessment\.<\/p>/g, (_, a) => {
    links.push([a]); return '';
  });
  const unique = [...new Map(links.map(m => [m[0].match(/href="([^"]+)/)[1], m[0]])).values()];
  if (unique.length) html = html.replace('</main>', `<section class="section shell" id="repair-related-reading"><h2>Related repair guides</h2><ul>${unique.map(a => `<li>${a}</li>`).join('')}</ul></section></main>`);
  const route = html.match(/<link rel="canonical" href="https:\/\/www.perthhandymate.com.au([^\"]+)"/)?.[1];
  const faqFile = path.join(root, 'data/service-guide-faq.json');
  const faq = fs.existsSync(faqFile) ? JSON.parse(fs.readFileSync(faqFile, 'utf8'))[route] : null;
  if (faq) {
    html = html.replace(/<section[^>]*id="maintenance-task-questions"[\s\S]*?<\/section>/, '');
    const owners = require('../data/service-guide-faq-owners.json');
    const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    const maintained = new Map(faq.map(item => {
      const source = plain(item.match(/<summary>(.*?)<\/summary>/s)[1]), question = owners.questionOwners[source];
      if (!question) throw new Error(`Missing maintained FAQ owner: ${source}`);
      const answer = owners.mergedAnswers[question];
      return [question, answer ? `<details><summary>${escape(question)}</summary><p>${escape(answer)}</p></details>` : item.replace(/<summary>.*?<\/summary>/s, `<summary>${escape(question)}</summary>`)];
    }));
    const seen = new Set();
    html = html.replace(/<details\b[^>]*><summary>(.*?)<\/summary>[\s\S]*?<\/details>/gs, (item, question) => {
      const source = plain(question), owner = owners.questionOwners[source] || owners.existingAliases[source] || source;
      if (!maintained.has(owner)) return item;
      if (seen.has(owner)) return '';
      seen.add(owner); return maintained.get(owner);
    });
    html = html.replace(/<section\b([^>]*)>([\s\S]*?)<\/section>/g, (section, attrs, body) => {
      attrs = attrs.replace(' id="service-task-questions"', '');
      if (!/\bid=/.test(attrs) && [...body.matchAll(/<summary>(.*?)<\/summary>/gs)].some(m => maintained.has(plain(m[1])))) body = body.replace('<div class="accordion-list">', '<div class="accordion-list" id="service-task-questions">');
      return `<section${attrs}>${body}</section>`;
    });
    const existing = new Set([...html.matchAll(/<summary>(.*?)<\/summary>/gs)].map(m => plain(m[1])));
    const items = [...maintained].filter(([question]) => !existing.has(question)).map(([,item]) => item);
    if (items.length) html = html.replace('</main>', `<section class="section shell service-questions" id="maintenance-task-questions"><h2>Maintenance and repair questions</h2><div class="accordion-list">${items.join('')}</div></section></main>`);
  }
  return syncFaq(html);
}
function consolidateHome(html) {
  html = html.replace('href="./services/doors-windows-glass-screens/door-installation/">Door repairs & installation</a>', 'href="./services/doors-windows-glass-screens/door-repairs/">Door repairs</a>');
  html = html.replace(/<section class="section shell" id="repair-planning-guides">[\s\S]*?<\/section>/, '');
  html = html.replace('<section class="section insight-strip">', '<section class="section insight-strip" id="repair-planning-guides">');
  html = html.replace(/<section class="section shell" id="property-repair-list">[\s\S]*?<\/section>/, '');
  // Keep the original fragment at the earlier property-manager feature.
  html = html.replace(/<h2>(Property[^<]*|[^<]*Property Managers[^<]*)<\/h2>/, '<h2 id="property-repair-list">$1</h2>');
  if (!html.includes('id="property-repair-list"')) html = html.replace('<section class="section shell" id="local-repair-requests">', '<section class="section shell" id="local-repair-requests"><span id="property-repair-list"></span>');
  html = html.replace(/<nav class="quick-paths"[\s\S]*?<\/nav>/, '<nav class="quick-paths" aria-label="Quick enquiry paths"><a href="./services/">Services</a><a href="./areas/">Areas</a><a href="./contact/">Enquire</a><a href="#repair-projects">Projects</a><a href="#repair-quote-process">Quotes</a><a href="#repair-planning-guides">Guides</a><a href="#contact-team">Contact</a></nav>');
  html = html.replace('<section class="cta-band">', '<section class="cta-band" id="contact-team">');
  return require('./render-home-clarity').renderHome(html);
}
function consolidateDirectory(html) {
  if (!html.includes('id="choose-your-work"')) html = html.replace('</p></div></section>', '</p><nav class="quick-paths" id="choose-your-work" aria-label="Choose your work"><a href="handyman-interiors-appliance-repairs/handymen/">Small repairs</a><a href="property-maintenance/">Property maintenance lists</a><a href="#service-groups">Specialist services</a></nav></div></section>');
  return require('./service-directory-clarity').directory(html);
}
function apply() {
  let changed = 0;
  const edit = (file, transform) => { const target = path.join(root, file), before = fs.readFileSync(target, 'utf8'), after = transform(before); if (before !== after) { fs.writeFileSync(target, after); changed++; } };
  const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir + '/' + e.name) : e.name === 'index.html' ? [dir + '/' + e.name] : []);
  for (const file of walk('services')) edit(file, file.endsWith('/handymen/index.html') ? require('./compact-handyman-page') : consolidateService);
  edit('services/index.html', consolidateDirectory);
  edit('index.html', consolidateHome);
  console.log(`Content consolidation: ${changed} pages changed.`);
  return changed;
}
module.exports = { consolidateService, consolidateHome, consolidateDirectory, syncFaq, plain, apply };
if (require.main === module) apply();
