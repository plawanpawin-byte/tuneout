// Lookout UI kit: adds the app mark to the toolbar and monochrome line icons to buttons.
// Purely visual. Buttons keep their text, so nothing else changes.
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const P = {
    plus: 'M12 5v14M5 12h14',
    file: 'M14 3H6v18h12V7zM14 3v4h4M12 11v6M9 14h6',
    folder: 'M3 7V5h6l2 2h10v12H3z',
    save: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
    saveas: 'M5 3h11l3 3v6M5 3v18h7M8 3v5h7V3M15 21l6-6-2-2-6 6v2z',
    undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
    redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
    paste: 'M9 4h6v3H9zM8 5H5v16h14V5h-3',
    dup: 'M8 8h12v12H8zM4 16V4h12M14 11v6M11 14h6',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
    play: 'M7 4l13 8-13 8z',
    stop: 'M6 6h12v12H6z',
    pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
    rec: 'M12 5a7 7 0 100 14 7 7 0 000-14z',
    scissors: 'M6 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM8.2 7.8L20 19M8.2 16.2L20 5',
    pointer: 'M5 3l14 7-6 2-2 6z',
    hand: 'M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6a1.5 1.5 0 013 0v8a7 7 0 01-7 7 6 6 0 01-5-3l-2.5-4.5a1.5 1.5 0 012.6-1.5L8 15',
    connector: 'M5 19L19 5M13 5h6v6',
    frame: 'M7 3v18M17 3v18M3 7h18M3 17h18',
    rect: 'M4 6h16v12H4z',
    ellipse: 'M12 5c4.4 0 8 3.1 8 7s-3.6 7-8 7-8-3.1-8-7 3.6-7 8-7z',
    line: 'M5 19L19 5',
    text: 'M5 6V4h14v2M12 4v16M9 20h6',
    highlight: 'M14 4l6 6-8 8H6v-6zM4 21h16',
    pen: 'M4 20l4-1 11-11-3-3L5 16zM14 7l3 3',
    redact: 'M4 8h16v8H4z',
    sign: 'M3 17c3-6 5-9 7-9 3 0-2 9 1 9 2 0 3-3 5-3s1 3 5 3M3 21h18',
    eraser: 'M8 20l-4-4 10-10 6 6-10 8zM12 20h8',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l5 5',
    list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
    child: 'M5 4v8a3 3 0 003 3h11M15 11l4 4-4 4',
    sibling: 'M5 6h14M5 12h14M12 15v6M9 18h6',
    collapse: 'M6 9l6 6 6-6',
    expand: 'M7 14l5-5 5 5',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
    diamond: 'M12 3l9 9-9 9-9-9z',
    up: 'M12 19V5M6 11l6-6 6 6',
    down: 'M12 5v14M6 13l6 6 6-6',
    refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
    check: 'M4 12l5 5L20 6',
    convert: 'M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
    info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 11v6M12 7.5h.01',
    front: 'M8 8h12v12H8zM4 4h10v3M4 4v10h3',
    back: 'M4 4h12v12H4zM20 8v12H8v-4',
    merge: 'M6 3v6a6 6 0 006 6h6M15 12l3 3-3 3M6 21v-4',
    rotl: 'M4 10a8 8 0 112 6M4 4v6h6',
    rotr: 'M20 10a8 8 0 10-2 6M20 4v6h-6',
    blank: 'M6 3h12v18H6z',
    extract: 'M14 3H6v18h12V7zM14 3v4h4M12 10v7M9 14l3 3 3-3',
    mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a6 6 0 0012 0M12 17v4',
    clear: 'M6 6l12 12M18 6L6 18',
    gaps: 'M3 6v12M21 6v12M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3',
    title: 'M4 5h16v14H4zM8 9h8M12 9v7',
    dashed: 'M4 12h3M10 12h4M17 12h3',
    arrow: 'M4 12h15M14 7l5 5-5 5',
    elbow: 'M4 6h8v12h8',
    label: 'M3 12l6-7h12v14H9zM8 12h.01',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
    vector: 'M5 19L12 5l7 14M8 13h8M3 19h4M17 19h4',
    table: 'M4 5h16v14H4zM4 10h16M4 15h16M10 5v14',
    lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3',
    unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 017.5-2',
    templ: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    flag: 'M5 21V4M5 4h12l-2 4 2 4H5',
    people: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M16 5a3 3 0 010 6M18 20a6 6 0 00-3-5',
    panl: 'M4 5h16v14H4zM9.5 5v14',
    panr: 'M4 5h16v14H4zM14.5 5v14',
    reset: 'M4 12a8 8 0 108-8M4 4v5h5',
    eyeoff: 'M3 3l18 18M10.6 6.1A10 10 0 0112 6c6 0 10 6 10 6a17 17 0 01-3 3.6M6.6 6.6C3.8 8.3 2 12 2 12s4 7 10 7a9.7 9.7 0 004.4-1',
  };
  const MAP = {
    'New': 'file', 'Open': 'folder', 'Open project': 'folder', 'Open file': 'folder', 'Save': 'save', 'Save project': 'save', 'Save as': 'saveas',
    'Undo': 'undo', 'Redo': 'redo', 'Delete': 'trash', 'Delete clip': 'trash', 'Remove selected': 'trash', 'Copy': 'copy', 'Paste': 'paste', 'Duplicate': 'dup',
    'Export PNG': 'image', 'Export SVG': 'vector', 'Export CSV': 'table', 'Export': 'download', 'Export page as PNG': 'download', 'Extract all text': 'text',
    'Fit': 'fit', 'Play': 'play', 'Stop': 'stop', 'Pause': 'pause', 'Resume': 'play', 'Record': 'rec', 'Split': 'scissors', 'Split here': 'scissors',
    'Select': 'pointer', 'Move': 'pointer', 'Hand': 'hand', 'Connector': 'connector', 'Frame': 'frame', 'Rectangle': 'rect', 'Box': 'rect', 'Ellipse': 'ellipse', 'Line': 'line', 'Text': 'text',
    'Highlight': 'highlight', 'Pen': 'pen', 'Redact': 'redact', 'Sign': 'sign', 'Erase': 'eraser', 'Preview': 'eye', 'Outline': 'list',
    'Add child': 'child', 'Add sibling': 'sibling', 'Edit': 'pen', 'Collapse': 'collapse', 'Expand all': 'expand', 'Today': 'calendar',
    'Add task': 'plus', 'Add milestone': 'diamond', 'Move up': 'up', 'Move down': 'down', 'Up': 'up', 'Down': 'down',
    'Import media': 'plus', 'Add files': 'plus', 'Output folder': 'folder', 'Convert all': 'convert', 'Clear finished': 'clear', 'Show': 'folder', 'Show in folder': 'folder',
    'Check file': 'check', 'Repair to new file': 'download', 'Refresh sources': 'refresh', 'Start recording': 'rec', 'Stop and review': 'stop', 'New recording': 'rec',
    'Check for updates': 'refresh', 'Info': 'info', 'Merge': 'merge', 'Rotate L': 'rotl', 'Rotate R': 'rotr', 'Blank': 'blank', 'Extract': 'extract',
    'Front': 'front', 'Back': 'back', 'Close gaps': 'gaps', 'Title text': 'title', 'Dashed': 'dashed', 'Arrow on/off': 'arrow', 'Straight / Elbow': 'elbow', 'Edit label': 'label',
    'Cut': 'scissors', 'Trim to selection': 'fit', 'Locate missing files': 'search',
    'Templates': 'templ', 'Cover': 'blank', 'Present': 'play', 'Set baseline': 'flag', 'Clear baseline': 'clear', 'Resources': 'people',
  };
  const LMAP = { 'Hide': 'eye', 'Show': 'eyeoff', 'Lock': 'unlock', 'Unlock': 'lock' };
  function icon(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.8');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', P[name]); s.append(p);
    return s;
  }
  function decorate(b) {
    if (b.tagName !== 'BUTTON' || !b.classList.contains('btn')) return;
    const label = (b.textContent || '').trim();
    const name = (b.closest('.list') && LMAP[label]) || MAP[label];
    const cur = b.querySelector(':scope > svg.ic');
    if (cur && cur.dataset.for === label) return;
    if (cur) cur.remove();
    if (!name) return;
    const s = icon(name); s.dataset.for = label; b.prepend(s);
    if (!b.title) b.title = label;
  }
  function brand(bar) {
    if (!bar || bar.querySelector(':scope > .brand') || (document.title && (bar.textContent || '').includes(document.title))) return;
    const name = document.title || '';
    const d = document.createElement('div'); d.className = 'brand';
    const img = document.createElement('img'); img.src = 'brand.svg'; img.alt = '';
    const t = document.createElement('span'); t.textContent = name;
    d.append(img, t);
    const sep = document.createElement('span'); sep.className = 'sep';
    bar.prepend(d, sep);
  }
  const MINOR = new Set(['New', 'Open', 'Undo', 'Redo', 'Copy', 'Paste', 'Duplicate', 'Delete', 'Front', 'Back', 'Fit', 'Hand', 'Merge', 'Move up', 'Move down', 'Today', 'Cut', 'Dashed', 'Arrow on/off', 'Straight / Elbow', 'Edit label', 'Output folder', 'Remove selected', 'Clear finished', 'Refresh sources', 'Stop', 'Collapse', 'Expand all', 'Select', 'Move']);
  function fitBar(bar) {
    bar.classList.remove('c1', 'c2', 'c3');
    bar.querySelectorAll(':scope > .btn').forEach((b) => b.classList.toggle('minor', MINOR.has((b.textContent || '').trim())));
    for (const c of ['c1', 'c2', 'c3']) { if (bar.scrollWidth <= bar.clientWidth + 1) break; bar.classList.add(c); }
  }
  // ---- workspace: resizable and collapsible side panels, label toggle, remembered per app ----
  const WSK = 'lk.ws.' + (document.title || 'app');
  let ws = { lbl: false, w: {}, c: {} };
  try { const r = JSON.parse(localStorage.getItem(WSK) || 'null'); if (r && typeof r === 'object') ws = Object.assign(ws, r); } catch (e) { /* storage may be unavailable */ }
  if (!ws.w || typeof ws.w !== 'object') ws.w = {};
  if (!ws.c || typeof ws.c !== 'object') ws.c = {};
  function wsSave() { try { localStorage.setItem(WSK, JSON.stringify(ws)); } catch (e) { /* ignore */ } }
  const sideOf = (sb) => (sb.classList.contains('right') ? 'right' : 'left');
  const wsClamp = (w) => Math.max(140, Math.min(Math.max(200, Math.min(560, Math.round(window.innerWidth * 0.45))), Math.round(w)));
  let lastToggle = 0;
  function wsPoke() { window.dispatchEvent(new Event('resize')); }
  function wsToggle(side) { ws.c[side] = !ws.c[side]; lastToggle = Date.now(); wsSave(); sweep(); wsPoke(); }
  function wsBind(g) {
    const box = () => [...document.querySelectorAll('.sidebar')].find((s) => sideOf(s) === g.dataset.side && (g.dataset.side === 'left' ? s.nextElementSibling === g : s.previousElementSibling === g));
    g.addEventListener('pointerdown', (e) => {
      const side = g.dataset.side, sb = box();
      if (e.button !== 0 || !sb || ws.c[side]) return;
      e.preventDefault();
      const x0 = e.clientX, w0 = sb.getBoundingClientRect().width;
      try { g.setPointerCapture(e.pointerId); } catch (_) {} g.classList.add('drag'); document.body.classList.add('gripping');
      let raf = 0;
      const mv = (ev) => {
        if (ev.buttons === 0) { up(); return; }
        const dx = ev.clientX - x0, w = wsClamp(side === 'left' ? w0 + dx : w0 - dx);
        ws.w[side] = w; sb.style.width = w + 'px';
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; wsPoke(); });
      };
      const up = () => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        g.classList.remove('drag'); document.body.classList.remove('gripping'); wsSave();
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    });
    g.addEventListener('click', () => { if (ws.c[g.dataset.side]) wsToggle(g.dataset.side); });
    g.addEventListener('dblclick', () => { if (Date.now() - lastToggle > 500) wsToggle(g.dataset.side); });
    g.addEventListener('keydown', (e) => {
      const side = g.dataset.side, sb = box();
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); wsToggle(side); return; }
      if (!sb || ws.c[side] || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
      e.preventDefault();
      const step = (e.shiftKey ? 48 : 12) * (e.key === 'ArrowRight' ? 1 : -1) * (side === 'left' ? 1 : -1);
      const w = wsClamp(sb.getBoundingClientRect().width + step);
      ws.w[side] = w; sb.style.width = w + 'px'; wsSave(); wsPoke();
    });
  }
  function wsGrip(sb) {
    const side = sideOf(sb), nb = side === 'left' ? sb.nextElementSibling : sb.previousElementSibling;
    let g = nb && nb.classList && nb.classList.contains('grip') ? nb : null;
    if (!g) {
      g = document.createElement('div'); g.className = 'grip'; g.dataset.side = side; g.tabIndex = 0;
      g.setAttribute('role', 'separator'); g.setAttribute('aria-orientation', 'vertical'); g.setAttribute('aria-label', side + ' panel');
      g.title = 'Drag to resize. Double-click to collapse (click to restore).';
      if (side === 'left') sb.after(g); else sb.before(g);
      wsBind(g);
    }
    g.classList.toggle('collapsed', !!ws.c[side]);
  }
  function wsDock() {
    let d = document.querySelector('body > .wbs');
    const has = !!document.querySelector('.app > .status');
    if (!d) {
      d = document.createElement('div'); d.className = 'wbs';
      const mk = (id, tip, content) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'wb'; b.dataset.id = id; b.title = tip; b.setAttribute('aria-label', tip);
        if (typeof content === 'string') b.textContent = content; else b.append(content);
        d.append(b); return b;
      };
      mk('lbl', 'Show or hide toolbar labels', 'Aa').addEventListener('click', () => { ws.lbl = !ws.lbl; wsSave(); sweep(); });
      mk('left', 'Show or hide the left panel', icon('panl')).addEventListener('click', () => wsToggle('left'));
      mk('right', 'Show or hide the right panel', icon('panr')).addEventListener('click', () => wsToggle('right'));
      mk('reset', 'Reset the workspace layout', icon('reset')).addEventListener('click', () => {
        ws.w = {}; ws.c = {}; ws.lbl = false; wsSave();
        document.querySelectorAll('.sidebar').forEach((sb) => { if (sb.dataset.w0 !== undefined) sb.style.width = sb.dataset.w0; });
        sweep(); wsPoke();
      });
      document.body.append(d);
    }
    d.hidden = !has; document.body.classList.toggle('hasdock', has);
    const sides = new Set([...document.querySelectorAll('.sidebar')].map(sideOf));
    d.querySelector('[data-id=lbl]').classList.toggle('on', !!ws.lbl);
    for (const s of ['left', 'right']) {
      const b = d.querySelector('[data-id=' + s + ']');
      b.hidden = !sides.has(s); b.classList.toggle('on', !!ws.c[s]);
    }
  }
  function workspace() {
    document.querySelectorAll('.sidebar').forEach((sb) => {
      const side = sideOf(sb);
      if (sb.dataset.w0 === undefined) sb.dataset.w0 = sb.style.width || '';
      const w = ws.w[side];
      if (w && sb.style.width !== w + 'px') sb.style.width = w + 'px';
      sb.classList.toggle('collapsed', !!ws.c[side]);
      wsGrip(sb);
    });
    wsDock();
  }
  window.addEventListener('resize', () => { const bar = document.querySelector('.app > .toolbar'); if (bar) fitBar(bar); });
  let queued = false;
  function sweep() {
    queued = false;
    document.querySelectorAll('.btn').forEach(decorate);
    const bar = document.querySelector('.app > .toolbar');
    if (bar && bar.children.length) { brand(bar); bar.classList.toggle('lbl', !!ws.lbl); fitBar(bar); }
    workspace();
  }
  const mo = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(sweep); } });
  function start() { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); sweep(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

// Esc closes the topmost dialog by pressing its Cancel/Close button (when it has one).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const m = [...document.querySelectorAll('.modal-back')].pop();
  if (!m) return;
  const b = [...m.querySelectorAll('button')].find((x) => /^(cancel|close|done|back|ok)$/i.test(x.textContent.trim()));
  if (b) { e.preventDefault(); b.click(); }
});

// Dialogs take focus when they open and hand it back to the previous control when they close.
(function () {
  const stack = [];
  new MutationObserver((muts) => {
    for (const mu of muts) {
      mu.addedNodes.forEach((n) => {
        if (n.nodeType === 1 && n.classList.contains('modal-back')) {
          stack.push({ node: n, prev: document.activeElement });
          if (!n.contains(document.activeElement)) { const f = n.querySelector('textarea,input,select,button'); if (f) f.focus(); }
        }
      });
      mu.removedNodes.forEach((n) => {
        const i = stack.findIndex((s) => s.node === n);
        if (i >= 0) { const s = stack.splice(i, 1)[0]; if (s.prev && s.prev.isConnected && s.prev !== document.body) s.prev.focus(); }
      });
    }
  }).observe(document.body, { childList: true });
})();
