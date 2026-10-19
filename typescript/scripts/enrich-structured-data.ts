import type {CheerioAPI} from 'cheerio';
const fs: typeof import('node:fs') = require('node:fs');
const path: typeof import('node:path') = require('node:path');
const {load}: typeof import('cheerio') = require('cheerio');
const {sourceFiles,routeOf}: {sourceFiles:(root:string)=>string[];routeOf:(file:string)=>string} = require('./lib/locales');
type Node = Record<string,unknown>;
interface RecordPage {file:string; html:string; $:CheerioAPI; url:string; lang:string; title:string; summary:string; topics:string[]; nodes:Node[]; content:string; indexable:boolean}
const origin='https://www.perthhandymate.com.au';
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const text=(value:string):string=>value.replace(/\s+/g,' ').trim();
const ref=(id:string):Node=>({'@id':id});
const xml=(value:string):string=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const json=(value:unknown):string=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');

function readPage(file:string,lang:string):RecordPage{
 const html=fs.readFileSync(path.join(dist,file),'utf8'),$=load(html);
 const url=$('link[rel="canonical"]').attr('href');
 if(!url||new URL(url).origin!==origin)throw new Error(`Invalid canonical: ${file}`);
 const title=text($('h1').first().text());
 const main=$('main').clone();
 main.find('script,style,iframe,form,nav,button,input,select,textarea').remove();
 // Use published paragraphs, not a separate promotional synopsis or template manuscript.
 const summary=main.find('p').toArray().map(e=>text($(e).text())).find(s=>s.length>=65)||title;
 const topics=[...new Set($('main h1, main h2').toArray().map(e=>text($(e).text())).filter(Boolean))].slice(0,6);
 const article=main.find('article.article').first();
 const body=article.length?article:main;
 // Feed links/images must remain usable outside the originating HTML document.
 body.find('[href],[src]').each((_,e)=>{for(const key of ['href','src']){const val=$(e).attr(key);if(val){if(/^javascript:/i.test(val))$(e).removeAttr(key);else $(e).attr(key,new URL(val,url).href);}}});
 body.find('[srcset]').removeAttr('srcset'); // Feed readers use the normalized src; responsive candidates are page-layout specific.
 const nodes:Node[]=$('script[type="application/ld+json"]').toArray().flatMap(e=>{const value=JSON.parse($(e).text()) as Node;return (value['@graph']||[value]) as Node[];});
 return {file,html,$,url,lang,title,summary,topics,nodes,content:body.html()||'',indexable:!($('meta[name="robots"]').attr('content')||'').includes('noindex')};
}

function enrich(page:RecordPage,known:Set<string>):string{
 const {$,url,title,summary,lang,topics}=page;
 const nodes=page.nodes.map(n=>({...n}));
 const organization=nodes.find(n=>n['@id']===origin+'/#organization');
 if(!organization)throw new Error(`Missing existing company identity: ${page.file}`);
 const plainRoute=new URL(url).pathname.replace(/^\/zh\//,'/');
 const websiteId=origin+'/#website',pageId=url+'#webpage';
 const site:Node={'@type':'WebSite','@id':websiteId,url:origin+'/',name:'Ellis Services Group',publisher:ref(origin+'/#organization'),inLanguage:['en-AU','zh-Hans']};
 const directory=['/services/','/guides/','/areas/','/projects/'].includes(plainRoute)||!!$('main .service-list-grid').length;
 const type=plainRoute==='/about/'?'AboutPage':plainRoute==='/contact/'?'ContactPage':directory?'CollectionPage':'WebPage';
 const web:Node={'@type':type,'@id':pageId,url,name:title,description:summary,inLanguage:lang,isPartOf:ref(websiteId),keywords:topics};
 const breadcrumb=nodes.find(n=>n['@type']==='BreadcrumbList');
 if(breadcrumb){breadcrumb['@id']??=url+'#breadcrumb';web.breadcrumb=ref(String(breadcrumb['@id']));
  // Existing labels are owned by the visible breadcrumb, including the guides hub.
  const labels=$('nav.breadcrumbs li').toArray().map(e=>text($(e).text()).replace(/^\/\s*/,''));
  const items=breadcrumb.itemListElement as Node[]|undefined;
  if(items&&labels.length===items.length)items.forEach((item,i)=>{if(labels[i])item.name=labels[i];});
 }
 const service=nodes.find(n=>n['@type']==='Service');
 if(service){
  service['@id']??=url+'#service';service.name=title;service.description=summary;
  service.mainEntityOfPage=ref(pageId);web.mainEntity=ref(String(service['@id']));
 }else if(/^\/guides\/[^/]+\/$/.test(plainRoute)){
  const article:Node={'@type':'Article','@id':url+'#article',url,headline:title,description:summary,inLanguage:lang,mainEntityOfPage:ref(pageId),isPartOf:ref(websiteId),publisher:ref(origin+'/#organization'),keywords:topics};
  // No public author byline or reliable publication timestamp exists: do not invent either.
  article.articleBody=text(load(page.content).text());nodes.push(article);web.mainEntity=ref(url+'#article');
 }else if(directory){
  const urls=new Set<string>();const items:Node[]=[];
  $('main a[href]').each((_,e)=>{const href=$(e).attr('href')||'',name=text($(e).text());const target=new URL(href,url);target.hash='';target.search='';
   if(name&&known.has(target.href)&&target.href!==url&&!urls.has(target.href)){urls.add(target.href);items.push({'@type':'ListItem',position:items.length+1,name,url:target.href});}
  });
  nodes.push({'@type':'ItemList','@id':url+'#items',name:title,itemListElement:items,numberOfItems:items.length});web.mainEntity=ref(url+'#items');
 }else {
  const work=nodes.find(n=>n['@type']==='CreativeWork');
  if(work){work['@id']??=url+'#work';work.mainEntityOfPage=ref(pageId);web.mainEntity=ref(String(work['@id']));}
  else web.mainEntity=ref(origin+(plainRoute==='/contact/'?'/#perth-office':'/#organization'));
 }
 if(plainRoute==='/about/')organization.description=summary;
 nodes.push(site,web);
 const graph={'@context':'https://schema.org','@graph':nodes.map(n=>{const copy={...n};delete copy['@context'];return copy;})};
 const prefix=lang==='zh-Hans'?'/zh':'';
 const links=page.indexable?`<link rel="alternate" type="application/rss+xml" href="${origin}${prefix}/feed.xml"><link rel="alternate" type="application/feed+json" href="${origin}${prefix}/feed.json">`:'';
 // Patch only raw HEAD bytes: serializing the DOM would alter the existing presentation markup.
 return page.html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,head=>head.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script\s*>/gi,'').replace('</head>',`<script type="application/ld+json">${json(graph)}</script>${links}</head>`));
}

function feeds(pages:RecordPage[],zh:boolean):void{
 const prefix=zh?'/zh':'',language=zh?'zh-Hans':'en-AU';
 const title=zh?'Ellis Services Group 服务与维修指南':'Ellis Services Group Services & Repair Guides';
 const items=pages.filter(p=>p.indexable).map(p=>({id:p.url,url:p.url,title:p.title,summary:p.summary,content_html:p.content,tags:p.topics}));
 const feed={version:'https://jsonfeed.org/version/1.1',title,home_page_url:origin+prefix+'/',feed_url:origin+prefix+'/feed.json',language,items};
 const folder=path.join(dist,zh?'zh':'');
 fs.writeFileSync(path.join(folder,'feed.json'),json(feed)+'\n');
 const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(title)}</title><link>${origin}${prefix}/</link><description>${xml(title)}</description><language>${language}</language><atom:link href="${origin}${prefix}/feed.xml" rel="self" type="application/rss+xml"/>${items.map(i=>`<item><guid isPermaLink="true">${xml(i.id)}</guid><link>${xml(i.url)}</link><title>${xml(i.title)}</title><description>${xml(i.summary)}</description>${i.tags.map(t=>`<category>${xml(t)}</category>`).join('')}<content:encoded>${xml(i.content_html)}</content:encoded></item>`).join('')}</channel></rss>\n`;
 fs.writeFileSync(path.join(folder,'feed.xml'),rss);
}

const records=sourceFiles(root).filter(f=>f!=='404.html').flatMap(file=>[readPage(file,'en-AU'),readPage('zh/'+file,'zh-Hans')]);
const known=new Set(records.filter(r=>r.indexable).map(r=>r.url));
for(const record of records)fs.writeFileSync(path.join(dist,record.file),enrich(record,known));
feeds(records.filter(r=>r.lang==='en-AU'),false);feeds(records.filter(r=>r.lang==='zh-Hans'),true);
console.log(`Structured data: ${records.length} bilingual pages; ${known.size} indexable feed entries; 4 feed files; visible markup unchanged.`);
