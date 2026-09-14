const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contact = fs.readFileSync(path.join(__dirname, '..', 'contact', 'index.html'), 'utf8');

test('contact page uses a production enquiry title rather than a demo label', () => {
  const title = contact.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  assert.equal(title, 'Contact Ellis Services Group | Perth Property Services');
  assert.match(contact, /<meta name="description" content="Contact Ellis Services Group about a Perth property service request\. Browser form entries are not transmitted or stored automatically\.">/);
  assert.doesNotMatch(title, /\bDemo\b/i);
});

test('contact page exposes the approved written-enquiry email as a mailto link', () => {
  assert.match(contact, /href="mailto:handyman\.maintenance\.au@outlook\.com"/);
  assert.match(contact, />handyman\.maintenance\.au@outlook\.com</);
});

test('contact page remains explicit that the browser form does not transmit or store entries', () => {
  assert.match(contact, /does not transmit or store them/);
});
