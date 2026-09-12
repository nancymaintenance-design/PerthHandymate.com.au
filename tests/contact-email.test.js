const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contact = fs.readFileSync(path.join(__dirname, '..', 'contact', 'index.html'), 'utf8');

test('contact page uses the approved enquiry email without demo title wording', () => {
  assert.doesNotMatch(contact, /<title>[^<]*demo[^<]*<\/title>/i);
  assert.match(contact, /href="mailto:handyman\.maintenance\.au@outlook\.com"/i);
  assert.match(contact, />handyman\.maintenance\.au@outlook\.com</i);
});
