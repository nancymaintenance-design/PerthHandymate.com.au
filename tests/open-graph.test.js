import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root, { recursive: true })
  .filter((file) => file.endsWith('.html') && !path.basename(file).startsWith('google'));

test('every indexable HTML document has Open Graph title, description, URL and type', () => {
  const missing = [];
  for (const relative of htmlFiles) {
    const html = fs.readFileSync(path.join(root, relative), 'utf8');
    for (const property of ['og:title', 'og:description', 'og:url', 'og:type']) {
      if (!new RegExp(`property=["']${property}["']`, 'i').test(html)) missing.push(`${relative}: ${property}`);
    }
    assert.doesNotMatch(html, /property=["']og:(?:title|description)["'][^>]*&amp;amp;/i, `${relative}: Open Graph content must not double-encode entities`);
  }
  assert.deepEqual(missing, []);
});
