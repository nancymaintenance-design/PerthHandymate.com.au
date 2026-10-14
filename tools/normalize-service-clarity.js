'use strict';
const fs = require('node:fs');
const path = require('node:path');

// Presentation-only, idempotent adapter for maintained legacy service generators.
// Keeps original headings, body, anchors, prices and FAQ answers verbatim.
function normalizeServiceClarity(html) {
  html = html.replace(/(<section\b[^>]*id="service-work-options"[^>]*>)([\s\S]*?)(<\/section>)/g, (all, open, body, close) => {
    if (!body.includes('class="service-quote-factors"')) {
      body = body.replace(/(<h3>What Affects the Quote\?<\/h3><p>[\s\S]*?<\/p>)/, '<div class="service-quote-factors">$1</div>');
    }
    if (!body.includes('class="service-related-links"')) {
      body = body.replace(/(<h3>Related Services for This Job<\/h3>)<ul>([\s\S]*?)<\/ul>/, '<div class="service-related-links">$1<ul class="service-link-cards">$2</ul></div>');
    }
    return open + body + close;
  });
  return html.replace(/(<section class="section shell service-questions">)([\s\S]*?)(<\/section>)/g, (all, open, body, close) => {
    if (body.includes('class="service-scope-panel"')) return all;
    // The accordion owns questions only; scope and preparation remain visible,
    // independently headed panels rather than appearing to belong to the final answer.
    body = body.replace(/(<div class="accordion-list"[^>]*>[\s\S]*?<\/div>)([\s\S]+)/, (match, faq, scope) => {
      if (!scope.trim()) return match;
      const split = scope.search(/<h3>[^<]*(?:On-site Checks|Arrange Your)/);
      if (split < 0) return faq + '<div class="service-scope-panel">' + scope + '</div>';
      return faq + '<div class="service-scope-panel">' + scope.slice(0, split) + '</div><div class="service-preparation-panel">' + scope.slice(split) + '</div>';
    });
    return open + body + close;
  });
}

function apply(root = path.resolve(__dirname, '..')) {
  let changed = 0;
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name === 'index.html') {
        const before = fs.readFileSync(file, 'utf8'), after = normalizeServiceClarity(before);
        if (after !== before) { fs.writeFileSync(file, after); changed++; }
      }
    }
  };
  walk(path.join(root, 'services'));
  return changed;
}
if (require.main === module) console.log(JSON.stringify({serviceClarityPages:apply(process.argv[2])}));
module.exports = {normalizeServiceClarity, apply};
