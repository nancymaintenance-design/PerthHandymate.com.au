const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const record=JSON.parse(fs.readFileSync(path.join(root,'docs/seo-production-release.json'),'utf8'));
if(record.commit!=='34bc11597f8a31052524fa35638e372334c64a50')throw Error('Unexpected release evidence');
const updated=new Set(record.paths.filter(p=>p.endsWith('/index.html')||p==='index.html').map(p=>'https://www.perthhandymate.com.au/'+p.replace(/index\.html$/,'')));
const file=path.join(root,'sitemap.xml');let count=0;
const result=fs.readFileSync(file,'utf8').replace(/<url><loc>([^<]+)<\/loc>(?:<lastmod>[^<]+<\/lastmod>)?<\/url>/g,(all,url)=>{
 if(!updated.has(url))return all;count++;return `<url><loc>${url}</loc><lastmod>2026-10-08</lastmod></url>`;
});
fs.writeFileSync(file,result);fs.copyFileSync(file,path.join(root,'dist/sitemap.xml'));
console.log(`Accurate 2026-10-08 lastmod added to ${count} confirmed updated URLs; other URLs unchanged.`);
