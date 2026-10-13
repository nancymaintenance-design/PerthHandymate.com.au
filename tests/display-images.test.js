const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const names = ['air-conditioning','bathroom','carpentry','electrician','fly-screen-repairs','handyman','house-painting','lawn-mowing','plumber','roofing','tiling','window-repairs'].map(x => `icon-${x}`).concat('ellis-services-group-logo','instagram-icon');
function pages(dir = root) {
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? (['.git','.superpowers','dist','node_modules'].includes(e.name) ? [] : pages(path.join(dir,e.name))) : e.name.endsWith('.html') ? [path.join(dir,e.name)] : []);
}
test('live image requests use small valid lossless derivatives while retaining original sources', () => {
  const seen = new Set();
  for (const file of pages()) {
    const html = fs.readFileSync(file,'utf8');
    for (const match of html.matchAll(/<img\b[^>]*>/g)) {
      const tag = match[0], src = tag.match(/\bsrc="([^"]+)"/)?.[1];
      assert.doesNotMatch(tag, /drawer[^"<>]*(?:employee|during)/i);
      const stem = names.find(name => src?.includes(`/${name}.`));
      if (!stem) continue;
      seen.add(stem);
      assert.ok(src.endsWith('.webp'), `${file}: oversized original ${src}`);
      const bytes = fs.readFileSync(src.startsWith('/') ? path.join(root,src) : path.resolve(path.dirname(file),src));
      assert.equal(bytes.toString('ascii',0,4),'RIFF');
      assert.equal(bytes.toString('ascii',8,12),'WEBP');
      assert.equal(bytes.toString('ascii',12,16),'VP8L');
      const bits = bytes.readUInt32LE(21);
      const width = (bits & 0x3fff)+1, height = ((bits >>> 14)&0x3fff)+1;
      assert.ok(width <= (stem === 'instagram-icon' ? 36 : stem.includes('logo') ? 128 : 192));
      assert.ok(height > 0 && height <= 220);
      assert.ok(bytes.length <= (stem === 'instagram-icon' ? 10 : 50)*1024);
      assert.match(tag,/decoding="async"/);
      assert.match(tag,/\balt="[^"]*"/);
      assert.match(tag,/\bwidth="\d+"/);
      assert.match(tag,/\bheight="\d+"/);
      const displayWidth = Number(tag.match(/\bwidth="(\d+)"/)[1]);
      const displayHeight = Number(tag.match(/\bheight="(\d+)"/)[1]);
      assert.ok(Math.abs(displayHeight - height*displayWidth/width) <= 1, `${stem}: distorted dimensions`);
      if (!stem.includes('logo')) assert.match(tag,/loading="lazy"/);
    }
  }
  assert.equal(seen.size,14);
  for (const name of names) {
    const relative = `assets/images/${name}.png`;
    const original = execFileSync('git',['show',`18dd298:${relative}`],{cwd:root,maxBuffer:5*1024*1024});
    const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash(fs.readFileSync(path.join(root,relative))),hash(original),relative);
  }
});
test('homepage LCP hero retains eager high-priority responsive loading', () => {
  const hero = fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<img\b[^>]*class="hero-media"[^>]*>/)?.[0];
  assert.ok(hero);
  assert.match(hero,/fetchpriority="high"/);
  assert.match(hero,/srcset="[^"]+480w[^" ]*[^"]*960w[^"]*1440w"/);
  assert.match(hero,/sizes="100vw"/);
  assert.doesNotMatch(hero,/loading="lazy"/);
});
