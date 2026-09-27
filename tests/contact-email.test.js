const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const contact = fs.readFileSync(path.join(__dirname, '..', 'contact', 'index.html'), 'utf8');

test('contact page uses a production enquiry title rather than a demo label', () => {
  const title = contact.match(/<title>([^<]+)<\/title>/)?.[1] || '';
  assert.equal(title, 'Contact Ellis Services Group | Perth Property Services');
  assert.match(contact, /<meta name="description" content="Contact Ellis Services Group about Perth property maintenance, repairs and improvement requests\.">/);
  assert.doesNotMatch(title, /\bDemo\b/i);
});

test('contact page exposes the approved written-enquiry email as a mailto link', () => {
  assert.match(contact, /href="mailto:handyman\.maintenance\.au@outlook\.com"/);
  assert.match(contact, />handyman\.maintenance\.au@outlook\.com</);
});

test('public contact content contains no draft, non-delivery or coverage-qualification language', () => {
  const publicHtml = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      if (entry.isFile() && entry.name.endsWith('.html')) publicHtml.push(fs.readFileSync(target, 'utf8'));
    }
  };
  const root = path.join(__dirname, '..');
  for (const entry of ['404.html', 'index.html']) publicHtml.push(fs.readFileSync(path.join(root, entry), 'utf8'));
  for (const directory of ['about', 'areas', 'contact', 'faq', 'guides', 'services']) walk(path.join(root, directory));
  assert.doesNotMatch(publicHtml.join('\n'), /Local website candidate|No online form data is transmitted|does not transmit or store|No recipient or sending service is configured|not sent|not a live availability|not a promise of full coverage|Representative suburbs include|coverage still depends/i);
});
