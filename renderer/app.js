'use strict';
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toast = (m) => { const t = h('div', { class: 'toast', text: m }); document.body.append(t); setTimeout(() => t.remove(), 2800); };
const fmt = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + r.toFixed(2).padStart(5, '0'); };

// ---------- audio state ----------
const SR = 44100;
let ch = [new Float32Array(0), new Float32Array(0)];
let sel = { a: 0, b: 0 };          // a==b: cursor only
let view = { start: 0, spp: 200 }; // samples per pixel
let clip = null;                   // {l,r}
let undoS = [], redoS = [], fileName = '', dirty = false;
let actx = null, src = null, playing = false, playT0 = 0, playFrom = 0, playTo = 0, loop = false;
let recording = null;
const N = () => ch[0].length;

function snapshot() { return { l: ch[0].slice(), r: ch[1].slice(), sel: { ...sel } }; }
function commit() { undoS.push(snapshot()); if (undoS.length > 12) undoS.shift(); redoS = []; dirty = true; }
function restore(s) { ch = [s.l, s.r]; sel = s.sel; }
function undo() { if (!undoS.length) return; stop(); redoS.push(snapshot()); restore(undoS.pop()); draw(); renderStatus(); }
function redo() { if (!redoS.length) return; stop(); undoS.push(snapshot()); restore(redoS.pop()); draw(); renderStatus(); }

// ---------- UI ----------
const app = $('#app');
const toolbar = h('div', { class: 'toolbar' });
const wave = h('canvas', { style: 'flex:1;min-height:0;width:100%;display:block;background:#1c1c1c;cursor:text' });
const ruler = h('canvas', { style: 'height:22px;width:100%;display:block;background:#262626' });
const center = h('div', { style: 'flex:1;min-width:0;display:flex;flex-direction:column;min-height:0' }, ruler, wave);
const right = h('div', { class: 'sidebar right', style: 'width:250px;overflow:auto' });
const main = h('div', { class: 'main', style: 'flex:1;min-height:0;min-width:0;width:100%;overflow:hidden' }, center, right);
const status = h('div', { class: 'status' });
app.append(toolbar, main, status);
const btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, onclick: fn, text: label });
const bPlay = btn('Play', togglePlay, 'primary'), bRec = btn('Record', toggleRecord);
const time = h('span', { style: 'font-family:Consolas,monospace;min-width:150px;text-align:center', text: '0:00.00' });
toolbar.append(btn('Open', openAudio), btn('Save as', exportAudio), h('span', { class: 'sep' }), bPlay, btn('Stop', stop), bRec, h('label', { class: 'row', style: 'margin-left:6px' }, h('input', { type: 'checkbox', onchange: (e) => { loop = e.target.checked; } }), 'Loop'), time, h('span', { class: 'sep' }),
  btn('Undo', undo), btn('Redo', redo), h('span', { class: 'sep' }), btn('-', () => zoom(2), 'icon'), btn('+', () => zoom(0.5), 'icon'), btn('Fit', fit));

function renderRight() {
  right.textContent = '';
  const sect = (t) => right.append(h('h3', { text: t }));
  const row = (...b) => right.append(h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px' }, ...b));
  sect('Edit');
  row(btn('Cut', cut), btn('Copy', copy), btn('Paste', paste), btn('Delete', del));
  row(btn('Trim to selection', trim), btn('Silence', () => apply('Silence', (d) => d.fill(0))), btn('Select all', () => { sel = { a: 0, b: N() }; draw(); renderStatus(); }));
  sect('Effects (selection or all)');
  row(btn('Fade in', () => apply('Fade in', (d) => { for (let i = 0; i < d.length; i++) d[i] *= i / d.length; })), btn('Fade out', () => apply('Fade out', (d) => { for (let i = 0; i < d.length; i++) d[i] *= 1 - i / d.length; })));
  row(btn('Normalize', normalize), btn('Reverse', () => apply('Reverse', (d) => d.reverse())), btn('Invert', () => apply('Invert', (d) => { for (let i = 0; i < d.length; i++) d[i] = -d[i]; })));
  const db = h('input', { type: 'number', value: 3, step: 1, style: 'width:60px' });
  row(h('span', { text: 'Gain' }), db, h('span', { text: 'dB' }), btn('Apply', () => { const g = Math.pow(10, +db.value / 20); apply('Gain', (d) => { for (let i = 0; i < d.length; i++) d[i] = clamp(d[i] * g, -1, 1); }); }));
  const hz = h('input', { type: 'number', value: 120, min: 20, max: 20000, style: 'width:70px' });
  row(h('span', { text: 'Filter' }), hz, h('span', { text: 'Hz' }));
  row(btn('Low cut', () => filter('highpass', +hz.value)), btn('High cut', () => filter('lowpass', +hz.value)), btn('Bass boost', () => filter('lowshelf', +hz.value, 6)), btn('Treble boost', () => filter('highshelf', +hz.value, 6)));
  const sp = h('select', {}, ...[['0.5', 'Half speed (lower pitch)'], ['0.75', '0.75x'], ['1.25', '1.25x'], ['1.5', '1.5x'], ['2', 'Double speed (higher pitch)']].map(([v, t]) => h('option', { value: v, text: t })));
  sect('Speed and pitch'); row(sp, btn('Apply', () => speed(+sp.value)));
  sect('Generate');
  const secs = h('input', { type: 'number', value: 1, min: 0.1, step: 0.5, style: 'width:60px' });
  row(h('span', { text: 'Silence' }), secs, h('span', { text: 's' }), btn('Insert', () => insertSilence(+secs.value)));
  sect('Info');
  right.append(h('div', { class: 'muted', style: 'font-size:12px;line-height:1.7', text: 'Length ' + fmt(N() / SR) + '\nSelection ' + (sel.a === sel.b ? 'none (cursor at ' + fmt(sel.a / SR) + ')' : fmt(Math.min(sel.a, sel.b) / SR) + ' to ' + fmt(Math.max(sel.a, sel.b) / SR)) + '\nSpace: play or pause\nWheel: zoom, Shift+wheel: scroll\nClick: cursor, drag: select' }));
  right.lastChild.style.whiteSpace = 'pre-line';
}
function renderStatus() {
  status.textContent = '';
  const s0 = Math.min(sel.a, sel.b), s1 = Math.max(sel.a, sel.b);
  status.append(h('span', { text: (fileName || 'Untitled') + (dirty ? ' *' : '') }), h('span', { class: 'grow' }), h('span', { text: s0 === s1 ? 'Cursor ' + fmt(s0 / SR) : 'Selection ' + fmt((s1 - s0) / SR) }), h('span', { text: 'Length ' + fmt(N() / SR) }), h('span', { text: '44.1 kHz stereo' }));
  renderRight();
}

// ---------- drawing ----------
function size() { const dpr = window.devicePixelRatio || 1; const r = wave.getBoundingClientRect(); for (const c of [wave, ruler]) { const w = Math.round(r.width * dpr); const hh = Math.round((c === wave ? r.height : 22) * dpr); if (c.width !== w || c.height !== hh) { c.width = w; c.height = hh; } } return { w: r.width, h: r.height, dpr }; }
const xOf = (s) => (s - view.start) / view.spp;
const sOf = (x) => view.start + x * view.spp;
function draw() {
  const { w, h: hh, dpr } = size(); const ctx = wave.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1c1c1c'; ctx.fillRect(0, 0, w, hh);
  const total = N();
  const lanes = 2, lh = hh / lanes;
  for (let k = 0; k < lanes; k++) { ctx.fillStyle = '#242424'; ctx.fillRect(0, k * lh + lh / 2, w, 1); }
  // selection
  if (sel.a !== sel.b) { const x0 = xOf(Math.min(sel.a, sel.b)), x1 = xOf(Math.max(sel.a, sel.b)); ctx.fillStyle = 'rgba(210,210,210,.16)'; ctx.fillRect(x0, 0, x1 - x0, hh); }
  if (total) {
    ctx.fillStyle = '#c8c8c8';
    for (let k = 0; k < lanes; k++) {
      const d = ch[k]; const mid = k * lh + lh / 2, amp = lh / 2 - 3;
      for (let x = 0; x < w; x++) {
        const s0 = Math.floor(sOf(x)), s1 = Math.min(total, Math.floor(sOf(x + 1)) + 1); if (s0 >= total) break; if (s1 <= 0) continue;
        let mn = 1, mx = -1; const step = Math.max(1, Math.floor((s1 - s0) / 48));
        for (let i = Math.max(0, s0); i < s1; i += step) { const v = d[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        if (mn > mx) continue;
        const y0 = mid - mx * amp, y1 = mid - mn * amp; ctx.fillRect(x, y0, 1, Math.max(1, y1 - y0));
      }
    }
  } else { ctx.fillStyle = '#7a7a7a'; ctx.font = '14px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('Open an audio file or press Record', w / 2, hh / 2); ctx.textAlign = 'left'; }
  // cursor / playhead
  const cx = playing ? xOf(currentPos()) : xOf(sel.a);
  if (sel.a === sel.b || playing) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx), 0, 1, hh); }
  // ruler
  const rc = ruler.getContext('2d'); rc.setTransform(dpr, 0, 0, dpr, 0, 0); rc.fillStyle = '#2b2b2b'; rc.fillRect(0, 0, w, 22); rc.fillStyle = '#9a9a9a'; rc.font = '11px Segoe UI'; rc.strokeStyle = '#555';
  const secPerPx = view.spp / SR; const steps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]; const tick = steps.find((s) => s / secPerPx > 70) || 600;
  for (let t = Math.ceil(view.start / SR / tick) * tick; t * SR < sOf(w); t += tick) { const x = xOf(t * SR); rc.fillRect(x, 14, 1, 8); rc.fillText(fmt(t), x + 3, 11); }
  time.textContent = fmt(playing ? currentPos() / SR : Math.min(sel.a, sel.b) / SR) + ' / ' + fmt(N() / SR);
}
function fit() { const { w } = size(); view.spp = Math.max(1, N() / Math.max(w, 1)); view.start = 0; draw(); }
function zoom(f, cxPx) { const { w } = size(); const cx = cxPx ?? w / 2; const anchor = sOf(cx); view.spp = clamp(view.spp * f, 1, Math.max(1, N() / 20)); view.start = Math.max(0, anchor - cx * view.spp); draw(); }
new ResizeObserver(draw).observe(center);

// ---------- selection with the mouse ----------
let dragging = null;
wave.addEventListener('pointerdown', (e) => { if (!N()) return; wave.setPointerCapture(e.pointerId); const r = wave.getBoundingClientRect(); const s = clamp(Math.round(sOf(e.clientX - r.left)), 0, N()); if (e.shiftKey && sel.a !== sel.b || e.shiftKey) { sel.b = s; } else { sel = { a: s, b: s }; } dragging = true; stopIfPlaying(); draw(); renderStatus(); });
wave.addEventListener('pointermove', (e) => { if (!dragging) return; const r = wave.getBoundingClientRect(); sel.b = clamp(Math.round(sOf(e.clientX - r.left)), 0, N()); draw(); });
wave.addEventListener('pointerup', () => { dragging = false; renderStatus(); });
wave.addEventListener('wheel', (e) => { e.preventDefault(); const r = wave.getBoundingClientRect(); if (e.shiftKey) { view.start = clamp(view.start + e.deltaY * view.spp, 0, Math.max(0, N() - 10)); draw(); } else zoom(e.deltaY < 0 ? 0.8 : 1.25, e.clientX - r.left); }, { passive: false });
function stopIfPlaying() { if (playing) stop(); }

// ---------- editing ----------
const range = () => { const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b); return a === b ? [0, N()] : [a, b]; };
const hasSel = () => sel.a !== sel.b;
function apply(name, fn) { if (!N()) return; stop(); commit(); const [a, b] = range(); for (const d of ch) fn(d.subarray(a, b)); draw(); renderStatus(); }
function normalize() { if (!N()) return; stop(); commit(); const [a, b] = range(); let pk = 0; for (const d of ch) { const s = d.subarray(a, b); for (let i = 0; i < s.length; i++) { const v = Math.abs(s[i]); if (v > pk) pk = v; } } if (!pk) return; const g = 0.89 / pk; for (const d of ch) { const s = d.subarray(a, b); for (let i = 0; i < s.length; i++) s[i] *= g; } draw(); renderStatus(); }
function copy() { if (!hasSel()) { toast('Select part of the audio first'); return; } const [a, b] = range(); clip = { l: ch[0].slice(a, b), r: ch[1].slice(a, b) }; toast('Copied ' + fmt((b - a) / SR)); }
function del() { if (!hasSel()) { toast('Select part of the audio first'); return; } stop(); commit(); const [a, b] = range(); ch = ch.map((d) => { const o = new Float32Array(d.length - (b - a)); o.set(d.subarray(0, a)); o.set(d.subarray(b), a); return o; }); sel = { a, b: a }; draw(); renderStatus(); }
function cut() { if (!hasSel()) { toast('Select part of the audio first'); return; } copy(); del(); }
function paste() { if (!clip) { toast('Nothing copied yet'); return; } stop(); commit(); const at = hasSel() ? Math.min(sel.a, sel.b) : sel.a; const [c0, c1] = [clip.l, clip.r]; const rep = hasSel() ? Math.max(sel.a, sel.b) - at : 0; ch = [[ch[0], c0], [ch[1], c1]].map(([d, c]) => { const o = new Float32Array(d.length - rep + c.length); o.set(d.subarray(0, at)); o.set(c, at); o.set(d.subarray(at + rep), at + c.length); return o; }); sel = { a: at + c0.length, b: at + c0.length }; draw(); renderStatus(); }
function trim() { if (!hasSel()) { toast('Select the part to keep first'); return; } stop(); commit(); const [a, b] = range(); ch = ch.map((d) => d.slice(a, b)); sel = { a: 0, b: 0 }; fit(); renderStatus(); }
function insertSilence(sec) { if (!(sec > 0) || sec > 3600) return; stop(); commit(); const at = Math.min(sel.a, sel.b), n = Math.round(sec * SR); ch = ch.map((d) => { const o = new Float32Array(d.length + n); o.set(d.subarray(0, at)); o.set(d.subarray(at), at + n); return o; }); draw(); renderStatus(); }
async function filter(type, freq, gain = 0) {
  if (!N()) return; if (!(freq >= 20 && freq <= 20000)) { toast('Enter a frequency from 20 to 20000'); return; }
  stop(); commit(); const [a, b] = range(); const len = b - a;
  const oc = new OfflineAudioContext(2, len, SR); const buf = oc.createBuffer(2, len, SR); buf.copyToChannel(ch[0].subarray(a, b), 0); buf.copyToChannel(ch[1].subarray(a, b), 1);
  const s = oc.createBufferSource(); s.buffer = buf; const f = oc.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.gain.value = gain; f.Q.value = 0.707; s.connect(f); f.connect(oc.destination); s.start();
  const out = await oc.startRendering(); for (let k = 0; k < 2; k++) { const d = out.getChannelData(k); for (let i = 0; i < len; i++) ch[k][a + i] = clamp(d[i], -1, 1); }
  draw(); renderStatus();
}
function speed(f) {
  if (!N()) return; stop(); commit(); const [a, b] = range();
  ch = ch.map((d) => { const seg = d.subarray(a, b); const n = Math.floor(seg.length / f); const o = new Float32Array(n); for (let i = 0; i < n; i++) { const p = i * f, i0 = Math.floor(p), fr = p - i0; o[i] = seg[i0] * (1 - fr) + (seg[Math.min(seg.length - 1, i0 + 1)] || 0) * fr; } const res = new Float32Array(d.length - (b - a) + n); res.set(d.subarray(0, a)); res.set(o, a); res.set(d.subarray(b), a + n); return res; });
  sel = { a: 0, b: 0 }; fit(); renderStatus();
}

// ---------- playback ----------
function ensureCtx() { if (!actx) actx = new AudioContext({ sampleRate: SR }); return actx; }
function currentPos() { return clamp(playFrom + Math.round((actx.currentTime - playT0) * SR), 0, N()); }
function togglePlay() { playing ? stop(true) : play(); }
function play() {
  if (!N()) return; const c = ensureCtx(); c.resume();
  const a = hasSel() ? Math.min(sel.a, sel.b) : sel.a, b = hasSel() ? Math.max(sel.a, sel.b) : N();
  if (a >= b) return;
  const buf = c.createBuffer(2, b - a, SR); buf.copyToChannel(ch[0].subarray(a, b), 0); buf.copyToChannel(ch[1].subarray(a, b), 1);
  src = c.createBufferSource(); src.buffer = buf; src.loop = loop && hasSel(); src.connect(c.destination);
  src.onended = () => { if (src === s2) { playing = false; bPlay.textContent = 'Play'; draw(); } }; const s2 = src;
  playFrom = a; playTo = b; playT0 = c.currentTime; src.start(); playing = true; bPlay.textContent = 'Pause'; tick();
}
function tick() { if (!playing) return; draw(); const p = currentPos(); const x = xOf(p); const { w } = size(); if (x > w - 20) { view.start = p - 40 * view.spp; } requestAnimationFrame(tick); }
function stop(keepCursor) { if (src) { try { src.onended = null; src.stop(); } catch (_) {} src = null; } if (playing && keepCursor && actx) { const p = currentPos(); sel = { a: p, b: p }; } playing = false; bPlay.textContent = 'Play'; draw(); renderStatus(); }

// ---------- recording ----------
async function toggleRecord() {
  if (recording) { recording.rec.stop(); return; }
  try {
    stop(); const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const rec = new MediaRecorder(stream); const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); recording = null; bRec.textContent = 'Record'; bRec.classList.remove('on');
      try { const ab = await new Blob(chunks, { type: rec.mimeType }).arrayBuffer(); const dec = await ensureCtx().decodeAudioData(ab); insertBuffer(dec); toast('Recorded ' + fmt(dec.duration)); } catch (e) { toast('Could not read the recording'); }
    };
    rec.start(250); recording = { rec }; bRec.textContent = 'Stop recording'; bRec.classList.add('on');
  } catch (e) { toast('Microphone not available: ' + (e.name === 'NotAllowedError' ? 'permission denied' : e.message)); }
}
function insertBuffer(buf) {
  commit(); const l = buf.getChannelData(0), r = buf.numberOfChannels > 1 ? buf.getChannelData(1) : l;
  const at = N() ? Math.max(sel.a, sel.b) : 0; const n = l.length;
  const mk = (d, c) => { const o = new Float32Array(d.length + n); o.set(d.subarray(0, at)); o.set(c, at); o.set(d.subarray(at), at + n); return o; };
  ch = [mk(ch[0], l), mk(ch[1], r)]; sel = { a: at, b: at + n }; fit(); renderStatus();
}

// ---------- files ----------
const FILTERS = [['Audio and video', ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus', 'wma', 'mp4', 'mkv', 'mov', 'webm', 'avi']], ['All files', ['*']]];
async function openAudio() {
  if (dirty && !confirm('Discard unsaved changes?')) return;
  const f = (await window.host.openFiles({ read: false, filters: FILTERS }))[0]; if (!f) return;
  try {
    toast('Reading ' + f.name + '...');
    const r = await window.host.run({ args: ['-i', '{in0}', '-vn', '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', '{out}'], inputs: [f.id], out: 'temp:wav' });
    const bytes = await window.host.readFile(r.id); window.host.removeFile(r.id);
    const buf = await ensureCtx().decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    ch = [buf.getChannelData(0).slice(), (buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0)).slice()];
    sel = { a: 0, b: 0 }; undoS = []; redoS = []; fileName = f.name; dirty = false; fit(); renderStatus();
  } catch (e) { toast('Cannot open this file: ' + String(e.message || e).split('\n').pop().slice(0, 80)); }
}
function wavBytes(a, b) {
  const n = b - a, data = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true); data.setUint32(24, SR, true); data.setUint32(28, SR * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, n * 4, true);
  let o = 44; for (let i = a; i < b; i++) { for (let k = 0; k < 2; k++) { const v = clamp(ch[k][i], -1, 1); data.setInt16(o, v < 0 ? v * 32768 : v * 32767, true); o += 2; } }
  return new Uint8Array(data.buffer);
}
const OUT = { mp3: ['MP3', ['-c:a', 'libmp3lame', '-b:a', '256k']], wav: ['WAV', ['-c:a', 'pcm_s16le']], flac: ['FLAC', ['-c:a', 'flac']], m4a: ['AAC (M4A)', ['-c:a', 'aac', '-b:a', '256k']], opus: ['Opus', ['-c:a', 'libopus', '-b:a', '160k']] };
function exportAudio() {
  if (!N()) { toast('Nothing to save yet'); return; }
  const fm = h('select', {}, ...Object.entries(OUT).map(([k, v]) => h('option', { value: k, text: v[0] })));
  const only = h('input', { type: 'checkbox', checked: hasSel() }); if (!hasSel()) only.disabled = true;
  const back = h('div', { class: 'modal-back' }, h('div', { class: 'modal' }, h('h2', { text: 'Save as' }), h('label', { class: 'field' }, 'Format', fm), h('label', { class: 'row' }, only, 'Only the selection'),
    h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px' }, btn('Cancel', () => back.remove()), btn('Save', async () => { back.remove(); await doExport(fm.value, only.checked); }, 'primary'))));
  document.body.append(back);
}
async function doExport(kind, onlySel) {
  const [a, b] = onlySel && hasSel() ? [Math.min(sel.a, sel.b), Math.max(sel.a, sel.b)] : [0, N()];
  const base = (fileName || 'recording').replace(/\.[^.]+$/, '');
  const dest = await window.host.saveFile({ name: base + '-edit.' + kind, filters: [[OUT[kind][0], [kind]]] }); if (!dest) return;
  try {
    toast('Saving...');
    if (kind === 'wav') await window.host.writeFile(dest.id, wavBytes(a, b));
    else { const t = await window.host.tempFile(wavBytes(a, b), 'wav'); await window.host.run({ args: ['-i', '{in0}', ...OUT[kind][1], '{out}'], inputs: [t.id], out: dest.id }); window.host.removeFile(t.id); }
    toast('Saved ' + dest.name); dirty = false; renderStatus();
  } catch (e) { toast('Save failed: ' + String(e.message || e).split('\n').pop().slice(0, 80)); }
}

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input,textarea,select')) return; const k = e.key.toLowerCase();
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.ctrlKey && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (e.ctrlKey && k === 'y') { e.preventDefault(); redo(); }
  else if (e.ctrlKey && k === 'x') cut(); else if (e.ctrlKey && k === 'c') copy(); else if (e.ctrlKey && k === 'v') paste();
  else if (e.ctrlKey && k === 'a') { e.preventDefault(); sel = { a: 0, b: N() }; draw(); renderStatus(); }
  else if (e.ctrlKey && k === 's') { e.preventDefault(); exportAudio(); }
  else if (e.ctrlKey && k === 'o') { e.preventDefault(); openAudio(); }
  else if (e.key === 'Delete') del();
  else if (e.key === 'Home') { sel = { a: 0, b: 0 }; view.start = 0; draw(); renderStatus(); }
});
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
renderStatus(); setTimeout(draw, 30);
