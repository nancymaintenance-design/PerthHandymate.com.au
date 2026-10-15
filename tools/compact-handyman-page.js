'use strict';
const fs = require('node:fs'), path = require('node:path');
const { consolidateService } = require('./consolidate-content');
// Current owner includes later diagnostic anchors and supplemental routes.
// The price renderer owns its block; never restore an older price projection.
module.exports = function compactHandymanPage(html) {
  const price = html.match(/<div class="shell price-guide"[\s\S]*?<\/div>/)?.[0];
  if (!price) throw new Error('Missing current Handymen price block');
  const body = fs.readFileSync(path.join(__dirname, '../data/handyman-body.inc'), 'utf8').trimEnd().replace('{{PRICE_GUIDE}}', price);
  return consolidateService(html.replace(/<main\b[\s\S]*?<\/main>/, body));
};
