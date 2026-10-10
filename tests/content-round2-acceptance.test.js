const test = require('node:test');
const assert = require('node:assert/strict');
const { auditPage, resolveLocalLink, coverageRows, coverageMarkdown, run } = require('../tools/content-round2-acceptance');
const path = require('node:path');

const origin = 'https://www.perthhandymate.com.au';
const fixture = (body, faq) => `<link rel="canonical" href="${origin}/guide/"><main><h1>Guide</h1>${body}</main>${faq ? `<script type="application/ld+json">${JSON.stringify(faq)}</script>` : ''}`;

test('acceptance compares FAQ questions and full normalized answer text, not counts', () => {
  const schema = { '@graph': [{ '@type': 'FAQPage', mainEntity: [{ name: 'Photos?', acceptedAnswer: { text: 'Photos are optional. Read advice.' } }] }] };
  const html = fixture('<details><summary>Photos?</summary><p>Photos are optional. Read <a href="/advice/">advice</a>.</p></details>', schema);
  assert.deepEqual(auditPage(html, '/guide/').issues, []);
  assert.ok(auditPage(html.replace('Photos are optional. Read <a', 'Photos are required. Read <a'), '/guide/').issues.some(x => /FAQ answer/.test(x)));
  assert.ok(auditPage(html.replace('<summary>Photos?', '<summary>Required?'), '/guide/').issues.some(x => /FAQ question/.test(x)));
});

test('acceptance detects heading jumps, wrong canonical and research leaks without requiring FAQ schema', () => {
  assert.deepEqual(auditPage(fixture('<h2>Scope</h2><details><summary>Question?</summary><p>Answer.</p></details>'), '/guide/').issues, []);
  const issues = auditPage(fixture('<h3>Skipped</h3><p>HM0527 中文</p>'), '/other/').issues;
  for (const kind of ['Heading', 'canonical', 'research']) assert.ok(issues.some(x => x.includes(kind)), kind);
});

test('local links resolve relative/index routes, queries and decoded fragments', () => {
  const html = '<h2 id="minor-floor-repairs">Flooring</h2><div id="room & door"></div>';
  const read = route => route === '/services/handyman/' ? html : null;
  assert.equal(resolveLocalLink('../handyman/index.html?q=door#minor-floor-repairs', '/services/other/', read), null);
  assert.equal(resolveLocalLink('#room%20%26%20door', '/services/handyman/', read), null);
  assert.match(resolveLocalLink('#missing', '/services/handyman/', read), /Missing fragment/);
  assert.match(resolveLocalLink('/missing/', '/guide/', read), /Missing destination/);
  assert.equal(resolveLocalLink('https://example.org/', '/guide/', read), null);
});

test('coverage rejects duplicate and missing decisions and records kept-page intent evidence', () => {
  const pages = [{ path: '/one/', type: 'guide', mainWordCount: 20 }, { path: '/two/', type: 'privacy', mainWordCount: 10 }];
  const decisions = '| /one/ | Change | Better answer |\n| /two/ | Keep | Privacy purpose |';
  const rows = coverageRows(pages, decisions, new Set(['/one/']), new Map([['/two/', 'Voluntary information, uses and contact are present.']]));
  assert.equal(rows[1].decision, 'Keep');
  assert.match(rows[1].acceptanceEvidence, /Voluntary/);
  assert.throws(() => coverageRows(pages, decisions + '\n| /one/ | Change | Again |', new Set()), /Duplicate/);
  assert.throws(() => coverageRows(pages, '| /one/ | Change | Better |', new Set()), /Missing/);
});

test('all 114 accepted pages and 527 term routes resolve headings, FAQ semantics and local fragments', () => {
  const result = run(path.resolve(__dirname, '..'));
  assert.deepEqual(result.summary.issues, []);
  assert.equal(result.summary.pagesReviewed, 114);
  assert.equal(result.summary.pagesChanged, 99);
  assert.equal(result.summary.pagesKept, 15);
  assert.equal(result.summary.termRoutes, 527);
});

test('coverage introduction and rows use the supplied acceptance totals', () => {
  const result = { summary: { pagesReviewed: 3, pagesChanged: 2, pagesKept: 1 }, coverage: [
    { path: '/one/', type: 'guide', decision: 'Change', editorialDecision: 'Clear | answer', acceptanceEvidence: 'Pass', mainWords: 20 },
    { path: '/two/', type: 'guide', decision: 'Change', editorialDecision: 'Answer', acceptanceEvidence: 'Pass', mainWords: 30 },
    { path: '/three/', type: 'privacy', decision: 'Keep', editorialDecision: 'Privacy', acceptanceEvidence: 'Present', mainWords: 10 }
  ] };
  assert.equal(typeof coverageMarkdown, 'function', 'the artifact formatter must accept fixture results');
  const markdown = coverageMarkdown(result);
  assert.match(markdown, /3页逐页审阅；2页有公开HTML修改，1页基于各自用途保留/);
  assert.doesNotMatch(markdown, /114页|99页|15页/);
  assert.match(markdown, /Clear \\\| answer/);
  assert.equal(markdown.split('\n').filter(line => line.startsWith('| /')).length, 3);
});
