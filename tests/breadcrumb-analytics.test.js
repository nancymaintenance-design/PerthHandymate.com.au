const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cheerio = require('cheerio');
const script = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../typescript/assets/js/analytics.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }
}).outputText;

// A small DOM adapter keeps the real parsed breadcrumb nesting and attributes.
function page({ hostname = 'www.perthhandymate.com.au', pathname = '/services/repairs/', href = 'https://www.perthhandymate.com.au/services/?email=private#details', owner = 'perth-handymate', nav = true, repeats = 1 } = {}) {
  const $ = cheerio.load(`<${nav ? 'nav' : 'div'} class="breadcrumbs" data-owner-id="${owner}"><ol><li><a href="https://www.perthhandymate.com.au/">Home</a></li><li><a id="target" href="${href}"><span>Services</span></a></li><li aria-current="page">Current</li></ol></${nav ? 'nav' : 'div'}><a id="phone" href="tel:+61403069685">Call</a>`);
  const wrappers = new Map();
  function element(node) {
    if (!node) return null;
    if (wrappers.has(node)) return wrappers.get(node);
    const wrapped = {
      closest: selector => element($(node).closest(selector)[0]),
      getAttribute: key => $(node).attr(key) ?? null,
      querySelectorAll: selector => $(node).find(selector).toArray().map(element),
      contains: other => !!other && (wrapped === other || $(node).find('*').toArray().some(child => element(child) === other)),
      parentElement: null
    };
    wrappers.set(node, wrapped);
    wrapped.parentElement = element(node.parent && node.parent.type !== 'root' ? node.parent : null);
    return wrapped;
  }
  const events = [], handlers = [];
  const window = { location: { hostname, pathname, origin: `https://${hostname}` }, document: { addEventListener: (type, callback) => { if (type === 'click') handlers.push(callback); } }, gtag: (...args) => events.push(JSON.parse(JSON.stringify(args))) };
  const context = vm.createContext({ window, URL });
  for (let i = 0; i < repeats; i++) vm.runInContext(script, context);
  return { events, window, click: selector => handlers.forEach(handler => handler({ target: element($(selector)[0]) })) };
}

test('breadcrumb clicks send only bounded navigation fields and strip URL query/hash', () => {
  const p = page();
  p.click('#target span');
  assert.deepEqual(p.events, [['event', 'breadcrumb_click', { source_path: '/services/repairs/', target_path: '/services/', locale: 'en-AU', position: 2, owner_id: 'perth-handymate' }]]);
});

test('Chinese breadcrumb locale follows the source path', () => {
  const p = page({ pathname: '/zh/services/repairs/', href: 'https://www.perthhandymate.com.au/zh/services/' });
  p.click('#target');
  assert.equal(p.events[0]?.[2].locale, 'zh-Hans');
});

test('English and Chinese homepage ancestors remain trackable', () => {
  for (const [pathname, href, expected] of [
    ['/services/repairs/', 'https://www.perthhandymate.com.au/', '/'],
    ['/zh/services/repairs/', 'https://www.perthhandymate.com.au/zh/', '/zh/']
  ]) {
    const p = page({ pathname, href }); p.click('#target');
    assert.equal(p.events[0]?.[2].target_path, expected);
  }
});

test('loading analytics twice emits one breadcrumb and one phone event per click', () => {
  const p = page({ repeats: 2 });
  p.click('#target'); p.click('#phone');
  assert.deepEqual(p.events.map(event => event[1]), ['breadcrumb_click', 'phone_click']);
  assert.deepEqual(p.events[1][2], { method: 'phone', page_path: '/services/repairs/' });
});

test('breadcrumbs reject preview traffic, non-navigation markup, invalid owners and unsafe destinations', () => {
  for (const options of [
    { hostname: 'localhost' }, { hostname: 'preview.vercel.app' }, { nav: false }, { owner: '' }, { owner: 'private@example.com' },
    { href: 'https://example.com/services/' }, { href: 'https://perthhandymate.com.au/services/' },
    { href: '/services/' }, { href: 'javascript:alert(1)' }, { href: 'https://[' },
    { href: 'https://user:secret@www.perthhandymate.com.au/services/' },
    { href: 'https://www.perthhandymate.com.au/private@example.com/' },
    { href: 'https://www.perthhandymate.com.au/%70rivate/' },
    { pathname: '/private@example.com/' }, { pathname: '/%70rivate/' }
  ]) {
    const p = page(options); p.click('#target');
    assert.deepEqual(p.events, [], JSON.stringify(options));
  }
});

test('existing contact success/error contracts remain bounded', () => {
  const p = page();
  p.window.EllisAnalytics.contactResult(false); p.window.EllisAnalytics.contactResult(true);
  p.window.EllisAnalytics.track('unknown', { email: 'private@example.com' });
  p.window.EllisAnalytics.track('breadcrumb_click', { source_path: '/private/', target_path: '/', locale: 'en-AU', position: 1, owner_id: 'general' });
  assert.deepEqual(p.events, [
    ['event', 'contact_form_error', { method: 'contact_form', page_path: '/services/repairs/' }],
    ['event', 'generate_lead', { method: 'contact_form', page_path: '/services/repairs/' }]
  ]);
});
