const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contact = fs.readFileSync(path.join(__dirname, '..', 'contact', 'index.html'), 'utf8');

test('contact page uses a production enquiry title rather than a demo label', () => {
  const title = contact.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  assert.equal(title, 'Contact Ellis Services Group | Perth Home Maintenance');
  assert.match(contact, /<meta name="description" content="Contact Ellis Services Group for Perth home maintenance and trade service enquiries\.">/);
  assert.doesNotMatch(title, /\bDemo\b/i);
});

test('contact page exposes the approved written-enquiry email as a mailto link', () => {
  assert.match(contact, /href="mailto:handyman\.maintenance\.au@outlook\.com"/);
  assert.match(contact, />handyman\.maintenance\.au@outlook\.com</);
});

test('contact page uses the same-origin enquiry delivery endpoint', () => {
  assert.match(contact, /data-contact-endpoint="\/api\/contact"/);
  assert.match(contact, /Online delivery is enabled once Resend is configured for this deployment\./);
});
