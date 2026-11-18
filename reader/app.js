// Kuzey Reader: a Kindle-style reading app. Library, book search, paginated reader,
// highlights + notes, bookmarks, in-book search, font / size / theme settings. All saved on this device.
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('kr.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('kr.' + k, JSON.stringify(v)); } catch { } }
};
const ICON = {
  back: '<path d="m15 18-6-6 6-6"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', aa: '<path d="M4 18 9 6l5 12M5.6 14h6.8M15 18l3-7 3 7M15.9 16h4.2"/>',
  mark: '<path d="M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>', pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M20 6 9 17l-5-5"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>', note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
  cloud: '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="m8 17 4 4 4-4M12 12v9"/>'
};
const ico = (n, s = 22) => `<svg class="ico" style="width:${s}px;height:${s}px" viewBox="0 0 24 24">${ICON[n]}</svg>`;
const MOTIF = {
  'Kuzey Series': '<g fill="#fff"><path d="M50 2 56 44 50 50 44 44Z"/><path d="M50 98 56 56 50 50 44 56Z" opacity=".6"/><path d="M2 50 44 44 50 50 44 56Z" opacity=".6"/><path d="M98 50 56 44 50 50 56 56Z" opacity=".6"/></g><circle cx="50" cy="50" r="30" stroke="#fff" stroke-width="3" fill="none"/>',
  'Fantasy': '<path fill="#fff" d="M50 5 61 39 97 39 68 60 79 95 50 73 21 95 32 60 3 39 39 39Z"/>',
  'Adventure': '<g stroke="#fff" stroke-width="5" fill="none"><path d="M10 80 50 20 90 80Z"/><path d="M50 20V5l20 8-20 8"/></g>',
  'Animals': '<g fill="#fff"><ellipse cx="50" cy="65" rx="22" ry="18"/><circle cx="22" cy="38" r="10"/><circle cx="40" cy="22" r="10"/><circle cx="62" cy="22" r="10"/><circle cx="80" cy="38" r="10"/></g>',
  'Mystery': '<g stroke="#fff" stroke-width="7" fill="none"><circle cx="40" cy="40" r="26"/><path d="m60 60 32 32"/></g>',
  'Sci-Fi': '<g stroke="#fff" stroke-width="5" fill="none"><circle cx="50" cy="50" r="18" fill="#fff"/><ellipse cx="50" cy="50" rx="46" ry="14" transform="rotate(-20 50 50)"/></g>',
  'Fairy Tales': '<g fill="#fff"><path d="M15 90V45l12-12 12 12v45ZM61 90V45l12-12 12 12v45Z"/><path d="M33 90V30l17-20 17 20v60Z"/></g>',
  'Myths': '<g fill="#fff"><rect x="10" y="20" width="80" height="10"/><rect x="18" y="34" width="10" height="50"/><rect x="45" y="34" width="10" height="50"/><rect x="72" y="34" width="10" height="50"/><rect x="6" y="86" width="88" height="8"/></g>',
  'Classics': '<g fill="#fff"><path d="M50 10C30 30 30 60 50 90 70 60 70 30 50 10Z"/></g>'
};
const CATS = ['All', 'Kuzey Series', 'Adventure', 'Fantasy', 'Animals', 'Fairy Tales', 'Mystery', 'Sci-Fi', 'Myths', 'Classics'];
const FONTS = [['Literata', 'Literata, Georgia, serif'], ['Merriweather', 'Merriweather, Georgia, serif'], ['Garamond', '"EB Garamond", Garamond, serif'],
  ['Atkinson', '"Atkinson Hyperlegible", Verdana, sans-serif'], ['Lexend', 'Lexend, Verdana, sans-serif'], ['Comic Neue', '"Comic Neue", "Comic Sans MS", sans-serif'],
  ['Georgia', 'Georgia, serif'], ['System', 'system-ui, -apple-system, sans-serif']];
const THEMES = [['white', '#fff', '#111'], ['paper', '#fbf8f1', '#1f1b16'], ['sepia', '#f4ecd8', '#3b2f20'], ['mint', '#e3f0e0', '#1d2a1b'], ['gray', '#4a4a4c', '#ececec'], ['dark', '#0d0d0d', '#c9c4b8']];

let CAT = [], byId = {}, view = 'library', storeCat = 'All', storeQ = '', libQ = '';
let lib = store.get('lib', null);
let S = Object.assign({ size: 20, font: 'Literata', lh: 1.6, mx: 1, theme: 'paper', mode: 'page', align: 'justify' }, store.get('set', {}));
const saveLib = () => store.set('lib', lib);
const inLib = id => lib.some(b => b.id === id);
const prog = id => store.get('p.' + id, null);
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(() => d.remove(), 1800); }

// ---------- covers ----------
function cover(b, size) {
  const L = b.title.length, longest = Math.max(...b.title.split(' ').map(w => w.length));
  const cs = (size || 15) * Math.min(1, L > 40 ? .66 : L > 26 ? .78 : L > 16 ? .9 : 1, 9 / Math.max(9, longest));
  const m = MOTIF[b.cat] || MOTIF.Classics;
  const ser = b.series ? `<div class="cser">${esc(b.series.replace('Kuzey and the Seven Winds', 'Seven Winds'))}</div>` : '';
  const dl = downloaded.has(b.id) ? `<div class="dl" title="Saved for offline">${ico('check', 12)}</div>` : '';
  return `<div class="cover" style="--cs:${cs}px;background:linear-gradient(160deg,${b.c2} -30%,${b.c1} 55%)">${dl}<svg class="motif" viewBox="0 0 100 100">${m}</svg>${ser}<div class="ct">${esc(b.title)}</div><div class="ca">${esc(b.author)}</div></div>`;
}
const readMin = w => { const m = Math.round(w / 200); return m < 60 ? m + ' min' : (m / 60).toFixed(m < 600 ? 1 : 0) + ' hours'; };
const pages = w => Math.max(1, Math.round(w / 250));

// ---------- offline book downloads ----------
const BOOKCACHE = 'kr-books-v1';
const downloaded = new Set(store.get('dl', []));
async function download(id) {
  try {
    if ('caches' in window) { const c = await caches.open(BOOKCACHE); const r = await fetch(`books/${id}.json`); if (r.ok) { await c.put(`books/${id}.json`, r); downloaded.add(id); store.set('dl', [...downloaded]); render(); } }
  } catch { }
}
async function loadBook(id) {
  let r;
  try { r = await fetch(`books/${id}.json`); if (!r.ok) throw 0; }
  catch { if ('caches' in window) r = await (await caches.open(BOOKCACHE)).match(`books/${id}.json`); }
  if (!r) throw new Error('offline');
  return r.json();
}

// ---------- shell views ----------
function addToLib(id, quiet) {
  if (inLib(id)) return;
  lib.unshift({ id, added: Date.now(), last: 0 }); saveLib(); download(id);
  if (!quiet) toast('Added to your library');
}
function removeFromLib(id) { lib = lib.filter(b => b.id !== id); saveLib(); toast('Removed from your library'); }
function setView(v) { view = v; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(); scrollTo(0, 0); }
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => setView(b.dataset.v));

function cardHTML(b, mode) {
  const p = prog(b.id);
  const pct = p ? Math.round(p.pct * 100) : 0;
  const under = mode === 'lib'
    ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="meta"><b>${esc(b.title)}</b><span>${pct ? pct + '% read' : 'New'}</span></div>`
    : `<div class="meta"><b>${esc(b.title)}</b><span>${esc(b.author)}</span></div><span class="addbtn ${inLib(b.id) ? 'in' : ''}" data-add="${b.id}">${inLib(b.id) ? ico('check', 15) + ' In library' : ico('plus', 15) + ' Add'}</span>`;
  return `<button class="card" data-open="${b.id}">${cover(b)}${under}</button>`;
}
function match(b, q) {
  if (!q) return true;
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '');
  const hay = norm(b.title + ' ' + b.author + ' ' + b.cat + ' ' + (b.series || '') + ' ' + b.blurb);
  const toks = hay.split(/[^a-z0-9]+/);
  return norm(q).split(/[^a-z0-9]+/).filter(Boolean).every(w => toks.some(t => t.startsWith(w)));
}
function render() {
  const app = $('#app');
  const head = `<div class="top"><div class="brand"><div class="logo">${ico('mark', 20)}</div>Kuzey Reader</div><a class="back-arcade" href="../">← Arcade</a></div>`;
  if (view === 'library') {
    const books = lib.map(x => byId[x.id]).filter(Boolean);
    const recent = [...lib].filter(x => x.last).sort((a, b) => b.last - a.last)[0];
    let h = head;
    if (recent && byId[recent.id]) {
      const b = byId[recent.id], p = prog(b.id) || { pct: 0 };
      h += `<button class="cont" data-read="${b.id}">${cover(b, 12)}<div class="info"><small>Continue reading</small><h3>${esc(b.title)}</h3><p>${esc(b.author)} · ${Math.round(p.pct * 100)}%${p.chT ? ' · ' + esc(p.chT) : ''}</p><div class="bar"><i style="width:${p.pct * 100}%"></i></div></div><span class="go">Read</span></button>`;
    }
    h += `<h1 class="sec">My Library</h1><div class="search">${ico('search')}<input id="libq" placeholder="Search my library" value="${esc(libQ)}"></div>`;
    const shown = books.filter(b => match(b, libQ));
    h += `<div class="count">${books.length} book${books.length === 1 ? '' : 's'}</div>`;
    h += shown.length ? `<div class="grid">${shown.map(b => cardHTML(b, 'lib')).join('')}</div>` : `<div class="empty">${books.length ? 'No books match.' : 'Your library is empty.'}<br><br><button class="go" data-goto="store">Find books</button></div>`;
    app.innerHTML = h;
    const q = $('#libq'); q.oninput = () => { libQ = q.value; const pos = q.selectionStart; render(); const n = $('#libq'); n.focus(); n.setSelectionRange(pos, pos); };
  } else {
    let h = head + `<h1 class="sec">Find Books</h1><div class="search">${ico('search')}<input id="sq" placeholder="Search ${CAT.length} books by title, author or topic" value="${esc(storeQ)}"></div>`;
    h += `<div class="chips">${CATS.map(c => `<button class="chip ${c === storeCat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>`;
    const shown = CAT.filter(b => (storeCat === 'All' || b.cat === storeCat) && match(b, storeQ));
    h += `<div class="count">${shown.length} book${shown.length === 1 ? '' : 's'}${storeQ ? ` for “${esc(storeQ)}”` : ''}</div>`;
    h += shown.length ? `<div class="grid">${shown.map(b => cardHTML(b, 'store')).join('')}</div>` : `<div class="empty">No books found. Try another word.</div>`;
    app.innerHTML = h;
    const q = $('#sq'); q.oninput = () => { storeQ = q.value; const pos = q.selectionStart; render(); const n = $('#sq'); n.focus(); n.setSelectionRange(pos, pos); };
  }
}
$('#app').addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) { e.stopPropagation(); const id = add.dataset.add; inLib(id) ? removeFromLib(id) : addToLib(id); render(); return; }
  const c = e.target.closest('[data-cat]'); if (c) { storeCat = c.dataset.cat; render(); return; }
  const g = e.target.closest('[data-goto]'); if (g) { setView(g.dataset.goto); return; }
  const r = e.target.closest('[data-read]'); if (r) { openReader(r.dataset.read); return; }
  const o = e.target.closest('[data-open]'); if (o) sheet(o.dataset.open);
});
function sheet(id) {
  const b = byId[id]; if (!b) return;
  const p = prog(id);
  const sc = document.createElement('div'); sc.className = 'scrim';
  const yr = b.year < 0 ? `about ${-b.year} BC` : b.year;
  sc.innerHTML = `<div class="sheet"><div class="bk">${cover(b, 16)}<div><h2>${esc(b.title)}</h2><div class="by">${esc(b.author)}</div>
  <div class="facts"><span>${esc(b.cat)}</span><span>${yr}</span><span>~${pages(b.words)} pages</span><span>${readMin(b.words)}</span><span>${b.chapters} chapters</span></div></div></div>
  <p class="blurb">${esc(b.blurb)}</p>${p ? `<div class="bar"><i style="width:${p.pct * 100}%"></i></div><p class="count">${Math.round(p.pct * 100)}% read</p>` : ''}
  <div class="row"><button data-x>${inLib(id) ? 'Remove from library' : 'Add to library'}</button><button class="pri" data-r>${p ? 'Keep reading' : 'Read now'}</button></div></div>`;
  sc.onclick = e => { if (e.target === sc) sc.remove(); };
  $('[data-x]', sc).onclick = () => { inLib(id) ? removeFromLib(id) : addToLib(id); sc.remove(); render(); };
  $('[data-r]', sc).onclick = () => { sc.remove(); openReader(id); };
  document.body.append(sc);
}

// ---------- reader ----------
const R = { el: $('#reader') };
function md(s) {
  s = esc(s);
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[\s(“"'‘—-])[*_]([^*_\n]+?)[*_](?=[\s.,;:!?)”"'’—-]|$)/g, '$1<i>$2</i>');
}
function paraHTML(t, i) {
  if (t === '⁂') return `<p class="brk" data-i="${i}">✦ ✦ ✦</p>`;
  if (t.startsWith('§CLUE ')) return `<div class="clue" data-i="${i}"><b>CLUE</b><br>${md(t.slice(6))}</div>`;
  if (t.startsWith('§END ')) return `<p class="end" data-i="${i}">${md(t.slice(5))}</p>`;
  if (t.includes('\n')) return `<p class="verse" data-i="${i}">${t.split('\n').map(md).join('<br>')}</p>`;
  return `<p data-i="${i}">${md(t)}</p>`;
}
async function openReader(id) {
  const meta = byId[id]; if (!meta) return;
  addToLib(id, true);
  const L = lib.find(x => x.id === id); L.last = Date.now(); saveLib();
  R.el.hidden = false; document.body.style.overflow = 'hidden';
  R.el.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--rmute)">Opening ${esc(meta.title)}…</div>`;
  applyTheme();
  let book;
  try { book = await loadBook(id); } catch { R.el.innerHTML = `<div style="display:grid;place-items:center;height:100%;text-align:center;padding:20px">This book isn't downloaded yet and you're offline.<br><br><button class="go" onclick="closeReader()">Back</button></div>`; return; }
  R.id = id; R.book = book; R.meta = meta;
  R.cw = book.chapters.map(c => c.p.reduce((s, p) => s + p.split(/\s+/).length, 0));
  R.cum = []; let t = 0; R.cw.forEach((w, i) => { R.cum[i] = t; t += w; }); R.total = t;
  R.hl = store.get('h.' + id, []); R.bm = store.get('b.' + id, []);
  const p = prog(id) || { ch: 0, p: 0 };
  R.el.innerHTML = `
   <div class="rtop"><button class="rbtn" data-a="close" title="Library">${ico('back')}</button><div class="rt">${esc(meta.title)}</div>
    <button class="rbtn" data-a="toc" title="Contents">${ico('list')}</button><button class="rbtn" data-a="find" title="Search this book">${ico('search')}</button>
    <button class="rbtn" data-a="notes" title="Highlights and notes">${ico('pen')}</button><button class="rbtn" data-a="bm" title="Bookmark this page">${ico('mark')}</button>
    <button class="rbtn" data-a="aa" title="Text settings">${ico('aa')}</button></div>
   <div id="pagebox"><div id="flow"></div></div>
   <div class="slider"><span id="slch"></span><input type="range" id="slr" min="0" max="1000"><span id="slp"></span></div>
   <div class="rbot"><span id="loc"></span><span id="left"></span></div>`;
  R.box = $('#pagebox'); R.flow = $('#flow');
  R.el.onclick = readerClick;
  $('#slr').oninput = e => { const f = e.target.value / 1000; $('#slp').textContent = Math.round(f * 100) + '%'; const ch = chapterAt(f); $('#slch').textContent = shortT(book.chapters[ch].t); };
  $('#slr').onchange = e => gotoFrac(e.target.value / 1000);
  bindGestures();
  await showChapter(p.ch || 0, { para: p.p || 0 });
}
function closeReader() { R.el.hidden = true; R.el.innerHTML = ''; document.body.style.overflow = ''; R.book = null; render(); }
window.closeReader = closeReader;
function applyTheme() {
  R.el.dataset.t = S.theme;
  const f = (FONTS.find(f => f[0] === S.font) || FONTS[0])[1];
  const mx = [16, 28, 56][S.mx] * (innerWidth > 700 ? 1.6 : 1);
  Object.entries({ '--font': f, '--fs': S.size + 'px', '--lh': S.lh, '--mx': mx + 'px', '--align': S.align }).forEach(([k, v]) => R.el.style.setProperty(k, v));
  document.querySelector('meta[name=theme-color]').content = (THEMES.find(t => t[0] === S.theme) || THEMES[1])[1];
}
function shortT(t) { return t.length > 46 ? t.slice(0, 44) + '…' : t; }
function chapterAt(f) { const w = f * R.total; let c = 0; for (let i = 0; i < R.cum.length; i++) if (R.cum[i] <= w) c = i; return c; }

function chapterHTML(ci) {
  const c = R.book.chapters[ci];
  const m = c.t.match(/^(Chapter [\w-]+):\s*(.+)$/);
  let h = m ? `<h2 class="cht"><small>${esc(m[1])}</small>${esc(m[2])}</h2>` : `<h2 class="cht">${esc(c.t)}</h2>`;
  h += c.p.map((t, i) => paraHTML(t, i)).join('');
  const next = R.book.chapters[ci + 1];
  h += `<div class="chend">${next ? `<div>End of chapter</div><button data-a="next">Next: ${esc(shortT(next.t))} →</button>` : `<div style="font-size:30px">✦</div><div><b>The End</b></div><div>You finished ${esc(R.meta.title)}!</div><button data-a="close">Back to my library</button>`}</div>`;
  return h;
}
async function showChapter(ci, opt = {}) {
  ci = Math.max(0, Math.min(R.book.chapters.length - 1, ci));
  R.ch = ci; R.flow.innerHTML = chapterHTML(ci);
  R.flow.querySelector('p:not(.brk)')?.classList.add('first');
  paintHighlights();
  await document.fonts?.ready;
  layout();
  if (opt.last) R.page = R.pages - 1;
  else if (opt.para != null) R.page = pageOfPara(opt.para);
  else R.page = 0;
  if (opt.find) flashFind(opt.para, opt.find);
  go(R.page, true);
}
function layout() {
  const scroll = S.mode === 'scroll';
  R.box.classList.toggle('scroll', scroll);
  const W = R.box.clientWidth - 2 * parseFloat(getComputedStyle(R.el).getPropertyValue('--mx'));
  const two = !scroll && W > 860;
  R.gap = two ? 80 : 2 * parseFloat(getComputedStyle(R.el).getPropertyValue('--mx'));
  R.W = W; R.step = W + R.gap;
  if (scroll) { R.flow.style.columnWidth = ''; R.flow.style.columnGap = ''; R.pages = 1; return; }
  R.flow.style.columnWidth = (two ? (W - 80) / 2 : W) + 'px';
  R.flow.style.columnGap = (two ? 80 : R.gap) + 'px';
  R.flow.style.columnFill = 'auto';
  R.flow.style.transition = 'none'; R.flow.style.transform = 'translateX(0)';
  R.pages = Math.max(1, Math.round((R.flow.scrollWidth + R.gap) / R.step));
}
function pageOfPara(i) {
  const el = R.flow.querySelector(`[data-i="${i}"]`); if (!el) return 0;
  if (S.mode === 'scroll') { R.scrollTo = el; return 0; }
  const fr = R.flow.getBoundingClientRect(), r = el.getBoundingClientRect();
  return Math.max(0, Math.min(R.pages - 1, Math.floor((r.left - fr.left + 2) / R.step)));
}
function go(page, instant) {
  if (S.mode === 'scroll') {
    if (R.scrollTo) { R.box.scrollTop = R.scrollTo.offsetTop - 20; R.scrollTo = null; } else if (instant) R.box.scrollTop = 0;
    R.box.onscroll = () => { clearTimeout(R.st); R.st = setTimeout(savePos, 250); };
    savePos(); return;
  }
  R.page = Math.max(0, Math.min(R.pages - 1, page));
  R.flow.style.transition = instant ? 'none' : '';
  R.flow.style.transform = `translateX(${-R.page * R.step}px)`;
  savePos();
}
function firstVisiblePara() {
  const els = R.flow.querySelectorAll('[data-i]');
  if (S.mode === 'scroll') { const top = R.box.scrollTop; for (const e of els) if (e.offsetTop + e.offsetHeight > top + 10) return +e.dataset.i; return 0; }
  const fr = R.flow.getBoundingClientRect(), lo = R.page * R.step - 2, hi = lo + R.step;
  for (const e of els) { const x = e.getBoundingClientRect().right - fr.left; if (x > lo + 4 && e.getBoundingClientRect().left - fr.left < hi) return +e.dataset.i; }
  return 0;
}
function savePos() {
  const p = firstVisiblePara();
  const c = R.book.chapters[R.ch];
  let before = 0; for (let i = 0; i < p; i++) before += c.p[i].split(/\s+/).length;
  const atEnd = R.ch === R.book.chapters.length - 1 && R.page >= R.pages - 1 && S.mode === 'page';
  const pct = atEnd ? 1 : (R.cum[R.ch] + before) / R.total;
  R.pct = pct; R.para = p;
  store.set('p.' + R.id, { ch: R.ch, p, pct, chT: shortT(c.t), t: Date.now() });
  const left = R.cw[R.ch] - before;
  $('#loc').textContent = `${shortT(c.t)} · ${Math.round(pct * 100)}%`;
  $('#left').textContent = S.mode === 'page' ? `Page ${R.page + 1} of ${R.pages} · ${readMin(Math.max(0, left))} left in chapter` : `${readMin(Math.max(0, left))} left in chapter`;
  $('#slr').value = Math.round(pct * 1000); $('#slp').textContent = Math.round(pct * 100) + '%'; $('#slch').textContent = shortT(c.t);
  const isBm = R.bm.some(b => b.ch === R.ch && b.p === p);
  $('[data-a=bm]').classList.toggle('on', isBm);
  R.el.querySelector('.bmk')?.remove();
  if (isBm) R.el.insertAdjacentHTML('beforeend', '<div class="bmk"></div>');
}
function next() { if (S.mode === 'scroll' || R.page >= R.pages - 1) { if (R.ch < R.book.chapters.length - 1) showChapter(R.ch + 1); } else go(R.page + 1); }
function prev() { if (S.mode === 'scroll' || R.page <= 0) { if (R.ch > 0) showChapter(R.ch - 1, { last: S.mode === 'page' }); } else go(R.page - 1); }
function gotoFrac(f) {
  const ci = chapterAt(f); let w = f * R.total - R.cum[ci], p = 0;
  const c = R.book.chapters[ci]; for (; p < c.p.length && w > 0; p++) w -= c.p[p].split(/\s+/).length;
  showChapter(ci, { para: p });
}
function hasSel() { const s = getSelection(); return s && !s.isCollapsed && s.toString().trim().length > 0; }
function readerClick(e) {
  if (!e.target.isConnected) return;
  const a = e.target.closest('[data-a]');
  if (a) { action(a.dataset.a, a); return; }
  if (e.target.closest('.pop,.panel,.slider,.note-box')) return;
  if (hasSel()) return;
  const mk = e.target.closest('mark[data-h]');
  if (mk) { hlMenu(mk.dataset.h, mk); return; }
  closePop();
  if (R.el.querySelector('.panel')) { R.el.querySelector('.panel').remove(); return; }
  if (!e.target.closest('#pagebox')) return;
  const x = e.clientX / innerWidth;
  if (S.mode === 'page' && x < .28) prev();
  else if (S.mode === 'page' && x > .72) next();
  else R.el.classList.toggle('chrome');
}
function bindGestures() {
  let sx = 0, sy = 0, st = 0;
  R.box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; st = Date.now(); }, { passive: true });
  R.box.addEventListener('touchend', e => {
    if (S.mode !== 'page' || hasSel()) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st < 600) { e.preventDefault(); dx < 0 ? next() : prev(); }
  });
  document.onkeydown = e => {
    if (!R.book || R.el.hidden || e.target.matches('input,textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    if (e.key === 'Escape') { closePop(); R.el.querySelector('.panel')?.remove(); }
  };
  let rt; onresize = () => { if (!R.book || R.el.hidden) return; clearTimeout(rt); rt = setTimeout(relayout, 200); };
  document.onselectionchange = () => { clearTimeout(R.selT); R.selT = setTimeout(selPop, 350); };
}
function relayout() { const p = R.para || 0; applyTheme(); layout(); R.page = pageOfPara(p); go(R.page, true); }
function action(a, el) {
  if (a === 'close') return closeReader();
  if (a === 'next') return showChapter(R.ch + 1);
  if (a === 'toc') return panel('toc');
  if (a === 'notes') return panel('notes');
  if (a === 'find') return panel('find');
  if (a === 'aa') return panel('aa');
  if (a === 'bm') {
    const i = R.bm.findIndex(b => b.ch === R.ch && b.p === R.para);
    if (i >= 0) { R.bm.splice(i, 1); toast('Bookmark removed'); }
    else { R.bm.push({ ch: R.ch, p: R.para, text: (R.book.chapters[R.ch].p[R.para] || '').slice(0, 140), t: Date.now() }); toast('Page bookmarked'); }
    store.set('b.' + R.id, R.bm); savePos();
  }
}

// ---------- highlights ----------
function textOffset(pEl, node, off) {
  const r = document.createRange(); r.setStart(pEl, 0);
  try { r.setEnd(node, off); } catch { return 0; }
  return r.toString().length;
}
function selInfo() {
  const s = getSelection(); if (!s.rangeCount || s.isCollapsed) return null;
  const rg = s.getRangeAt(0);
  if (!R.flow || !R.flow.contains(rg.commonAncestorContainer)) return null;
  const pa = (rg.startContainer.nodeType === 1 ? rg.startContainer : rg.startContainer.parentElement).closest('[data-i]');
  const pb = (rg.endContainer.nodeType === 1 ? rg.endContainer : rg.endContainer.parentElement).closest('[data-i]');
  if (!pa || !pb) return null;
  return { rg, p0: +pa.dataset.i, o0: textOffset(pa, rg.startContainer, rg.startOffset), p1: +pb.dataset.i, o1: textOffset(pb, rg.endContainer, rg.endOffset), text: s.toString().trim() };
}
function closePop() { R.el.querySelector('.pop')?.remove(); }
function popAt(html, rect) {
  closePop();
  const d = document.createElement('div'); d.className = 'pop'; d.innerHTML = html; R.el.append(d);
  const w = d.offsetWidth, h = d.offsetHeight;
  let x = Math.max(8, Math.min(innerWidth - w - 8, rect.left + rect.width / 2 - w / 2));
  let y = rect.top - h - 12; if (y < 50) y = rect.bottom + 12;
  d.style.left = x + 'px'; d.style.top = y + 'px';
  return d;
}
function selPop() {
  if (!R.book || R.el.hidden) return;
  const si = selInfo(); if (!si) { if (!R.el.querySelector('.pop[data-k=h]')) closePop(); return; }
  const d = popAt(`${['y', 'g', 'b', 'p'].map(c => `<button data-c="${c}" title="Highlight"><span class="dot ${c}"></span></button>`).join('')}<button data-n>${ico('note', 17)}Note</button><button data-cp>${ico('copy', 17)}Copy</button><button data-s>${ico('search', 17)}Search</button>`, si.rg.getBoundingClientRect());
  d.onmousedown = e => e.preventDefault();
  d.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c) addHl(si, b.dataset.c);
    else if (b.hasAttribute('data-n')) { const h = addHl(si, 'y'); noteBox(h); }
    else if (b.hasAttribute('data-cp')) { navigator.clipboard?.writeText(si.text); toast('Copied'); }
    else if (b.hasAttribute('data-s')) { panel('find', si.text); }
    getSelection().removeAllRanges(); closePop();
  };
}
function addHl(si, color) {
  if (si.p0 > si.p1 || (si.p0 === si.p1 && si.o0 >= si.o1)) return null;
  const h = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ch: R.ch, p0: si.p0, o0: si.o0, p1: si.p1, o1: si.o1, c: color, text: si.text.slice(0, 600), note: '', t: Date.now() };
  R.hl.push(h); store.set('h.' + R.id, R.hl);
  repaint([...range(si.p0, si.p1)]);
  return h;
}
const range = function* (a, b) { for (let i = a; i <= b; i++) yield i; };
function repaint(ps) {
  ps.forEach(i => { const el = R.flow.querySelector(`[data-i="${i}"]`); if (el) el.outerHTML = paraHTML(R.book.chapters[R.ch].p[i], i); });
  R.flow.querySelector('p:not(.brk)')?.classList.add('first');
  paintHighlights(ps);
}
function paintHighlights(only) {
  R.hl.filter(h => h.ch === R.ch).forEach(h => {
    for (let i = h.p0; i <= h.p1; i++) {
      if (only && !only.includes(i)) continue;
      const el = R.flow.querySelector(`[data-i="${i}"]`); if (!el) continue;
      const len = el.textContent.length;
      wrapRange(el, i === h.p0 ? h.o0 : 0, i === h.p1 ? h.o1 : len, `h-${h.c}${h.note ? ' has-note' : ''}`, h.id);
    }
  });
}
function wrapRange(el, a, b, cls, id) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let pos = 0, n; const todo = [];
  while ((n = walker.nextNode())) { const s = pos, e = pos + n.length; if (e > a && s < b) todo.push([n, Math.max(0, a - s), Math.min(n.length, b - s)]); pos = e; }
  todo.forEach(([node, x, y]) => {
    const r = document.createRange(); r.setStart(node, x); r.setEnd(node, y);
    const m = document.createElement('mark'); m.className = cls; if (id) m.dataset.h = id;
    try { r.surroundContents(m); } catch { }
  });
}
function hlMenu(id, mk) {
  const h = R.hl.find(x => x.id === id); if (!h) return;
  const d = popAt(`${['y', 'g', 'b', 'p'].map(c => `<button data-c="${c}"><span class="dot ${c}" style="${c === h.c ? 'outline:2px solid #fff;outline-offset:2px' : ''}"></span></button>`).join('')}<button data-n>${ico('note', 17)}${h.note ? 'Edit note' : 'Note'}</button><button data-d>${ico('trash', 17)}Remove</button>`, mk.getBoundingClientRect());
  d.dataset.k = 'h';
  d.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.c) h.c = b.dataset.c;
    if (b.hasAttribute('data-d')) R.hl = R.hl.filter(x => x !== h);
    store.set('h.' + R.id, R.hl);
    if (h.ch === R.ch) repaint([...range(h.p0, h.p1)]);
    closePop();
    if (b.hasAttribute('data-n')) noteBox(h);
  };
}
function noteBox(h) {
  if (!h) return;
  const d = document.createElement('div'); d.className = 'note-box';
  d.innerHTML = `<div><b>Note</b><div style="font-size:13px;opacity:.7;margin-top:6px">“${esc(h.text.slice(0, 160))}${h.text.length > 160 ? '…' : ''}”</div><textarea placeholder="Write your note…">${esc(h.note)}</textarea><div class="row" style="margin:0"><button data-c>Cancel</button><button class="pri" data-s>Save</button></div></div>`;
  R.el.append(d); $('textarea', d).focus();
  $('[data-c]', d).onclick = () => d.remove();
  $('[data-s]', d).onclick = () => { h.note = $('textarea', d).value.trim(); store.set('h.' + R.id, R.hl); if (h.ch === R.ch) repaint([...range(h.p0, h.p1)]); d.remove(); toast('Note saved'); };
}
function flashFind(pi, q) {
  const el = R.flow.querySelector(`[data-i="${pi}"]`); if (!el) return;
  const i = el.textContent.toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return;
  wrapRange(el, i, i + q.length, 'found');
  setTimeout(() => R.flow.querySelectorAll('mark.found').forEach(m => m.replaceWith(...m.childNodes)), 3500);
}

// ---------- side panels ----------
function panel(kind, arg) {
  closePop(); R.el.querySelector('.panel')?.remove(); R.el.classList.remove('chrome');
  const p = document.createElement('div'); p.className = 'panel';
  const titles = { toc: 'Contents', notes: 'Notes & Marks', find: 'Search this book', aa: 'Text' };
  p.innerHTML = `<header><h3>${titles[kind]}</h3><button class="rbtn" style="opacity:1;pointer-events:auto" data-close>${ico('x')}</button></header><div class="body"></div>`;
  R.el.append(p);
  $('[data-close]', p).onclick = () => p.remove();
  const body = $('.body', p);
  if (kind === 'toc') {
    body.innerHTML = `<div class="toc">${R.book.chapters.map((c, i) => `<button data-ch="${i}" class="${i === R.ch ? 'cur' : ''}">${esc(c.t)}<span>${Math.round(R.cum[i] / R.total * 100)}%</span></button>`).join('')}</div>`;
    body.onclick = e => { const b = e.target.closest('[data-ch]'); if (b) { p.remove(); showChapter(+b.dataset.ch); } };
    body.querySelector('.cur')?.scrollIntoView({ block: 'center' });
  }
  if (kind === 'notes') {
    const draw = tab => {
      const tabs = `<div class="ptabs" style="padding:0 0 10px"><button data-t="h" class="${tab === 'h' ? 'on' : ''}">Highlights (${R.hl.length})</button><button data-t="b" class="${tab === 'b' ? 'on' : ''}">Bookmarks (${R.bm.length})</button></div>`;
      let list;
      if (tab === 'h') {
        const hs = [...R.hl].sort((a, b) => a.ch - b.ch || a.p0 - b.p0 || a.o0 - b.o0);
        list = hs.length ? hs.map(h => `<div class="hitem" data-go="${h.ch},${h.p0}"><div class="q ${h.c}">${esc(h.text)}</div>${h.note ? `<div class="n">${esc(h.note)}</div>` : ''}<div class="w"><span>${esc(shortT(R.book.chapters[h.ch]?.t || ''))}</span><button data-del="${h.id}" title="Remove">${ico('trash', 16)}</button></div></div>`).join('')
          : `<p style="color:var(--rmute);line-height:1.5">No highlights yet. Select some words while you read (press and hold on a tablet), then pick a color.</p>`;
      } else {
        list = R.bm.length ? R.bm.map((b, i) => `<div class="hitem" data-go="${b.ch},${b.p}"><div class="q">${esc(b.text)}…</div><div class="w"><span>${esc(shortT(R.book.chapters[b.ch]?.t || ''))}</span><button data-delb="${i}">${ico('trash', 16)}</button></div></div>`).join('')
          : `<p style="color:var(--rmute);line-height:1.5">No bookmarks yet. Tap the middle of the page, then the ribbon button at the top.</p>`;
      }
      body.innerHTML = tabs + list;
    };
    let tab = 'h'; draw(tab);
    body.onclick = e => {
      const t = e.target.closest('[data-t]'); if (t) { tab = t.dataset.t; draw(tab); return; }
      const d = e.target.closest('[data-del]'); if (d) { const h = R.hl.find(x => x.id === d.dataset.del); R.hl = R.hl.filter(x => x !== h); store.set('h.' + R.id, R.hl); if (h && h.ch === R.ch) repaint([...range(h.p0, h.p1)]); draw(tab); return; }
      const db = e.target.closest('[data-delb]'); if (db) { R.bm.splice(+db.dataset.delb, 1); store.set('b.' + R.id, R.bm); savePos(); draw(tab); return; }
      const g = e.target.closest('[data-go]'); if (g) { const [c, pp] = g.dataset.go.split(',').map(Number); p.remove(); showChapter(c, { para: pp }); }
    };
  }
  if (kind === 'find') {
    body.innerHTML = `<div class="search" style="background:none;border-color:var(--rline)">${ico('search')}<input id="fq" placeholder="Find words in this book" style="color:var(--rink)"></div><div id="fr"></div>`;
    const q = $('#fq', p), fr = $('#fr', p);
    const run = () => {
      const s = q.value.trim(); if (s.length < 2) { fr.innerHTML = ''; return; }
      const low = s.toLowerCase(); let out = [], n = 0;
      R.book.chapters.forEach((c, ci) => c.p.forEach((t, pi) => {
        const plain = t.replace(/^§(CLUE|END) /, '');
        let i = plain.toLowerCase().indexOf(low);
        while (i >= 0) { n++; if (out.length < 200) { const a = Math.max(0, i - 50); out.push({ ci, pi, snip: (a ? '…' : '') + esc(plain.slice(a, i)) + '<b>' + esc(plain.slice(i, i + s.length)) + '</b>' + esc(plain.slice(i + s.length, i + s.length + 70)) + '…' }); } i = plain.toLowerCase().indexOf(low, i + 1); }
      }));
      fr.innerHTML = `<p style="color:var(--rmute);font-size:13px">${n} result${n === 1 ? '' : 's'}${n > 200 ? ' (showing 200)' : ''}</p>` + out.map(r => `<div class="res" data-go="${r.ci},${r.pi}"><small>${esc(shortT(R.book.chapters[r.ci].t))}</small>${r.snip.replace(/[*_]/g, '')}</div>`).join('');
    };
    let t; q.oninput = () => { clearTimeout(t); t = setTimeout(run, 200); };
    fr.onclick = e => { const g = e.target.closest('[data-go]'); if (g) { const [c, pp] = g.dataset.go.split(',').map(Number); const s = q.value.trim(); p.remove(); showChapter(c, { para: pp, find: s }); } };
    if (arg) { q.value = arg; run(); } else setTimeout(() => q.focus(), 50);
  }
  if (kind === 'aa') {
    const draw = () => {
      body.innerHTML = `<div class="set">
      <h4>Size of words</h4><div class="sizerow"><button data-sz="-1" style="font-size:13px">A</button><input type="range" id="szr" min="13" max="42" value="${S.size}"><button data-sz="1" style="font-size:22px">A</button><output>${S.size}</output></div>
      <h4>Font</h4><div class="fonts">${FONTS.map(f => `<button data-f="${f[0]}" class="${S.font === f[0] ? 'on' : ''}" style="font-family:${f[1].replace(/"/g, "'")}">${f[0]}</button>`).join('')}</div>
      <h4>Page color</h4><div class="themes">${THEMES.map(t => `<button data-th="${t[0]}" class="${S.theme === t[0] ? 'on' : ''}" style="background:${t[1]};color:${t[2]}" title="${t[0]}">Aa</button>`).join('')}</div>
      <h4>Line spacing</h4><div class="seg">${[[1.35, 'Tight'], [1.6, 'Normal'], [1.95, 'Roomy']].map(([v, n]) => `<button data-lh="${v}" class="${S.lh == v ? 'on' : ''}">${n}</button>`).join('')}</div>
      <h4>Margins</h4><div class="seg">${['Small', 'Medium', 'Wide'].map((n, i) => `<button data-mx="${i}" class="${S.mx == i ? 'on' : ''}">${n}</button>`).join('')}</div>
      <h4>Text alignment</h4><div class="seg"><button data-al="left" class="${S.align === 'left' ? 'on' : ''}">Left</button><button data-al="justify" class="${S.align === 'justify' ? 'on' : ''}">Justified</button></div>
      <h4>Reading mode</h4><div class="seg"><button data-md="page" class="${S.mode === 'page' ? 'on' : ''}">Turn pages</button><button data-md="scroll" class="${S.mode === 'scroll' ? 'on' : ''}">Scroll</button></div>
      <div class="preview">The wind has been trying to talk to me my whole life.</div></div>`;
      $('#szr', body).oninput = e => { S.size = +e.target.value; $('output', body).textContent = S.size; upd(false); };
      $('#szr', body).onchange = () => upd(true);
    };
    const upd = full => { store.set('set', S); applyTheme(); if (full) relayout(); };
    draw();
    body.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.sz) S.size = Math.max(13, Math.min(42, S.size + +d.sz * 2));
      if (d.f) S.font = d.f; if (d.th) S.theme = d.th; if (d.lh) S.lh = +d.lh; if (d.mx) S.mx = +d.mx; if (d.al) S.align = d.al; if (d.md) S.mode = d.md;
      upd(true); draw();
    };
  }
}

// ---------- start ----------
(async function init() {
  try { CAT = await (await fetch('catalog.json')).json(); store.set('cat', CAT); } catch { CAT = store.get('cat', []); }
  CAT.forEach(b => byId[b.id] = b);
  if (!lib) { lib = CAT.filter(b => b.cat === 'Kuzey Series').map((b, i) => ({ id: b.id, added: Date.now() - i, last: 0 })); saveLib(); }
  if (!store.get('k8added', false)) { if (byId.k8 && !inLib('k8')) lib.unshift({ id: 'k8', added: Date.now(), last: 0 }); saveLib(); store.set('k8added', true); }
  setView(lib.length ? 'library' : 'store');
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { });
  const q = new URLSearchParams(location.search).get('book'); if (q && byId[q]) openReader(q);
})();
