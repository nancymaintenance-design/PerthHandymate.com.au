import type { Dictionary, Inventory, TextTranslator, SearchSandbox } from './lib/locales';
interface LocaleApi {
  origin: string;
  inventory: (root: string) => Inventory;
  routeOf: (file: string) => string;
  translator: (dictionary: Dictionary) => TextTranslator;
  renderChinese: (html: string, file: string, known: ReadonlySet<string>, t: TextTranslator) => string;
  languageShell: (html: string, file: string, zh: boolean) => string;
  clean: (value: string) => string;
}
const fs: typeof import('node:fs') = require('node:fs');
const path: typeof import('node:path') = require('node:path');
const vm: typeof import('node:vm') = require('node:vm');
const crypto: typeof import('node:crypto') = require('node:crypto');
const {origin,inventory,routeOf,translator,renderChinese,languageShell}: LocaleApi=require('./lib/locales');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist');
const info=inventory(root);
if(process.argv.includes('--inventory')){
  const file=process.argv[process.argv.indexOf('--inventory')+1];
  if (!file) throw new Error('--inventory requires an output filename');
  fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
  fs.writeFileSync(file,JSON.stringify(info,null,2));
  console.log(JSON.stringify({pages:info.files.length,strings:info.strings.length,characters:info.strings.reduce((n,s)=>n+s.en.length,0)}));
  process.exit(0);
}
const shared: Dictionary=JSON.parse(fs.readFileSync(path.join(root,'locales/zh-Hans.json'),'utf8'));
const overrides: Dictionary=JSON.parse(fs.readFileSync(path.join(root,'locales/editorial-overrides.json'),'utf8'));
const reviewed: Dictionary={};
for(const part of fs.readdirSync(path.join(root,'locales/parts')).filter(file=>file.endsWith('.json')&&!file.startsWith('revision-')).map(file=>file.slice(0,-5)).sort()){
  const file=path.join(root,'locales/parts',part+'.json');
  if(fs.existsSync(file))Object.assign(reviewed,JSON.parse(fs.readFileSync(file,'utf8')));
}
const dictionary={...shared,...reviewed,...overrides};
// Latest approved page revisions own wording above older editorial projections.
for(const file of fs.readdirSync(path.join(root,'locales/parts')).filter(file=>/^revision-.*\.json$/.test(file)).sort())Object.assign(dictionary,JSON.parse(fs.readFileSync(path.join(root,'locales/parts',file),'utf8')));
// Article titles, card labels and schema headlines use the same reviewed translation.
for(const [en,zh] of Object.entries(overrides))if(Object.hasOwn(dictionary,en+' | Ellis'))dictionary[en+' | Ellis']=zh+' | Ellis';
for(const file of info.files){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const title=source.match(/<title>(.*?)<\/title>/)?.[1];
  const heading=source.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  const {clean}: LocaleApi=require('./lib/locales');
  if(title&&heading&&!Object.hasOwn(overrides,clean(title))&&Object.hasOwn(dictionary,clean(heading)))dictionary[clean(title)]=dictionary[clean(heading)]+' | Ellis';
}
const t=translator(dictionary);
for(const item of info.strings)t(item.en); // Fail closed before writing any bilingual output.
if(process.argv.includes('--check')){
  console.log(`Translation coverage checked: ${info.files.length} pages; ${info.strings.length} source strings.`);
  process.exit(0);
}
const known=new Set(info.files.map(routeOf));
const pages=[];
for(const file of info.files){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  const en=languageShell(source,file,false);
  const zh=renderChinese(source,file,known,t);
  const target=path.join(output,'zh',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(path.join(output,file),en);
  fs.writeFileSync(target,zh);
  pages.push({en:routeOf(file),zh:'/zh'+routeOf(file),sourceHash:crypto.createHash('sha256').update(source).digest('hex')});
}
const messages: Dictionary=JSON.parse(fs.readFileSync(path.join(root,'locales/ui.zh-Hans.json'),'utf8'));
const sandbox: SearchSandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/search-catalog.js'),'utf8'),sandbox);
const catalog=sandbox.ELLIS_SEARCH_CATALOG??sandbox.window?.ELLIS_SEARCH_CATALOG??[];
for(const item of catalog){messages[item.service]=t(item.service);if(item.canonical)messages[item.canonical]=t(item.canonical);}
fs.writeFileSync(path.join(output,'assets/js/zh-messages.js'),'window.ELLIS_ZH_MESSAGES='+JSON.stringify(messages)+';\n');
const original=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const entries=[...original.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(match=>{const originalEntry=match[1],en=originalEntry.match(/<loc>(.*?)<\/loc>/)![1],zh=origin+'/zh'+new URL(en).pathname;const alts=`<xhtml:link rel="alternate" hreflang="en-AU" href="${en}"/><xhtml:link rel="alternate" hreflang="zh-Hans" href="${zh}"/><xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>`;return [`<url>${originalEntry}${alts}</url>`,`<url>${originalEntry.replace(en,zh)}${alts}</url>`];});
fs.writeFileSync(path.join(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+entries.join('\n')+'\n</urlset>\n');
fs.writeFileSync(path.join(output,'data/locale-pages.json'),JSON.stringify({defaultLocale:'en-AU',locales:['en-AU','zh-Hans'],pages},null,2));
console.log(`Bilingual build: ${pages.length} English + ${pages.length} Chinese pages; ${info.strings.length} translated strings; ${entries.length} sitemap URLs.`);
