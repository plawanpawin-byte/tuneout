'use strict';
// Stamps the app name, version and icon into the .exe so Task Manager and the taskbar
// show the app's own name instead of "Electron". (electron-builder's own editing is off
// because it needs a symlink-capable winCodeSign download.)
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
exports.default = async function (ctx) {
  const info = ctx.packager.appInfo;
  const exe = path.join(ctx.appOutDir, info.productFilename + '.exe');
  const cache = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign');
  let rc = null;
  for (const d of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    const p = path.join(cache, d, 'rcedit-x64.exe'); if (fs.existsSync(p)) rc = p;
  }
  if (!rc) throw new Error('rcedit-x64.exe not found in the electron-builder cache');
  const ico = path.join(ctx.packager.projectDir, 'build', 'icon.ico');
  const name = info.productName, v = info.version;
  const args = [exe, '--set-version-string', 'FileDescription', name, '--set-version-string', 'ProductName', name,
    '--set-version-string', 'InternalName', name, '--set-version-string', 'OriginalFilename', name + '.exe',
    '--set-version-string', 'CompanyName', 'Lookout', '--set-version-string', 'LegalCopyright', 'MIT License',
    '--set-file-version', v, '--set-product-version', v];
  if (fs.existsSync(ico)) args.push('--set-icon', ico);
  execFileSync(rc, args);
};
