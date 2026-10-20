// Generated from typescript/scripts/lib/service-navigation.ts; edit the TypeScript source.
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('cheerio');
const origin = 'https://www.perthhandymate.com.au';
const map = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/service-navigation.json'), 'utf8'));
const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
function validateMap(records) {
    for (const [key, record] of Object.entries(records)) {
        if (key !== record.path || record.canonical_url !== origin + key || !/^\/(?:[a-z0-9-]+\/)*$/.test(key))
            throw Error('Invalid canonical path: ' + key);
        const zh = key.startsWith('/zh/');
        if (record.locale !== (zh ? 'zh-Hans' : 'en-AU') || !record.breadcrumb_label.trim())
            throw Error('Invalid locale/label: ' + key);
        if (records[record.alternate_url]?.alternate_url !== key || records[record.alternate_url]?.locale === record.locale)
            throw Error('Invalid language pair: ' + key);
        for (const target of [record.primary_parent_url, record.commercial_owner_url, ...record.related_owner_urls].filter((v) => !!v)) {
            if (!records[target] || records[target].locale !== record.locale || /noindex/i.test(records[target].index_directives))
                throw Error('Missing, unindexable or wrong language target: ' + key + ' → ' + target);
        }
        if (record.commercial_owner_url && !['Service', 'Homepage'].includes(records[record.commercial_owner_url].page_type))
            throw Error('Invalid service owner: ' + key);
        const seen = new Set();
        let current = record;
        while (current) {
            if (seen.has(current.path))
                throw Error('Parent cycle: ' + key);
            seen.add(current.path);
            current = current.primary_parent_url ? records[current.primary_parent_url] : undefined;
        }
        if (!seen.has(zh ? '/zh/' : '/'))
            throw Error('Path must end at its language home: ' + key);
    }
}
validateMap(map);
function trailFor(route, records = map) {
    const trail = [];
    let record = records[route];
    const seen = new Set();
    while (record) {
        if (seen.has(record.path))
            throw Error('Parent cycle: ' + route);
        seen.add(record.path);
        trail.unshift(record);
        record = record.primary_parent_url ? records[record.primary_parent_url] : undefined;
    }
    return trail;
}
const ownerId = (record) => (record.commercial_owner_url || 'general').replace(/^\/zh\//, '/').replace(/\//g, '-').replace(/^-|-$/g, '') || 'homepage';
function breadcrumbNode(route) {
    const trail = trailFor(route);
    return trail.length < 2 ? null : { '@context': 'https://schema.org', '@type': 'BreadcrumbList', '@id': origin + route + '#breadcrumb', itemListElement: trail.map((record, i) => ({ '@type': 'ListItem', position: i + 1, name: record.breadcrumb_label, item: record.canonical_url })) };
}
function renderBreadcrumb(route) {
    const trail = trailFor(route);
    if (trail.length < 2)
        return '';
    return `<nav class="breadcrumbs" aria-label="${map[route].locale === 'zh-Hans' ? '面包屑导航' : 'Breadcrumb'}" data-owner-id="${escape(ownerId(map[route]))}"><ol>${trail.map((record, i) => `<li>${i === trail.length - 1 ? `<span aria-current="page">${escape(record.breadcrumb_label)}</span>` : `<a href="${record.canonical_url}">${escape(record.breadcrumb_label)}</a>`}</li>`).join('')}</ol></nav>`;
}
function replaceSchema(html, route) {
    html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi, (all, raw) => {
        const data = JSON.parse(raw);
        if (data['@type'] === 'BreadcrumbList')
            return '';
        if (Array.isArray(data['@graph'])) {
            data['@graph'] = data['@graph'].filter((n) => n['@type'] !== 'BreadcrumbList');
            return `<script type="application/ld+json">${json(data)}</script>`;
        }
        return all;
    });
    const node = breadcrumbNode(route);
    return node ? html.replace('</head>', `<script type="application/ld+json">${json(node)}</script></head>`) : html;
}
function sectionLinks(route, $) {
    const record = map[route], zh = record.locale === 'zh-Hans', home = zh ? '/zh/' : '/';
    let targets = [], heading = '';
    if (record.page_type === 'Homepage') {
        const already = new Set($('main a[href]').toArray().map(e => new URL($(e).attr('href'), origin + route).pathname));
        targets = Object.values(map).filter(r => r.locale === record.locale && r.priority && !already.has(r.path)).map(r => r.path);
        heading = zh ? '门窗维修与安装' : 'Door & window repairs and installation';
    }
    else if (record.page_type === 'Service') {
        targets = Object.values(map).filter(r => r.locale === record.locale && ['Guide', 'CaseStudy'].includes(r.page_type) && (r.primary_parent_url === route || r.related_owner_urls.includes(route))).map(r => r.path);
        heading = zh ? '相关指南与维修实例' : 'Guides & repair examples';
    }
    else if (['Guide', 'CaseStudy'].includes(record.page_type)) {
        targets = record.related_owner_urls;
        heading = zh ? '相关维修服务' : 'Services for this repair';
    }
    else if (record.page_type === 'Location') {
        targets = [...new Set($('main a[href]').toArray().map(e => new URL($(e).attr('href'), origin + route).pathname).filter(target => map[target]?.page_type === 'Service' && target !== home))].slice(-4);
        heading = zh ? '选择您需要的维修服务' : 'Choose your repair service';
    }
    // Every declared parent must provide a real return entry, even if a historical
    // content renderer dropped a child. This never manufactures a new route.
    const linked = new Set($('a[href]').toArray().map(e => new URL($(e).attr('href'), origin + route).pathname));
    for (const child of Object.values(map))
        if (child.primary_parent_url === route && !linked.has(child.path))
            targets.push(child.path);
    targets = [...new Set(targets)].filter(target => target !== route);
    if (!targets.length)
        return '';
    if (!heading)
        heading = zh ? '继续浏览' : 'Explore more';
    return `<section class="section shell service-path-links" data-service-path-links aria-label="${escape(heading)}"><h2>${escape(heading)}</h2><ul>${targets.map(target => `<li><a href="${map[target].canonical_url}">${escape(map[target].breadcrumb_label)}</a></li>`).join('')}</ul></section>`;
}
function applyNavigation(html, file, zh) {
    const route = (zh ? '/zh' : '') + '/' + file.replace(/index\.html$/, '');
    if (!map[route])
        return html;
    html = html.replace(/<section\b[^>]*\bdata-service-path-links\b[^>]*>[\s\S]*?<\/section>/g, '');
    const nav = renderBreadcrumb(route);
    let emitted = false;
    if (/<nav\b[^>]*class="[^"]*\bbreadcrumbs\b[^"]*"/.test(html))
        html = html.replace(/<nav\b[^>]*class="[^"]*\bbreadcrumbs\b[^"]*"[^>]*>[\s\S]*?<\/nav>/g, () => { if (emitted)
            return ''; emitted = true; return nav; });
    else if (nav)
        html = html.replace(/<main\b[^>]*>/, open => open + `<div class="shell service-path-start">${nav}</div>`);
    html = html.replace(/<link rel="stylesheet" href="\/assets\/css\/service-navigation\.css">/g, '').replace('</head>', '<link rel="stylesheet" href="/assets/css/service-navigation.css"></head>');
    html = replaceSchema(html, route);
    const links = sectionLinks(route, load(html));
    if (links) {
        // Keep new discovery links compact and before the existing enquiry band.
        const marker = html.indexOf('<section class="cta-band');
        if (map[route].page_type === 'Homepage' && /<section class="section shell">/.test(html))
            html = html.replace(/<section class="section shell">[\s\S]*?<\/section>/, section => section + links);
        else
            html = marker >= 0 ? html.slice(0, marker) + links + html.slice(marker) : html.replace('</main>', links + '</main>');
    }
    return html;
}
module.exports = { map, validateMap, trailFor, renderBreadcrumb, breadcrumbNode, applyNavigation };
