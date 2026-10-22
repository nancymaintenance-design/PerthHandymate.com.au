// Generated from typescript/scripts/lib/service-body-language.ts; edit the TypeScript source.
// Exact, route-scoped bilingual body edits. This is the final copy layer after
// customer-voice normalisation, so historical generators cannot restore old prose.
const bodyFs = require('node:fs');
const bodyPath = require('node:path');
const bodyPages = JSON.parse(bodyFs.readFileSync(bodyPath.resolve(__dirname, '../../config/service-body-language.json'), 'utf8'));
const bodyEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const bodyPlain = (s) => s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|rsquo|lsquo);|&#(?:x[\da-f]+|\d+);/gi, entity => {
    const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ', '&rsquo;': '’', '&lsquo;': '‘' };
    return named[entity] ?? String.fromCodePoint(parseInt(entity.slice(2, -1).replace(/^x/i, ''), /^&#x/i.test(entity) ? 16 : 10));
});
function serviceBodyCopy(html, zh = false) {
    const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="https:\/\/www\.perthhandymate\.com\.au([^"?#]+)"/i)?.[1];
    if (!canonical)
        return html;
    const route = canonical.replace(/^\/zh\//, '/');
    const page = bodyPages.find(p => p.route === route);
    if (!page)
        return html;
    const language = zh ? page.zh : page.en;
    const nodes = new Map(language.text), prose = new Map(language.prose);
    const change = (text) => {
        const key = bodyPlain(text.trim()), next = nodes.get(key);
        return next === undefined ? text : text.replace(text.trim(), bodyEscape(next));
    };
    // Headings and FAQ questions were separately approved. Keep their bytes, along
    // with navigation, quoted material, comments, attributes and executable content.
    html = html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i, (_all, open, body, close) => open + body.replace(/<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<summary\b[^>]*>[\s\S]*?<\/summary>|<nav\b[^>]*>[\s\S]*?<\/nav>|<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<q\b[^>]*>[\s\S]*?<\/q>|<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<[^>]+>|[^<]+/gi, token => token[0] === '<' ? token : change(token)) + close);
    html = html.replace(/<meta\b[^>]*>/gi, tag => /\b(?:name|property)="(?:description|og:description|twitter:description)"/i.test(tag) ? tag.replace(/(\bcontent=")([^"]*)(")/i, (_all, a, text, b) => a + bodyEscape(prose.get(bodyPlain(text)) ?? bodyPlain(text)) + b) : tag);
    return html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (all, open, raw, close) => {
        const visit = (value, key = '') => Array.isArray(value) ? value.map(v => visit(v, key)) : value && typeof value === 'object' ? (['Review', 'Quotation'].includes(String(value['@type'])) ? value : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v, k)]))) : typeof value === 'string' && ['description', 'text', 'articleBody', 'caption'].includes(key) ? (prose.get(value) ?? nodes.get(value) ?? value) : value;
        const before = JSON.parse(raw), after = visit(before);
        return JSON.stringify(before) === JSON.stringify(after) ? all : open + JSON.stringify(after) + close;
    });
}
module.exports = { serviceBodyCopy };
