'use strict';
// Targeted editor for the reviewed non-service pages; it does not rebuild dist.
const { plans } = require('./nonservice-content-round2-copy');
const plain = s => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
function once(html, from, to) {
  // Ignore original fragments inside a complete replacement, but reject old
  // targets elsewhere and duplicate completed targets as ambiguous input.
  const parts = html.split(to), completed = parts.length - 1;
  const n = parts.reduce((count, part) => count + part.split(from).length - 1, 0);
  if (completed === 1 && n === 0) return html;
  if (completed) throw new Error(`Ambiguous replacement: ${from.slice(0, 70)}`);
  if (n === 1) return html.replace(from, to);
  throw new Error(`${n ? 'Ambiguous' : 'Missing'} replacement: ${from.slice(0, 70)}`);
}
function editHtml(html, plan) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];
  if (!main) throw new Error('Missing main');
  let edited = main;
  if (plan.removePlanning) edited = edited.replace(/<section id="keyword-planning-details">[\s\S]*?<\/section>/, '');
  for (const [from, to] of plan.renameSections || []) edited = once(edited, `<h2>${from}</h2>`, `<h2>${to}</h2>`);
  for (const [heading, body] of plan.sections || []) {
    let count = 0;
    edited = edited.replace(/<section\b[^>]*><h2>(.*?)<\/h2>[\s\S]*?<\/section>/gs, block => {
      if (!block.startsWith('<section><h2>'+heading+'</h2>')) return block;
      count++;
      return `<section><h2>${heading}</h2>${body}</section>`;
    });
    if (count !== 1) throw new Error(`${count ? 'Ambiguous' : 'Missing'} section: ${heading}`);
  }
  for (const [from, to] of plan.replacements || []) edited = once(edited, from, to);
  for (const [marker, addition] of plan.before || []) if (!edited.includes(addition)) edited = once(edited, marker, addition+marker);
  html = html.replace(main, edited);
  for (const [question, nextQuestion, answer] of plan.faqs || []) {
    let count = 0;
    html = html.replace(/<details\b[^>]*><summary>(.*?)<\/summary>[\s\S]*?<\/details>/gs, (block, q) => {
      if (![question, nextQuestion].includes(plain(q))) return block;
      count++;
      return `<details><summary>${nextQuestion}</summary><p>${answer}</p></details>`;
    });
    if (count !== 1) throw new Error(`${count ? 'Ambiguous' : 'Missing'} FAQ: ${question}`);
    html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (block, open, source, close) => {
      const json = JSON.parse(source);
      let changed = false;
      for (const faq of (json['@graph'] || [json]).filter(x => x['@type'] === 'FAQPage')) {
        for (const q of faq.mainEntity || []) if ([question, nextQuestion].includes(q.name)) {
          if (q.name !== nextQuestion || q.acceptedAnswer.text !== plain(answer)) {
            q.name = nextQuestion; q.acceptedAnswer.text = plain(answer); changed = true;
          }
        }
      }
      return changed ? open+JSON.stringify(json)+close : block;
    });
  }
  if (plan.updateDate) html = html.replace(/Updated 2026-10-09/g, 'Updated 2026-10-10');
  return html;
}
module.exports = { editHtml, plans };
if (require.main === module) {
  const fs = require('node:fs'), path = require('node:path');
  const root = path.resolve(__dirname, '..');
  const outputs = Object.entries(plans).map(([file, plan]) => {
    const target = path.join(root, file), source = fs.readFileSync(target, 'utf8');
    return { file, target, source, result: editHtml(source, plan) };
  });
  let changed = 0;
  for (const item of outputs) if (item.source !== item.result) { fs.writeFileSync(item.target, item.result); changed++; }
  console.log(`Reviewed ${outputs.length} planned non-service pages; changed ${changed}.`);
}
