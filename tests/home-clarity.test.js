const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { renderHome } = require('../tools/render-home-clarity');
const { guides } = require('../data/guide-library');
const root = path.resolve(__dirname, '..');
const home = () => fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const plain = s => s.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').replace(/\s+/g, ' ').trim();
test('homepage preserves complete H1 semantics and removes only requested home blocks', () => {
  const html = home();
  assert.equal(plain(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), 'Handyman Services Perth for Home Repairs & Maintenance');
  assert.doesNotMatch(html, /repair-quote-process|local-repair-requests/);
  assert.match(html, /<\/address><p class="home-office-phone"><a href="tel:\+61403069685">0403 069685<\/a>/);
  assert.equal(renderHome(html), html, 'maintenance pass is deterministic and idempotent');
});
test('all thirteen case rows retain images, links, order and alternation', () => {
  const before = execFileSync('git', ['show', 'HEAD:index.html'], { cwd: root, encoding: 'utf8' });
  const extract = h => h.match(/<div class="project-feature-list">([\s\S]*?)<\/section>/)[1];
  const normalize = h => h.replace(/<h[23]>/g, '<h3>').replace(/<\/h[23]>/g, '</h3>');
  const cases = extract(home());
  assert.equal((cases.match(/class="support-feature(?: |")/g) || []).length, 13);
  assert.equal(normalize(cases), normalize(extract(before)), 'all approved case content is retained verbatim apart from semantic heading levels');
  assert.doesNotMatch(cases, /<h2>/);
  assert.match(home(), /project-feature" id="repair-projects"/);
});
test('all twelve homepage cards use maintained titles, excerpts and static destinations', () => {
  const html = home();
  const cards = [...html.matchAll(/<article class="home-guide-card">([\s\S]*?)<\/article>/g)];
  assert.equal(cards.length, 12);
  for (const guide of guides) {
    const matches = cards.filter(card => card[1].includes(`href="guides/${guide.slug}/"`));
    assert.equal(matches.length, 1, guide.slug);
    assert.equal(plain(matches[0][1].match(/<h3>(.*?)<\/h3>/s)[1]), guide.title);
    assert.equal(plain(matches[0][1].match(/<p>(.*?)<\/p>/s)[1]), guide.description);
  }
  assert.match(html, /home-guides-controls" hidden/);
  assert.match(html, /id="home-guide-track" tabindex="0" role="group"/);
});
test('manual controls, keyboard and reduced motion work without timers', () => {
  const events = {}, previous = {}, next = {}, position = {}, controls = { hidden: true };
  const on = (object, name) => object.addEventListener = (event, listener) => events[name + ':' + event] = listener;
  on(previous, 'prev'); on(next, 'next');
  const moves = [];
  const track = { scrollLeft: 0, scrollWidth: 1200, clientWidth: 300, getBoundingClientRect: () => ({ left: 0 }), scrollTo: options => moves.push(options) };
  track.children = Array.from({ length: 12 }, (_, i) => ({ getBoundingClientRect: () => ({ left: i * 100 - track.scrollLeft }) }));
  on(track, 'track');
  const section = { querySelector: key => ({ '.home-guides-controls': controls, '[data-guide-prev]': previous, '[data-guide-next]': next, '[data-guide-position]': position })[key] };
  const media = { matches: true }, window = { matchMedia: () => media };
  on(window, 'window');
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/home-guides.js'), 'utf8'), { document: { getElementById: id => id === 'home-guide-track' ? track : section }, window });
  assert.equal(controls.hidden, false); assert.equal(previous.disabled, true); assert.equal(next.disabled, false);
  events['next:click'](); assert.equal(moves.at(-1).left, 96); assert.equal(moves.at(-1).behavior, 'instant');
  media.matches = false;
  let prevented = false;
  events['track:keydown']({ target: track, key: 'End', preventDefault: () => prevented = true });
  assert.ok(prevented); assert.equal(moves.at(-1).left, 1096); assert.equal(moves.at(-1).behavior, 'smooth');
  track.scrollLeft = 900; events['track:scroll'](); assert.equal(next.disabled, true);
});
