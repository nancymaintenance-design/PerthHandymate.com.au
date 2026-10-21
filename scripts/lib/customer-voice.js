// Generated from typescript/scripts/lib/customer-voice.ts; edit the TypeScript source.
// Final bilingual public-copy owner. Historical content/evidence remains intact;
// published pages, schema and feeds receive the same approved first-person copy.
const fs = require('node:fs');
const path = require('node:path');
const rules = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/customer-voice.json'), 'utf8'));
const operatorRules = ['operator-copy.json', 'operator-copy-review.json'].flatMap(file => JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/' + file), 'utf8')));
const verbs = { confirms: 'confirm', checks: 'check', assesses: 'assess', arranges: 'arrange', provides: 'provide', identifies: 'identify', explains: 'explain', repairs: 'repair', installs: 'install', handles: 'handle', uses: 'use', distinguishes: 'distinguish', agrees: 'agree', inspects: 'inspect', discusses: 'discuss', completes: 'complete', accepts: 'accept', reviews: 'review', separates: 'separate', cleans: 'clean', replaces: 'replace', records: 'record', clarifies: 'clarify', measures: 'measure', coordinates: 'coordinate', supports: 'support', offers: 'offer', plans: 'plan', renews: 'renew', adjusts: 'adjust', supplies: 'supply', sets: 'set', documents: 'document' };
verbs.scopes = 'scope';
verbs.seeks = 'seek';
const companyClause = new RegExp('\\bEllis (?:(also|first|then|directly) )?(' + Object.keys(verbs).join('|') + ')\\b([^.!?]*)', 'g');
const coordinated = new RegExp('(\\b(?:and|or|then)\\s+|,\\s*)(' + Object.keys(verbs).join('|') + ')\\b', 'g');
const htmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plainParagraph = (s) => s.replace(/<[^>]*>/g, '').replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_a, hex, dec) => String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10))).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo);/g, (_a, key) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘' }[key] || _a)).replace(/\s+/g, ' ').trim();
function operatorParagraph(html, zh) {
    const plain = plainParagraph(html), rule = operatorRules.find(r => (zh ? r.zh : r.en)[0] === plain);
    // A one-language grammar fix must retain inline structure in BOTH languages.
    if (!rule || rule.en[0] === rule.en[1] || rule.zh[0] === rule.zh[1])
        return html;
    const pair = zh ? rule.zh : rule.en;
    let body = htmlEscape(pair[1]);
    const remaining = [];
    // Keep the same anchor-node order in both languages. Matching labels inside the
    // new prose is language-dependent and breaks the existing paired-content editor.
    for (const anchor of html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi) || [])
        remaining.push(anchor);
    if (remaining.length)
        body += (zh ? ' 相关内容：' : ' Related: ') + remaining.join(' · ');
    return (html.match(/^<p\b[^>]*>/i)?.[0] || '<p>') + body + '</p>';
}
function wording(text, zh, includeOperator = true) {
    const pairs = rules.map(r => zh ? r.zh : r.en).sort((a, b) => b[0].length - a[0].length);
    for (const [old, next] of pairs)
        text = text.replaceAll(old, next);
    if (zh) {
        text = text.replace(/(?:请)?告诉\s*Ellis(?:\s+珀斯团队)?/g, '告诉我们')
            .replace(/联系\s*Ellis(?:\s*(?:Services Group|Perth|珀斯))?/g, '联系我们')
            .replace(/Ellis\s*(会|将|可以|可|能够|将会|也会|也可|还会)?\s*(?=检查|确认|安排|评估|提供|区分|处理|识别|核查|讨论|接受|修理|维修|安装|报价|记录|澄清|说明|清理|更换|统筹)/g, (_all, will) => '我们' + (will || ''))
            .replace('展示可见工作细节，不能证明隐蔽排水状况。', '展示完成后的维修效果。');
    }
    else {
        text = text.replace(/Tell the Ellis Perth office/g, 'Tell us').replace(/Contact Ellis Services Group/g, 'Contact our team').replace(/Contact Ellis Perth/g, 'Contact our local team')
            .replace(/\b(Tell|tell|Ask|ask|Contact|contact|Call|call) Ellis\b(?! Services Group)/g, (_all, verb) => verb + ' us');
        text = text.replace(companyClause, (_all, adverb, verb, tail, offset) => (!text.slice(0, offset).trim() || /[.!?]\s*$/.test(text.slice(0, offset)) ? 'We ' : 'we ') + (adverb ? adverb + ' ' : '') + verbs[verb] + tail.replace(coordinated, (_s, join, v) => join + verbs[v]).replace(/\bits own appropriately licensed personnel\b/g, 'our own appropriately licensed personnel'));
        text = text.replace(/\bEllis (can|will|may)\b/g, (_all, modal, offset) => (!text.slice(0, offset).trim() || /[.!?]\s*$/.test(text.slice(0, offset)) ? 'We ' : 'we ') + modal)
            .replace('shows visible work details, not proof of a hidden drainage condition.', 'shows the completed work.');
    }
    // Reviewed complete sentences run after the legacy voice normaliser so generated
    // pronoun artefacts do not survive. These are exact edits, not a negation ban.
    const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    if (includeOperator)
        for (const rule of operatorRules) {
            const [old, next] = zh ? rule.zh : rule.en;
            text = text.replaceAll(escape(old), escape(next));
            if (escape(old) !== old)
                text = text.replaceAll(old, next);
        }
    if (includeOperator && zh)
        text = text.replaceAll('请向 Ellis', '请向我们').replaceAll('Ellis 会确定', '我们会确定').replace(/请向我们\s+(?=[\u4e00-\u9fff])/g, '请向我们');
    return text;
}
function publicCopy(html, zh = false) {
    const legalPage = /rel="canonical"[^>]*href="https:\/\/www\.perthhandymate\.com\.au\/(?:zh\/)?privacy\/"/.test(html);
    const edit = (text) => wording(text, zh, !legalPage);
    // Preserve attributes, URLs, scripts, styling and media. Only owned visible text and
    // localized schema prose are revised; no generic negation/safety-word deletion.
    const tokens = (body) => body.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<q\b[^>]*>[\s\S]*?<\/q>|<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi, token => token[0] === '<' ? token : edit(token));
    const prose = (body) => body.replace(/<blockquote\b[^>]*>[\s\S]*?<\/blockquote>|<q\b[^>]*>[\s\S]*?<\/q>|<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<p\b[^>]*>[\s\S]*?<\/p>|<[^>]+>|[^<]+/gi, token => {
        if (/^<p\b/i.test(token)) {
            const next = legalPage ? tokens(token) : operatorParagraph(tokens(token), zh);
            return token.replace(/<[^>]*>/g, '').trim() && !next.replace(/<[^>]*>/g, '').trim() ? '' : next;
        }
        return token[0] === '<' ? token : edit(token);
    });
    html = html.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i, (_all, open, body, close) => open + prose(body) + close);
    // Support bounded fragments used by the editor/tests, without touching attributes.
    if (!/<body\b/i.test(html))
        html = prose(html);
    html = html.replace(/<meta\b[^>]*>/gi, tag => /\b(?:name|property)="(?:description|og:description|twitter:description)"/i.test(tag) ? tag.replace(/(\bcontent=")([^"]*)(")/i, (_all, a, value, b) => a + edit(value) + b) : tag);
    return html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (all, open, raw, close) => {
        const keys = new Set(['name', 'headline', 'description', 'text', 'articleBody', 'caption']);
        const visit = (value, key = '') => Array.isArray(value) ? value.map(v => visit(v, key)) : value && typeof value === 'object' ? (['Review', 'Quotation'].includes(String(value['@type'])) ? value : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v, k)]))) : typeof value === 'string' && keys.has(key) ? edit(value) : value;
        const before = JSON.parse(raw), after = visit(before);
        return JSON.stringify(before) === JSON.stringify(after) ? all : open + JSON.stringify(after) + close;
    });
}
module.exports = { publicCopy, wording };
