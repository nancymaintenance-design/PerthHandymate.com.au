const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');

function loadPlaywright({ from = __filename, env = process.env } = {}) {
  const requireFrom = createRequire(from);
  let standard;
  try { standard = requireFrom.resolve('playwright'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error;
  }
  if (standard) return requireFrom(standard);
  if (env.PHM_PLAYWRIGHT_MODULE) return requireFrom(path.resolve(env.PHM_PLAYWRIGHT_MODULE));
  const profile = env.USERPROFILE || env.HOME;
  const optional = profile && path.join(profile, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  if (optional && fs.existsSync(optional)) return requireFrom(optional);
  throw new Error('Playwright is required for mandatory browser tests. Follow the dev-only setup in README.md or set PHM_PLAYWRIGHT_MODULE.');
}

function browserLaunchOptions(bundledExecutable, { env = process.env, platform = process.platform } = {}) {
  if (env.PHM_BROWSER_CHANNEL && env.PHM_BROWSER_EXECUTABLE_PATH) throw new Error('Set either PHM_BROWSER_CHANNEL or PHM_BROWSER_EXECUTABLE_PATH, not both.');
  if (env.PHM_BROWSER_CHANNEL) return { headless: true, channel: env.PHM_BROWSER_CHANNEL };
  if (env.PHM_BROWSER_EXECUTABLE_PATH) {
    const executablePath = path.resolve(env.PHM_BROWSER_EXECUTABLE_PATH);
    if (!fs.existsSync(executablePath)) throw new Error('Configured browser executable is missing. See README.md.');
    return { headless: true, executablePath };
  }
  if (bundledExecutable && fs.existsSync(bundledExecutable)) return { headless: true };
  const windowsRoots = [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean);
  const installed = platform === 'win32' ? windowsRoots.flatMap(folder => [
    path.join(folder, 'Google/Chrome/Application/chrome.exe'), path.join(folder, 'Microsoft/Edge/Application/msedge.exe'),
  ]) : platform === 'darwin' ? [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ] : platform === 'linux' ? ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'] : [];
  const executablePath = installed.find(file => fs.existsSync(file));
  if (executablePath) return { headless: true, executablePath };
  throw new Error('A Chromium browser is required for mandatory browser tests. See README.md to install bundled Chromium or select installed Chrome/Edge.');
}

module.exports = { loadPlaywright, browserLaunchOptions };
