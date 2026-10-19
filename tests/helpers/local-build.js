const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sourceRoot = path.resolve(__dirname, '../..');

function createBuildFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phm-local-build-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(sourceRoot, root, {
    recursive: true,
    filter: file => {
      const relative = path.relative(sourceRoot, file);
      const first = relative.split(path.sep)[0];
      return !['.git', '.superpowers', 'dist', 'node_modules'].includes(first)
        && !relative.endsWith('.zip')
        && !(first.startsWith('.env') && first !== '.env.example');
    },
  });
  return root;
}

function buildLocal(root) {
  return spawnSync(process.execPath, ['scripts/build-local.js'], {
    cwd: root,
    encoding: 'utf8',
    // Fixtures deliberately exclude node_modules; reuse installed build dependencies.
    env: { ...process.env, NODE_PATH: [path.join(sourceRoot, 'node_modules'), process.env.NODE_PATH].filter(Boolean).join(path.delimiter) },
  });
}

module.exports = { createBuildFixture, buildLocal };
