const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));

// Evaluate our declarative redirect contract; this is not a Vercel server emulator.
function redirectFor(pathname, host = 'www.perthhandymate.com.au') {
  for (const rule of config.routes || []) {
    if (!rule.src || !rule.headers?.Location) continue;
    if (rule.has?.some(condition => condition.type !== 'host'
      || !new RegExp(`^(?:${condition.value})$`).test(host))) continue;
    const match = new RegExp(rule.src).exec(pathname);
    if (match) return {
      status: rule.status,
      location: rule.headers.Location.replace(/\$(\d+)/g, (_, group) => match[Number(group)] || ''),
    };
  }
  return null;
}

module.exports = { root, config, redirectFor };
