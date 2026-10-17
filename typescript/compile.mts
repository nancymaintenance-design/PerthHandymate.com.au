import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import type * as TypeScript from 'typescript';

const require = createRequire(import.meta.url);
const ts: typeof TypeScript = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'typescript');
const check = process.argv.includes('--check');

// Type errors must stop the build before any previously working output is replaced.
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit'], { cwd: root, stdio: 'inherit' });

function sources(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name);
    return entry.isDirectory() ? sources(file) : file.endsWith('.ts') && !file.endsWith('.d.ts') && file !== fileURLToPath(import.meta.url) ? [file] : [];
  });
}

let count = 0;
for (const source of sources(sourceRoot).sort()) {
  const relative = path.relative(sourceRoot, source).replace(/\.ts$/, '.js');
  const target = path.join(root, relative);
  const result = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    fileName: source,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, newLine: ts.NewLineKind.LineFeed },
  });
  // All runtime files deliberately keep their original classic-script/UMD or
  // CommonJS contract. Type-only imports can emit an empty module marker;
  // removing that marker avoids changing existing <script> URLs to modules.
  const output = '// Generated from typescript/' + relative.replace(/\.js$/, '.ts').replaceAll('\\', '/') + '; edit the TypeScript source.\n' + result.outputText.replace(/^export \{\};\s*$/gm, '');
  if (/^\s*(?:import\s|export\s)/m.test(output)) throw new Error(`Runtime ES module syntax would break the existing entry: ${relative}`);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== output) throw new Error(`Stale JavaScript artifact: ${relative}; run npm run compile.`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output);
  }
  count++;
}
console.log(`${check ? 'Verified' : 'Compiled'} ${count} TypeScript website entries; public URLs unchanged.`);
