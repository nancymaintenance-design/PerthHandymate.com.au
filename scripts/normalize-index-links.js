const fs = require('node:fs');
const path = require('node:path');

const siteRoot = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const canonicalOrigin = 'https://www.perthhandymate.com.au';
let changedFiles = 0;
let changedLinks = 0;

function normalizeHref(href) {
  if (/^(?:#|mailto:|tel:|javascript:)/i.test(href)) return href;
  const cut = href.search(/[?#]/);
  const pathname = cut < 0 ? href : href.slice(0, cut);
  const suffix = cut < 0 ? '' : href.slice(cut);
  if (/^https?:\/\//i.test(pathname) && !pathname.startsWith(`${canonicalOrigin}/`)) return href;
  if (!/(?:^|\/)index\.html$/i.test(pathname)) return href;
  return `${pathname.slice(0, -'index.html'.length) || './'}${suffix}`;
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'tests'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!entry.name.endsWith('.html')) continue;
    const source = fs.readFileSync(file, 'utf8');
    const updated = source.replace(/<a\b[^>]*>/gi, (tag) => tag.replace(/\bhref=(["'])([^"']+)\1/i, (attribute, quote, href) => {
      const canonical = normalizeHref(href);
      if (canonical !== href) changedLinks++;
      return `href=${quote}${canonical}${quote}`;
    }));
    if (updated !== source) {
      fs.writeFileSync(file, updated);
      changedFiles++;
    }
  }
}

walk(siteRoot);
console.log(`Canonicalized ${changedLinks} internal index.html links in ${changedFiles} HTML files.`);
