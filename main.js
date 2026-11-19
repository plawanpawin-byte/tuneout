'use strict';
// Tuneout main process. Local-only: no network access, files only via user-chosen dialogs.
const { app, BrowserWindow, ipcMain, dialog, session, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const TITLE = 'Tuneout';
const granted = new Map(); // opaque id -> absolute path the user picked in a dialog
let win = null;

function grant(p) {
  const id = crypto.randomBytes(8).toString('hex');
  granted.set(id, p);
  return id;
}
function pathOf(id) {
  const p = granted.get(String(id));
  if (!p) throw new Error('Path was not granted by the user');
  return p;
}
module.exports = { grant, pathOf };

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: TITLE, backgroundColor: '#262626', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, sandbox: true, nodeIntegration: false,
      webSecurity: true, allowRunningInsecureContent: false, spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => { win = null; });
}

const filters = (list) => (list || []).map((f) => ({ name: f[0], extensions: f[1] }));

ipcMain.handle('file:open', async (_e, opts = {}) => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile', ...(opts.multi ? ['multiSelections'] : [])],
    filters: filters(opts.filters),
  });
  if (r.canceled) return [];
  const out = [];
  for (const p of r.filePaths) {
    const st = fs.statSync(p);
    const item = { id: grant(p), name: path.basename(p), size: st.size };
    if (opts.read !== false && st.size <= (opts.maxBytes || 512 * 1024 * 1024)) item.data = fs.readFileSync(p);
    out.push(item);
  }
  return out;
});

ipcMain.handle('file:save', async (_e, opts = {}) => {
  const r = await dialog.showSaveDialog(win, {
    defaultPath: opts.name, filters: filters(opts.filters),
  });
  if (r.canceled || !r.filePath) return null;
  if (opts.data) fs.writeFileSync(r.filePath, Buffer.from(opts.data));
  return { id: grant(r.filePath), name: path.basename(r.filePath) };
});

ipcMain.handle('file:write', async (_e, id, data) => {
  fs.writeFileSync(pathOf(id), Buffer.from(data));
  return true;
});

ipcMain.handle('file:read', async (_e, id) => fs.readFileSync(pathOf(id)));

ipcMain.handle('app:info', () => ({ name: TITLE, version: app.getVersion() }));


// ---- media host (ffmpeg) ----------------------------------------------------
// Renderer never passes raw paths. It passes opaque ids granted by dialogs and an
// argument list that is validated here. Media is served to <video>/<audio> through
// a private lkmedia:// scheme that only resolves ids the user granted.
const { spawn } = require('child_process');
const os = require('os');
const { protocol, net } = require('electron');
const { pathToFileURL } = require('url');
const fixAsar = (p) => p.replace('app.asar', 'app.asar.unpacked');
const FFMPEG = fixAsar(require('ffmpeg-static'));
const FFPROBE = fixAsar(require('ffprobe-static').path);
const TMPDIR = path.join(os.tmpdir(), 'lookout-' + TITLE.toLowerCase());
const jobs = new Map();
let jobSeq = 0;

protocol.registerSchemesAsPrivileged([{ scheme: 'lkmedia', privileges: { stream: true, supportFetchAPI: true, standard: true, secure: true } }]);
function registerMediaProtocol() {
  protocol.handle('lkmedia', (req) => {
    try {
      const id = new URL(req.url).hostname;
      const p = pathOf(id);
      return net.fetch(pathToFileURL(p).toString(), { headers: req.headers });
    } catch (e) { return new Response('not found', { status: 404 }); }
  });
}
function tempPath(ext) {
  if (!/^[a-z0-9]{2,5}$/i.test(ext || '')) throw new Error('bad extension');
  fs.mkdirSync(TMPDIR, { recursive: true });
  return path.join(TMPDIR, crypto.randomBytes(6).toString('hex') + '.' + ext.toLowerCase());
}
function cleanupTemp() { try { fs.rmSync(TMPDIR, { recursive: true, force: true }); } catch (_) {} }
app.on('will-quit', cleanupTemp);

const FORBIDDEN = ['://', 'pipe:', 'file:', 'concat:', 'subfile', 'data:', 'tcp', 'udp', 'http', 'movie=', 'amovie', 'subtitles', 'sendcmd', 'textfile', 'fontfile', 'filter_script', 'protocol_whitelist', 'attach', 'dump_attachment', '-report', 'readfile', 'lut3d', 'haldclut', '\\', 'ffreport'];
const LAVFI_SRC = /^(color|anullsrc|sine|nullsrc|aevalsrc|testsrc2?)(=|$)/;
function checkArgs(args) {
  if (!Array.isArray(args) || args.length > 500) throw new Error('bad arguments');
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (typeof a !== 'string' || a.length > 6000) throw new Error('bad argument');
    let s = a.replace(/\{(in\d+|out|font)\}/g, 'X').replace(/fontfile=X/g, 'ff=X').toLowerCase();
    if (a === '-i') {
      const v = args[i + 1];
      if (typeof v !== 'string') throw new Error('bad input');
      if (/^\{in\d+\}$/.test(v)) { i++; continue; }
      if (args[i - 1] === '-f' && args[i - 2] !== 'concat' && args[i - 1] && args[i - 1] === '-f' && args[i] === '-i') {
        // expect: -f lavfi -i <spec>; the "lavfi" token precedes -i, so check two back
      }
      if (args[i - 2] === '-f' && args[i - 1] === 'lavfi' && LAVFI_SRC.test(v) && !FORBIDDEN.some((f) => v.toLowerCase().includes(f))) { i++; continue; }
      throw new Error('input not allowed');
    }
    if (s.startsWith('-') && ['-protocol_whitelist', '-filter_script', '-filter_complex_script', '-attach', '-dump_attachment', '-report', '-progress', '-y', '-n'].includes(s)) throw new Error('option not allowed');
    if (FORBIDDEN.some((f) => s.includes(f)) || /(^|[,;\s])ass=/.test(s)) throw new Error('argument not allowed: ' + a.slice(0, 40));
  }
}
function resolveOut(out) {
  if (out && typeof out === 'object') {
    const dir = pathOf(out.dir);
    if (!fs.statSync(dir).isDirectory()) throw new Error('not a folder');
    let base = path.basename(String(out.name || 'output')).replace(/[<>:"\/\\|?*\u0000-\u001f]/g, '_').slice(0, 120) || 'output';
    const ext = path.extname(base); const stem = base.slice(0, base.length - ext.length);
    if (!/^\.[a-z0-9]{2,5}$/i.test(ext)) throw new Error('bad file name');
    let p = path.join(dir, base), n = 1;
    while (fs.existsSync(p)) p = path.join(dir, stem + ' (' + (n++) + ')' + ext);
    return { p, id: grant(p), temp: false };
  }
  if (typeof out === 'string' && out.startsWith('temp:')) { const p = tempPath(out.slice(5)); return { p, id: grant(p), temp: true }; }
  const p = pathOf(out); return { p, id: String(out) };
}
async function runJob(opts) {
  const { args, inputs = [], out, duration } = opts;
  checkArgs(args);
  const ins = inputs.map((id) => pathOf(id));
  const o = resolveOut(out);
  if (ins.some((x) => path.resolve(x).toLowerCase() === path.resolve(o.p).toLowerCase())) throw new Error('Output must differ from input');
  const font = 'C\\:/Windows/Fonts/segoeui.ttf';
  const real = args.map((a) => a.replace(/\{in(\d+)\}/g, (_m, n) => { if (!ins[+n]) throw new Error('missing input'); return ins[+n]; }).replace(/\{out\}/g, o.p).replace(/\{font\}/g, font));
  const jid = ++jobSeq;
  return new Promise((resolve, reject) => {
    const c = spawn(FFMPEG, ['-hide_banner', '-nostdin', '-y', '-progress', 'pipe:1', '-nostats', ...real], { windowsHide: true });
    jobs.set(jid, c);
    let err = '';
    c.stderr.on('data', (d) => { err = (err + d.toString()).slice(-4000); });
    c.stdout.on('data', (d) => {
      const m = /out_time_(?:us|ms)=(\d+)/g; let r, last = null;
      const txt = d.toString();
      const mm = [...txt.matchAll(/out_time_us=(\d+)/g)]; if (mm.length) last = +mm[mm.length - 1][1] / 1e6;
      if (last != null && win && !win.isDestroyed()) win.webContents.send('media:progress', { job: jid, t: last, duration: duration || 0 });
    });
    c.on('error', (e) => { jobs.delete(jid); reject(e); });
    c.on('close', (code, sig) => {
      jobs.delete(jid);
      if (code === 0) resolve({ ok: true, log: err.slice(-1500), id: o.id, name: path.basename(o.p), size: fs.existsSync(o.p) ? fs.statSync(o.p).size : 0 });
      else { if (o.temp) try { fs.unlinkSync(o.p); } catch (_) {} reject(new Error(sig ? 'Cancelled' : err.split('\n').filter(Boolean).slice(-4).join('\n'))); }
    });
  });
}
function probe(file) {
  return new Promise((resolve) => {
    const c = spawn(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], { windowsHide: true });
    let out = '', err = '';
    c.stdout.on('data', (d) => (out += d));
    c.stderr.on('data', (d) => (err += d));
    c.on('error', (e) => resolve({ code: -1, json: null, err: String(e) }));
    c.on('close', (code) => { let json = null; try { json = out ? JSON.parse(out) : null; } catch (_) {} resolve({ code, json, err: err.slice(-3000) }); });
  });
}
function peaks(file, n) {
  return new Promise((resolve) => {
    const c = spawn(FFMPEG, ['-hide_banner', '-nostdin', '-i', file, '-vn', '-ac', '1', '-ar', '8000', '-f', 's16le', 'pipe:1'], { windowsHide: true });
    const chunks = []; c.stdout.on('data', (d) => chunks.push(d)); c.stderr.on('data', () => {});
    c.on('error', () => resolve([]));
    c.on('close', () => {
      const buf = Buffer.concat(chunks); const total = Math.floor(buf.length / 2); if (!total) return resolve([]);
      const out = new Array(n).fill(0); const per = total / n;
      for (let i = 0; i < total; i++) { const v = Math.abs(buf.readInt16LE(i * 2)) / 32768; const b = Math.min(n - 1, Math.floor(i / per)); if (v > out[b]) out[b] = v; }
      resolve(out);
    });
  });
}
ipcMain.handle('media:probe', async (_e, fid) => probe(pathOf(fid)));
ipcMain.handle('media:run', async (_e, opts) => runJob(opts || {}));
ipcMain.handle('media:peaks', async (_e, fid, n) => peaks(pathOf(fid), Math.min(Math.max(+n || 800, 50), 4000)));
ipcMain.handle('media:cancel', () => { for (const c of jobs.values()) c.kill(); jobs.clear(); return true; });
ipcMain.handle('media:url', (_e, fid) => { pathOf(fid); return 'lkmedia://' + String(fid) + '/f'; });
ipcMain.handle('file:temp', async (_e, data, ext) => { const p = tempPath(ext); fs.writeFileSync(p, Buffer.from(data)); return { id: grant(p), size: fs.statSync(p).size }; });
ipcMain.handle('file:remove', async (_e, id) => { const p = pathOf(id); if (p.startsWith(TMPDIR)) { try { fs.unlinkSync(p); } catch (_) {} granted.delete(String(id)); } return true; });
ipcMain.handle('file:reveal', async (_e, id) => { require('electron').shell.showItemInFolder(pathOf(id)); return true; });
ipcMain.handle('file:folder', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] }); if (r.canceled || !r.filePaths[0]) return null; return { id: grant(r.filePaths[0]), name: path.basename(r.filePaths[0]) }; });


app.whenReady().then(() => {
  registerMediaProtocol();
  // Hard network kill-switch: this app never talks to the internet.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*', 'ftp://*/*'] }, (_d, cb) => cb({ cancel: true }));
  const okPerm = (perm, url) => (perm === 'media') && String(url || '').startsWith('file://');
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb, details) => cb(okPerm(perm, details && details.requestingUrl)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm, origin) => okPerm(perm, origin || 'file://'));
  createWindow();
});
app.on('window-all-closed', () => app.quit());
