// Generated from typescript/scripts/lib/customer-voice.ts; edit the TypeScript source.
// Final bilingual public-copy owner. Historical content/evidence remains intact;
// published pages, schema and feeds receive the same approved first-person copy.
const fs = require('node:fs');
const path = require('node:path');
const rules = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../config/customer-voice.json'), 'utf8'));
const verbs = { confirms: 'confirm', checks: 'check', assesses: 'assess', arranges: 'arrange', provides: 'provide', identifies: 'identify', explains: 'explain', repairs: 'repair', installs: 'install', handles: 'handle', uses: 'use', distinguishes: 'distinguish', agrees: 'agree', inspects: 'inspect', discusses: 'discuss', completes: 'complete', accepts: 'accept', reviews: 'review', separates: 'separate', cleans: 'clean', replaces: 'replace', records: 'record', clarifies: 'clarify', measures: 'measure', coordinates: 'coordinate', supports: 'support', offers: 'offer', plans: 'plan', renews: 'renew', adjusts: 'adjust', supplies: 'supply', sets: 'set', documents: 'document' };
const companyClause = new RegExp('\\bEllis (?:(also|first|then|directly) )?(' + Object.keys(verbs).join('|') + ')\\b([^.!?]*)', 'g');
const coordinated = new RegExp('(\\b(?:and|or|then)\\s+|,\\s*)(' + Object.keys(verbs).join('|') + ')\\b', 'g');
function wording(text, zh) {
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
    return text;
}
function publicCopy(html, zh = false) {
    // Preserve attributes, URLs, scripts, styling and media. Only owned visible text and
    // localized schema prose are revised; no generic negation/safety-word deletion.
    const tokens = (body) => body.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi, token => token[0] === '<' ? token : wording(token, zh));
    const prose = (body) => body.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<p\b[^>]*>[\s\S]*?<\/p>|<[^>]+>|[^<]+/gi, token => {
        if (/^<p\b/i.test(token)) {
            const next = tokens(token);
            return token.replace(/<[^>]*>/g, '').trim() && !next.replace(/<[^>]*>/g, '').trim() ? '' : next;
        }
        return token[0] === '<' ? token : wording(token, zh);
    });
    html = html.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i, (_all, open, body, close) => open + prose(body) + close);
    // Support bounded fragments used by the editor/tests, without touching attributes.
    if (!/<body\b/i.test(html))
        html = prose(html);
    html = html.replace(/<meta\b[^>]*>/gi, tag => /\b(?:name|property)="(?:description|og:description|twitter:description)"/i.test(tag) ? tag.replace(/(\bcontent=")([^"]*)(")/i, (_all, a, value, b) => a + wording(value, zh) + b) : tag);
    return html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/g, (all, open, raw, close) => {
        const keys = new Set(['name', 'headline', 'description', 'text', 'articleBody', 'caption']);
        const visit = (value, key = '') => Array.isArray(value) ? value.map(v => visit(v, key)) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, visit(v, k)])) : typeof value === 'string' && keys.has(key) ? wording(value, zh) : value;
        const before = JSON.parse(raw), after = visit(before);
        return JSON.stringify(before) === JSON.stringify(after) ? all : open + JSON.stringify(after) + close;
    });
}
module.exports = { publicCopy, wording };
