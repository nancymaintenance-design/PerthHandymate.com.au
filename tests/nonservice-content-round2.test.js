'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { editHtml, plans } = require('../tools/nonservice-content-round2');
const root = path.resolve(__dirname, '..');

test('replacement rejects mixed completed and remaining original targets', () => {
  const plan = { replacements: [['<p>Old copy</p>', '<p>New copy</p>']] };
  for (const body of ['<p>New copy</p><p>Old copy</p><p>Old copy</p>', '<p>New copy</p><p>Old copy</p>', '<p>New copy</p><p>New copy</p>']) {
    assert.throws(() => editHtml('<main>' + body + '</main>', plan), /Ambiguous replacement/);
  }
  assert.equal(editHtml('<main><p>Old copy</p></main>', plan), '<main><p>New copy</p></main>');
  assert.equal(editHtml('<main><p>New copy</p></main>', plan), '<main><p>New copy</p></main>');
});

test('completed replacement may contain its original fragment without hiding another original target', () => {
  const plan = { replacements: [['<p>Old copy</p>', '<section><p>Old copy</p><p>Added advice</p></section>']] };
  const completed = '<main><section><p>Old copy</p><p>Added advice</p></section></main>';
  assert.equal(editHtml('<main><p>Old copy</p></main>', plan), completed);
  assert.equal(editHtml(completed, plan), completed);
  assert.throws(() => editHtml(completed.replace('</main>', '<p>Old copy</p></main>'), plan), /Ambiguous replacement/);
});

test('editor consolidates one planning section, edits its intended section and is idempotent', () => {
  const source = '<head><title>Keep</title></head><main><section id="keyword-planning-details"><h2>Old planning</h2><p>Overlap</p></section><section><h2>Decision</h2><p>Old body</p></section><section><h2>Keep</h2><p>Evidence</p></section></main><footer>NAP</footer>';
  const plan = { removePlanning: true, sections: [['Decision', '<p>A specific decision.</p>']] };
  const out = editHtml(source, plan);
  assert.equal(out, '<head><title>Keep</title></head><main><section><h2>Decision</h2><p>A specific decision.</p></section><section><h2>Keep</h2><p>Evidence</p></section></main><footer>NAP</footer>');
  assert.equal(editHtml(out, plan), out);
  assert.throws(() => editHtml(source, { sections: [['Missing', '<p>No</p>']] }), /Missing section/);
  assert.throws(() => editHtml(source.replace('</main>', '<section><h2>Decision</h2><p>Duplicate</p></section></main>'), plan), /Ambiguous section/);
});

test('FAQ editing synchronises answer text while preserving entity data and unrelated answers', () => {
  const entity = '{"@type":"Organization","name":"Ellis","@id":"keep"}';
  const faq = { '@type': 'FAQPage', mainEntity: [{ name: 'Photos?', acceptedAnswer: { '@type': 'Answer', text: 'Old' } }, { name: 'Keep?', acceptedAnswer: { text: 'Source answer' } }] };
  const source = `<script type="application/ld+json">${entity}</script><script type="application/ld+json">${JSON.stringify(faq)}</script><main><details><summary>Photos?</summary><p>Old</p></details><details><summary>Keep?</summary><p>Source answer</p></details></main>`;
  const plan = { faqs: [['Photos?', 'Are photos required?', 'Photos are optional. Read <a href="../guides/">repair advice</a>.']] };
  const out = editHtml(source, plan);
  assert.ok(out.includes(entity));
  const data = [...out.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m => JSON.parse(m[1]))[1];
  assert.equal(data.mainEntity[0].acceptedAnswer.text, 'Photos are optional. Read repair advice.');
  assert.equal(data.mainEntity[0].name, 'Are photos required?');
  assert.ok(out.includes('<summary>Are photos required?</summary>'));
  assert.equal(data.mainEntity[1].acceptedAnswer.text, 'Source answer');
  assert.ok(out.includes('<p>Source answer</p>'));
  assert.equal(editHtml(out, plan), out);
  assert.throws(() => editHtml(source, { faqs: [['Missing?', 'Missing?', 'No']] }), /Missing FAQ/);
});

test('all editorial plans are applied, repeat safely and remain within non-service ownership', () => {
  for (const [file, plan] of Object.entries(plans)) {
    assert.match(file, /^(?:index\.html|(?:about|contact|faq|guides|areas|projects)\/.*index\.html)$/);
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(editHtml(html, plan), html, `${file} has an unapplied editorial plan`);
  }
});

test('every visible FAQ answer agrees with its existing structured answer', () => {
  const files = ['faq/index.html', ...fs.readdirSync(path.join(root, 'guides')).filter(slug => fs.existsSync(path.join(root, 'guides', slug, 'index.html'))).map(slug => `guides/${slug}/index.html`)];
  const text = s => s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const faq = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1])).find(x => x['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<details\b[^>]*><summary>(.*?)<\/summary>(.*?)<\/details>/gs)].map(m => [text(m[1]), text(m[2])]);
    assert.equal(visible.length, faq.mainEntity.length, file);
    for (const [question, answer] of visible) {
      const entries = faq.mainEntity.filter(x => x.name === question);
      assert.equal(entries.length, 1, `${file}: ${question}`);
      assert.equal(text(entries[0].acceptedAnswer.text), answer, `${file}: ${question}`);
    }
  }
});
