#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const origin = 'https://www.perthhandymate.com.au';
const siteRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const ignored = new Set(['.git', '.superpowers', 'dist', 'node_modules', 'docs', 'tests', 'tools', 'scripts']);
function decode(value) {
  return value.replace(/&#(?:x([\da-f]+)|(\d+));|&(amp|quot|apos|lt|gt|#39);/gi, (entity, hex, decimal, named) => {
    if (hex || decimal) return String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10));
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', '#39': "'" }[named.toLowerCase()];
  });
}
function escape(value) {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].toLowerCase(), decode(m[3])]));
}
function localImage(src, canonical) {
  try {
    const url = new URL(src, canonical);
    if (url.origin !== origin || url.search || url.hash) return null;
    const file = path.resolve(siteRoot, '.' + decodeURIComponent(url.pathname));
    const relative = path.relative(siteRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !/\.(webp|png|jpe?g)$/i.test(file) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
    return url.href;
  } catch { return null; }
}
function shareImage(html, canonical) {
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || '';
  for (const [tag] of main.matchAll(/<img\b[^>]*>/gi)) {
    const a = attrs(tag);
    // Skip decorative/social icons. Retain the actual before/after image wording.
    if (!a.alt || !(Number(a.width) >= 600 && Number(a.height) >= 300)) continue;
    const url = a.src && localImage(a.src, canonical);
    if (url) return { url, alt: a.alt, card: 'summary_large_image' };
  }
  const url = localImage('/assets/images/ellis-services-group-logo.webp', canonical);
  if (!url) throw new Error('Missing existing company logo for share fallback');
  return { url, alt: 'Ellis Services Group logo', card: 'summary' };
}
function normalize(html) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i);
  if (!head) return html;
  const title = head[1].match(/<title\b[^>]*>([^<]*)<\/title>/i)?.[1];
  const tags = [...head[1].matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m => attrs(m[0]));
  const description = tags.find(a => a.name === 'description')?.content;
  const canonical = tags.find(a => a.rel === 'canonical')?.href;
  if (!title || !description || !canonical) return html; // Excludes verification tokens.
  if (new URL(canonical).origin !== origin) throw new Error(`Unexpected canonical origin: ${canonical}`);
  const image = shareImage(html, canonical);
  const values = [
    ['property', 'og:type', 'website'], ['property', 'og:site_name', 'Ellis Services Group'],
    ['property', 'og:title', decode(title)], ['property', 'og:description', description],
    ['property', 'og:url', canonical], ['property', 'og:image', image.url], ['property', 'og:image:alt', image.alt],
    ['name', 'twitter:card', image.card], ['name', 'twitter:title', decode(title)],
    ['name', 'twitter:description', description], ['name', 'twitter:image', image.url], ['name', 'twitter:image:alt', image.alt],
  ];
  const cleaned = head[1].replace(/<meta\b[^>]*>/gi, tag => /^(?:og:|twitter:)/i.test(attrs(tag).property || attrs(tag).name || '') ? '' : tag);
  const metadata = values.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escape(value)}">`).join('');
  return html.replace(head[0], () => head[0].replace(head[1], () => cleaned + metadata));
}
let pages = 0, changed = 0;
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) walk(file);
    else if (entry.isFile() && entry.name.endsWith('.html')) {
      const current = fs.readFileSync(file, 'utf8');
      const updated = normalize(current);
      if (updated.includes('property="og:title"')) pages++;
      if (updated !== current) { fs.writeFileSync(file, updated); changed++; }
    }
  }
}
walk(siteRoot);
console.log(`Normalized share metadata on ${pages} pages; changed ${changed} HTML files.`);
