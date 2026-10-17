export type Dictionary = Record<string, string>;
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type TextTranslator = (value: string) => string;
export interface SearchItem { service: string; canonical?: string }
export interface SearchSandbox { window: { ELLIS_SEARCH_CATALOG?: SearchItem[] }; ELLIS_SEARCH_CATALOG?: SearchItem[] }
export interface Inventory { files: string[]; strings: { en: string; pages: string[] }[] }
interface TransformVisitors {
  text: TextTranslator;
  attribute: (name: string, value: string, tag: string) => string;
  schema: (value: JsonValue) => JsonValue;
}
const fs: typeof import('node:fs') = require('node:fs');
const path: typeof import('node:path') = require('node:path');
const origin = 'https://www.perthhandymate.com.au';
const publicFolders = ['about','areas','contact','faq','guides','privacy','projects','services'];
const localizedAttrs = ['alt','title','aria-label','placeholder'];
const localizedSchemaKeys = new Set(['name','headline','description','text','articleBody','caption','alternativeHeadline']);
const entities: Record<string, string> = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',ndash:'–',mdash:'—',rsquo:'’',lsquo:'‘',hellip:'…',copy:'©',rarr:'→'};
const decode = (value: string): string => value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi,(all: string,key: string)=>key[0]==='#'?String.fromCodePoint(parseInt(key.slice(key[1].toLowerCase()==='x'?2:1),key[1].toLowerCase()==='x'?16:10)):(entities[key]??all));
const clean = (value: string): string => decode(value).replace(/\s+/g,' ').trim();
const escape = (value: unknown): string => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function walk(folder: string): string[]{return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[path.join(folder,e.name)]);}
function sourceFiles(root: string): string[]{return ['index.html','404.html',...publicFolders.flatMap(folder=>walk(path.join(root,folder)).filter(f=>f.endsWith('.html')).map(f=>path.relative(root,f).replaceAll('\\','/')))];}
function routeOf(file: string): string{return file==='404.html'?'/404.html':'/'+file.replace(/index\.html$/,'');}
function needsTranslation(text: string): boolean{return /[a-z]{2}/i.test(text)&&!/^https?:\/\/|^[^\s@]+@[^\s@]+\.[^\s@]+$|^\+?[\d\s().-]+$/.test(text);}
function transform(html: string,{text,attribute,schema}: TransformVisitors): string{
  const attributes=(token: string): string=>token.replace(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g,(_,name,quoted)=>`${name}="${escape(attribute(name.toLowerCase(),decode(quoted.slice(1,-1)),token))}"`);
  // Preserve raw-text elements, comments and attribute values; never parse HTML by splitting on '<' alone.
  return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<[^>]+>|[^<]+/gi,token=>{
    if(/^<script\b/i.test(token)){
      if(!/type=["']application\/ld\+json["']/i.test(token))return token.replace(/^<script\b[^>]*>/i,attributes);
      return token.replace(/(>)([\s\S]*)(<\/script\s*>)$/i,(_,open,body,close)=>open+JSON.stringify(schema(JSON.parse(body)))+close);
    }
    if(/^<(?:!--|style\b)/i.test(token))return token;
    if(token[0]==='<')return attributes(token);
    const value=clean(token);
    return value?token.replace(/\S[\s\S]*\S|\S/,()=>escape(text(value))):token;
  });
}
function schemaStrings(value: JsonValue,visit: TextTranslator,key=''): JsonValue{
  if(Array.isArray(value))return value.map(v=>schemaStrings(v,visit,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,schemaStrings(v,visit,k)]));
  return typeof value==='string'&&localizedSchemaKeys.has(key)?visit(clean(value)):value;
}
function inventory(root: string): Inventory{
  const strings=new Map<string, Set<string>>();
  const add=(value: string,file: string): string=>{if(needsTranslation(value)){if(!strings.has(value))strings.set(value,new Set());strings.get(value)!.add(file);}return value;};
  const files=sourceFiles(root);
  for(const file of files)transform(fs.readFileSync(path.join(root,file),'utf8'),{
    text:value=>add(value,file),
    attribute:(name,value,tag)=>localizedAttrs.includes(name)||name==='content'&&/<meta\b/i.test(tag)&&/(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)/i.test(tag)?add(clean(value),file):value,
    schema:value=>schemaStrings(value,v=>add(v,file)),
  });
  // The browser catalogue is a public script, not necessarily a CommonJS export.
  const vm: typeof import('node:vm') = require('node:vm');const sandbox: SearchSandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/search-catalog.js'),'utf8'),sandbox);
  for(const item of sandbox.ELLIS_SEARCH_CATALOG??sandbox.window?.ELLIS_SEARCH_CATALOG??[]){add(item.service,'search');if(item.canonical)add(item.canonical,'search');}
  return {files,strings:[...strings].map(([en,files])=>({en,pages:[...files]}))};
}
function translator(dictionary: Dictionary): TextTranslator{return value=>{const key=clean(value);if(!needsTranslation(key))return key;if(!Object.hasOwn(dictionary,key)||!dictionary[key].trim())throw new Error(`Missing Chinese translation: ${key.slice(0,180)}`);return dictionary[key];};}
function localUrl(value: string,file: string,known: ReadonlySet<string>,zh: boolean): string{
  if(!value||value.startsWith('#')||/^(?:tel:|mailto:|data:|javascript:)/i.test(value))return value;
  const url=new URL(value,origin+routeOf(file));
  if(url.origin!==origin)return value;
  let pathname=url.pathname.replace(/index\.html$/,'');
  if(known.has(pathname)&&zh)pathname='/zh'+pathname;
  // Static asset paths stay at the shared root, regardless of locale depth.
  return pathname+url.search+url.hash;
}
function languageShell(html: string,file: string,zh: boolean): string{
  const route=routeOf(file),en=origin+route,cn=origin+'/zh'+route;
  const alternate=zh?route:'/zh'+route;
  const label=zh?'English':'中文服务';
  const lang=zh?'en-AU':'zh-Hans';
  html=html.replace(/<html\b[^>]*>/i,`<html lang="${zh?'zh-Hans':'en-AU'}">`);
  html=html.replace(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi,'');
  html=html.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i,`<link rel="canonical" href="${zh?cn:en}">`);
  html=html.replace(/(<meta\s+property="og:url"\s+content=")[^"]+"/i,`$1${zh?cn:en}"`);
  html=html.replace(/(<meta\s+property="og:locale"\s+content=")[^"]+"/i,`$1${zh?'zh_CN':'en_AU'}"`);
  const tags=`<link rel="alternate" hreflang="en-AU" href="${en}"><link rel="alternate" hreflang="zh-Hans" href="${cn}"><link rel="alternate" hreflang="x-default" href="${en}"><link rel="stylesheet" href="/assets/css/locales.css"><script defer src="/assets/js/locales.js"></script>`;
  html=html.replace('</head>',tags+(zh?'<script defer src="/assets/js/zh-messages.js"></script>':'')+'</head>');
  // The seventh navigation item follows Contact Us on every page, including no-JS rendering.
  html=html.replace(/(<nav\b[^>]*\bid="main-nav"[^>]*>)([\s\S]*?)(<\/nav>)/i,(_,open,body,close)=>open+body+`<a class="language-switch" data-language-switch href="${alternate}" hreflang="${lang}" lang="${lang}" aria-label="${zh?'Switch this page to English':'切换到本页简体中文版'}">${label}</a>`+close);
  return html;
}
function renderChinese(html: string,file: string,known: ReadonlySet<string>,t: TextTranslator): string{
  html=html.replace(/<option([^>]*)>([^<]*)<\/option>/gi,(all,attrs,label)=>/\bvalue\s*=/.test(attrs)?all:`<option${attrs} value="${escape(clean(label))}">${label}</option>`);
  const localized=transform(html,{
    text:t,
    attribute:(name,value,tag)=>{
      if(localizedAttrs.includes(name))return t(value);
      if(name==='content'&&/<meta\b/i.test(tag)&&/(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description|twitter:image:alt)/i.test(tag))return t(value);
      if(['href','src','action'].includes(name))return localUrl(value,file,known,true);
      if(name==='srcset')return value.split(',').map(candidate=>{const [url,...descriptor]=candidate.trim().split(/\s+/);return [localUrl(url,file,known,true),...descriptor].join(' ');}).join(', ');
      if(name==='data-root')return '/zh/';
      return value;
    },
    schema:value=>{
      const translated=schemaStrings(value,t);
      function urls(v: JsonValue,key=''): JsonValue{
        if(Array.isArray(v))return v.map(x=>urls(x,key));
        if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,k==='inLanguage'?'zh-Hans':urls(x,k)]));
        if(typeof v==='string'&&['url','item','mainEntityOfPage'].includes(key)&&v.startsWith(origin))return origin+localUrl(v,file,known,true);
        if(typeof v==='string'&&key==='@id'&&v.startsWith(origin+routeOf(file))&&routeOf(file)!=='/')return origin+localUrl(v,file,known,true);
        return v;
      }
      return urls(translated);
    },
  });
  return languageShell(localized,file,true);
}
module.exports={origin,publicFolders,sourceFiles,routeOf,inventory,translator,renderChinese,languageShell,clean,needsTranslation,localUrl};
