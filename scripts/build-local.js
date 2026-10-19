// Generated from typescript/scripts/build-local.ts; edit the TypeScript source.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
// Match the public inputs in vercel.json without relying on Unix shell tools.
const publishedEntries = [
    ...fs.readdirSync(root).filter(file => /\.(?:html|ico|png)$/.test(file)),
    'about', 'areas', 'assets', 'contact', 'data', 'faq', 'guides',
    'privacy', 'projects', 'robots.txt', 'services', 'site.webmanifest', 'sitemap.xml',
];
// Keep the last working preview intact if an edit has no Chinese counterpart.
execFileSync(process.execPath, [path.join(__dirname, 'build-locales.js'), '--check'], { cwd: root, stdio: 'inherit' });
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output);
for (const entry of publishedEntries) {
    fs.cpSync(path.join(root, entry), path.join(output, entry), { recursive: true });
}
execFileSync(process.execPath, [path.join(__dirname, 'normalize-index-links.js'), output], {
    cwd: root,
    stdio: 'inherit',
});
execFileSync(process.execPath, [path.join(__dirname, 'build-locales.js')], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, [path.join(__dirname, 'enrich-structured-data.js')], { cwd: root, stdio: 'inherit' });
