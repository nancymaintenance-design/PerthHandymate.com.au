// Offline asset generation only. Install sharp outside the client bundle or set SHARP_MODULE.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_MODULE || 'C:/Users/UFTR/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname,'..');
const names = ['air-conditioning','bathroom','carpentry','electrician','fly-screen-repairs','handyman','house-painting','lawn-mowing','plumber','roofing','tiling','window-repairs'].map(x => `icon-${x}`).concat('ellis-services-group-logo','instagram-icon');
function walk(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? (['.git','.superpowers','dist','node_modules'].includes(e.name) ? [] : walk(path.join(dir,e.name))) : [path.join(dir,e.name)]);
}
async function main() {
  const mappings = [];
  for (const name of names) {
    const source = path.join(root,'assets/images',`${name}.png`);
    const target = path.join(root,'assets/images',`${name}.webp`);
    const original = fs.readFileSync(source);
    const width = name === 'instagram-icon' ? 36 : name.includes('logo') ? 128 : 192;
    const info = await sharp(original).resize({width,withoutEnlargement:true}).webp({lossless:true,effort:6}).toFile(target);
    if (info.size > (name === 'instagram-icon' ? 10 : 50)*1024) throw new Error(`${name} exceeds budget`);
    mappings.push({source:`assets/images/${name}.png`,target:`assets/images/${name}.webp`,width:info.width,height:info.height,before:original.length,after:info.size,sha256:crypto.createHash('sha256').update(original).digest('hex')});
  }
  // Only img tags change: JSON-LD retains the stable original logo identity.
  for (const file of walk(root).filter(file => file.endsWith('.html'))) {
    const before = fs.readFileSync(file,'utf8');
    const after = before.replace(/<img\b[^>]*>/g,tag => {
      const item = mappings.find(item => tag.includes(item.source) || tag.includes(item.target));
      if (!item) return tag;
      let result = tag.replace(item.source,item.target);
      if (!result.includes('decoding=')) result = result.replace(/>$/,' decoding="async">');
      if (!item.source.includes('logo') && !result.includes('loading=')) result = result.replace(/>$/,' loading="lazy">');
      if (item.source.includes('logo')) result = result.replace(/width="\d+"/,`width="${item.width}"`).replace(/height="\d+"/,`height="${item.height}"`);
      else if (item.source.includes('/icon-')) result = result.replace(/height="\d+"/,`height="${Math.round(item.height/2)}"`);
      return result;
    });
    if (after !== before) fs.writeFileSync(file,after);
  }
  // Preserve the data-driven renderer and homepage rebuild's icon mapping.
  for (const relative of ['data/content.js','scripts/apply-indexing-policy.js']) {
    const file = path.join(root,relative), before = fs.readFileSync(file,'utf8');
    let after = before;
    for (const name of names.filter(name => name.startsWith('icon-'))) after = after.replaceAll(`${name}.png`,`${name}.webp`);
    if (after !== before) fs.writeFileSync(file,after);
  }
  console.log(JSON.stringify(mappings,null,2));
}
main().catch(error => {console.error(error);process.exitCode=1;});
