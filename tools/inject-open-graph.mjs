import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root, { recursive: true })
  .filter((file) => file.endsWith('.html') && !path.basename(file).startsWith('google'));

const escape = (value) => value.replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const relative of htmlFiles) {
  const file = path.join(root, relative);
  let html = fs.readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1]?.trim();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)?.[1]?.trim();
  if (!title || !description || !canonical) throw new Error(`Missing title, description, or canonical: ${relative}`);
  html = html.replace(/<meta\s+(?:property=["']og:(?:title|description|url|type)["'][^>]*|name=["']twitter:card["'][^>]*)>/gi, '');
  const tags = `<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary">`;
  html = html.replace('</head>', `${tags}</head>`);
  fs.writeFileSync(file, html);
}
