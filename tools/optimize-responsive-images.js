const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/UFTR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const pages=[];for(const dir of ['','projects','services','guides']){function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){if(e.isDirectory()&&dir)walk(path.join(p,e.name));else if(e.name.endsWith('.html'))pages.push(path.join(p,e.name));}}walk(path.join(root,dir));}
(async()=>{const conversions=new Map();
for(const file of pages){let html=fs.readFileSync(file,'utf8'),before=html;const tags=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
for(const tag of tags){if(tag.includes('srcset='))continue;const src=tag.match(/src="([^"]+)"/)?.[1];if(!src||!src.match(/\.(png|jpe?g)$/i)||/logo|icon-/i.test(src)||/class="footer-/.test(tag)||/width="18"/.test(tag))continue;
const source=path.resolve(path.dirname(file),src);if(!fs.existsSync(source)||fs.statSync(source).size<100*1024)continue;
if(!conversions.has(source)){const meta=await sharp(source).metadata(),stem=path.basename(source,path.extname(source)),out=path.join(path.dirname(source),'optimized');fs.mkdirSync(out,{recursive:true});const variants=[];
for(const max of [480,960,1440]){const width=Math.min(max,meta.width);if(variants.some(x=>x.width===width))continue;const target=path.join(out,`${stem}-${max}.webp`);await sharp(source).rotate().resize({width,withoutEnlargement:true}).webp({quality:78,effort:5}).toFile(target);variants.push({width,target});}
conversions.set(source,{variants,original:fs.statSync(source).size});}
const {variants}=conversions.get(source),relative=p=>path.relative(path.dirname(file),p).replaceAll('\\','/');const fallback=variants.at(-1);let replacement=tag.replace(/src="[^"]+"/,`src="${relative(fallback.target)}"`);replacement=replacement.replace(/>$/,` srcset="${variants.map(x=>`${relative(x.target)} ${x.width}w`).join(', ')}" sizes="${tag.includes('hero-media')?'100vw':'(max-width: 700px) 100vw, 760px'}">`);if(tag.includes('hero-media'))replacement=replacement.replace(/>$/,' fetchpriority="high" decoding="async">');html=html.replace(tag,replacement);}
if(before!==html)fs.writeFileSync(file,html);}
console.log(JSON.stringify([...conversions].map(([file,x])=>({file:path.relative(root,file).replaceAll('\\','/'),before:x.original,after:fs.statSync(x.variants.at(-1).target).size})),null,2));
})().catch(e=>{console.error(e);process.exit(1)});
