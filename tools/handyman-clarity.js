'use strict';
// Keep the compact landing readable after every maintenance/consolidation pass.
const { plain } = require('./consolidate-content');
const topicIds = [
  'outdoor-posts-and-wall-fixtures', 'pet-flaps-and-panel-type',
  'floor-edge-movement-and-moisture', 'surface-cleaning-and-material-risk',
  'older-residents-and-support-rails', 'patio-supports-and-eaves-material'
];
const planningIds = [
  'choosing-small-repairs', 'strata-maintenance', 'vacate-repairs',
  'grouping-repair-jobs', 'quote-inclusions-and-business-checks',
  'requested-deadlines-and-immediate-danger'
];
function elementById(html, id) {
  const start = new RegExp('<(div|article|details)\\b[^>]* id="' + id + '"[^>]*>').exec(html);
  if (!start) return null;
  const tag = start[1], tokens = new RegExp('<\\/?' + tag + '\\b[^>]*>', 'g');
  tokens.lastIndex = start.index;
  let depth = 0, token;
  while ((token = tokens.exec(html))) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (!depth) return { tag, html: html.slice(start.index, tokens.lastIndex) };
  }
  throw new Error('Unclosed Handymen block: ' + id);
}
function disclose(block, id) {
  if (block.tag === 'details') return block.html;
  const heading = block.html.match(/<h3>([\s\S]*?)<\/h3>/);
  if (!heading) throw new Error('Missing Handymen topic heading: ' + id);
  const content = block.html.replace(/^<[^>]+>/, '').replace(/<\/(?:div|article)>$/, '').replace(heading[0], '');
  return '<details class="handyman-topic-card" id="' + id + '"><summary>' + heading[1] + '</summary><div class="handyman-topic-content">' + content + '</div></details>';
}
function syncServiceFaq(html) {
  const sections = [...html.matchAll(/<section\b[^>]*class="[^"]*service-questions[^"]*"[^>]*>[\s\S]*?<\/section>/g)];
  const questions = sections.flatMap(([section]) => [...section.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g)].map(([,q,a]) => ({
    '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) }
  })));
  return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g, (all,a,source,b) => {
    const json = JSON.parse(source); let changed = false;
    for (const block of json['@graph'] || [json]) if (block['@type'] === 'FAQPage') { block.mainEntity = questions; changed = true; }
    return changed ? a + JSON.stringify(json) + b : all;
  });
}
module.exports = function handymanClarity(html) {
  const topics = [];
  for (const id of topicIds) {
    const block = elementById(html,id);
    if (!block) throw new Error('Missing Handymen topic: ' + id);
    if (!html.includes('class="handyman-topic-grid"')) {
      topics.push(disclose(block,id));
      html = html.replace(block.html,'');
    }
  }
  if (topics.length) html = html.replace('<div id="choosing-small-repairs">', '<h2 class="handyman-details-heading">Repair details by task</h2><div class="handyman-topic-grid">' + topics.join('') + '</div><div id="choosing-small-repairs">');
  for (const id of planningIds) {
    const block = elementById(html,id);
    if (block) html = html.replace(block.html,disclose(block,id));
  }
  // A disclosure label remains the semantic heading for its retained h4 topics.
  html = html.replace(/(<details class="handyman-topic-card" id="[^"]+"><summary>)([\s\S]*?)(<\/summary>)/g,
    (all,open,label,close) => open + (label.startsWith('<h3>') ? label : '<h3>' + label + '</h3>') + close);
  const educational = {
    'Why do outdoor wall fixings loosen over time?': 'outdoor-posts-and-wall-fixtures',
    'Why is laminate lifting at its edges?': 'floor-edge-movement-and-moisture',
    'Should moisture damage be addressed before floorboard replacement?': 'floor-edge-movement-and-moisture',
    'Can pressure cleaning damage pavers or grout?': 'surface-cleaning-and-material-risk'
  };
  const originalFaq = html.match(/<section[^>]*id="maintenance-task-questions"[\s\S]*?<\/section>/)?.[0];
  if (originalFaq) {
    const cleanedFaq = originalFaq.replace(/<details><summary>(.*?)<\/summary>([\s\S]*?)<\/details>/g, (item,q,answer) => {
      const destination = educational[plain(q)];
      if (!destination) return item;
      const explanation = '<div class="handyman-explanation"><h4>' + q + '</h4>' + answer + '</div>';
      const block = elementById(html,destination);
      if (!block.html.includes('<h4>' + q + '</h4>')) {
        // The topic content and details are the final two closing elements.
        html = html.replace(block.html,block.html.replace(/<\/div><\/details>$/,explanation + '</div></details>'));
      }
      return '';
    });
    html = html.replace(originalFaq, cleanedFaq);
  }
  if (!html.includes('assets/css/handyman-clarity.css')) html = html.replace('</head>','<link rel="stylesheet" href="../../../assets/css/handyman-clarity.css"></head>');
  if (!html.includes('assets/js/handyman-clarity.js')) html = html.replace('</body>','<script src="../../../assets/js/handyman-clarity.js"></script></body>');
  return syncServiceFaq(html);
};
