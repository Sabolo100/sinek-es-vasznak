import { createTimeline, renderFinale } from './timeline.js';
import { createMap } from './map.js';
import { bigIllustration, illustration, botanicCorners, branch, botanicDefs } from './art.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privát mód */ } },
};

const state = {
  filter: 'all',
  view: 'timeline',
  sound: store.get('sound', false),
  theme: store.get('theme', 'auto'),
};
applyTheme();

const data = await fetch('data/timeline.json').then(r => r.json());
const items = data.items;
const byId = new Map(items.map(i => [i.id, i]));
const usItem = items.find(i => i.lane === 'us');

// "vasút a műben" szűrőnél a vasúti sávban azok maradnak, amelyek ilyen műhöz kapcsolódnak
const railLinkedToRailArt = new Set();
for (const it of items) if (it.lane === 'art' && it.railInArt) it.linkTo.forEach(id => railLinkedToRailArt.add(id));

function isVisible(it) {
  if (it.lane === 'us') return true;
  if (state.filter === 'all') return true;
  if (it.lane === 'note') return false;
  if (state.filter === 'hu') return it.hu;
  if (state.filter === 'railInArt') return it.lane === 'art' ? it.railInArt === true : railLinkedToRailArt.has(it.id);
  return true;
}

/* ---------------- Hero ---------------- */
function drawHero() {
  const hero = $('#hero');
  const W = hero.clientWidth, H = hero.clientHeight;
  $('#heroBotanic').innerHTML = botanicCorners(W, H);
}

function drawHeroLines(geo) {
  const svg = $('#heroLines');
  const W = svg.clientWidth || innerWidth;
  const H = 170;
  const cx = geo ? geo.cx + (svg.getBoundingClientRect().left - $('#track').getBoundingClientRect().left) * -1 : W / 2;
  const g = geo ? geo.gauge / 2 : 9;
  const gauge = g * 2;
  const L = `M${W * 0.04} 40C${W * 0.28} 30 ${cx - g} 70 ${cx - g} ${H}`;
  const R = `M${W * 0.96} 40C${W * 0.72} 30 ${cx + g} 70 ${cx + g} ${H}`;
  let sl = '';
  for (let y = H - 6; y > 96; y -= 15) sl += `<path d="M${cx - gauge} ${y}H${cx + gauge}" class="slp" opacity="${((y - 96) / (H - 96)).toFixed(2)}"/>`;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `${sl}<path d="${L}" class="l-art draw" style="--len:${W}"/><path d="${R}" class="l-rail draw" style="--len:${W}"/>`;
}

/* ---------------- Idővonal ---------------- */
const yearNow = $('#yearNow');
const yearSlider = $('#yearSlider');
const yearOut = $('#yearOut');
let sliderActive = false;

const timeline = createTimeline({
  items,
  track: $('#track'),
  cards: $('#cards'),
  railsSvg: $('#rails'),
  loco: $('#loco'),
  isVisible,
  onOpen: id => openItem(id),
  onYear: y => {
    yearNow.textContent = y;
    if (!sliderActive) { yearSlider.value = y; yearOut.textContent = y; }
  },
});

let finaleInfo = null;
function layoutAll() {
  timeline.layout();
  drawHeroLines(timeline.geo);
  finaleInfo = renderFinale({ finale: $('#finale'), item: usItem, geo: timeline.geo, onMap: id => { location.hash = '#terkep'; setTimeout(() => mapView.flyToItem(id), 400); } });
  decorateStation();
  wireWhistle();
  tickBoard();
  finaleObserver.observe($('#finale'));
}

function decorateStation() {
  const st = $('.station .st-bot');
  if (!st) return;
  const w = st.clientWidth || 340, h = st.clientHeight || 520;
  st.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs>${botanicDefs}</defs>
    <g opacity=".85">${branch({ x: -6, y: 70, angle: -20, length: 90, seed: 'st1', flowers: 1, buds: 1, leaves: 5, scale: .62 })}</g>
    <g opacity=".85">${branch({ x: w + 6, y: h - 40, angle: 200, length: 100, seed: 'st2', flowers: 1, buds: 1, leaves: 5, scale: .62 })}</g>
  </svg>`;
}

const finaleObserver = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) {
    const f = $('#finale');
    if (!f.classList.contains('run')) {
      f.classList.add('run');
      if (state.sound) setTimeout(whistle, 1500);
    }
  }
}, { threshold: 0.25 });

// Szűrők
function setFilter(f) {
  state.filter = f;
  $$('.seg [data-filter]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.filter === f)));
  const anchorYear = +yearNow.textContent;
  timeline.layout();
  if (state.view === 'timeline' && scrollY > $('#track').offsetTop) timeline.scrollToYear(anchorYear);
  mapView.refresh();
}
$$('.seg [data-filter]').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));

// Ugrás évre
$('#yearBtn').addEventListener('click', () => {
  const row = $('#yearRow');
  row.hidden = !row.hidden;
  $('#yearBtn').setAttribute('aria-expanded', String(!row.hidden));
  if (!row.hidden && scrollY < $('#track').offsetTop - 60) timeline.scrollToYear(+yearSlider.value);
});
yearSlider.addEventListener('input', () => {
  sliderActive = true;
  yearOut.textContent = yearSlider.value;
  timeline.scrollToYear(+yearSlider.value);
});
yearSlider.addEventListener('change', () => setTimeout(() => (sliderActive = false), 700));

/* ---------------- Térkép ---------------- */
const mapView = createMap({
  items,
  el: $('#map'),
  isVisible,
  onOpen: id => openItem(id),
  ui: {
    slider: $('#mapSlider'), year: $('#mapYear'), play: $('#playBtn'),
    chips: $$('.map-chips [data-layer]'), jumps: $$('#mapJump [data-jump]'),
    journeyBtn: $('#journeyBtn'), journey: $('#journey'), fallback: $('#mapFallback'),
  },
});

/* ---------------- Nézetváltás ---------------- */
let timelineScroll = 0;
function route() {
  const v = location.hash === '#terkep' ? 'map' : 'timeline';
  if (v === state.view && document.body.dataset.view) return;
  if (state.view === 'timeline' && v === 'map') timelineScroll = scrollY;
  state.view = v;
  document.body.dataset.view = v;
  $('#view-timeline').hidden = v !== 'timeline';
  $('#view-map').hidden = v !== 'map';
  $$('.tabbar [data-view]').forEach(a => (a.dataset.view === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (v === 'map') {
    mapView.init().then(() => mapView.invalidate());
  } else {
    requestAnimationFrame(() => { scrollTo(0, timelineScroll); timeline.update(); });
  }
}
addEventListener('hashchange', route);

/* ---------------- Bottom sheet ---------------- */
const sheet = $('#sheet'), scrim = $('#scrim'), sheetBody = $('#sheetBody');
let sheetOpen = false, lastFocus = null, sheetItem = null;

function showSheet(html, item = null) {
  sheetBody.innerHTML = html;
  sheetBody.scrollTop = 0;
  sheetItem = item;
  timeline.highlight(item ? item.id : null);
  if (!sheetOpen) {
    lastFocus = document.activeElement;
    sheet.hidden = false; scrim.hidden = false;
    requestAnimationFrame(() => { sheet.classList.add('open'); scrim.classList.add('open'); });
    history.pushState({ sheet: true }, '');
    sheetOpen = true;
    document.documentElement.style.overflow = 'hidden';
  }
  setTimeout(() => $('#sheetClose').focus({ preventScroll: true }), 50);
}
function hideSheet() {
  if (!sheetOpen) return;
  sheetOpen = false;
  sheet.classList.remove('open'); scrim.classList.remove('open');
  sheet.style.transform = '';
  document.documentElement.style.overflow = '';
  timeline.highlight(null);
  setTimeout(() => { if (!sheetOpen) { sheet.hidden = true; scrim.hidden = true; } }, 380);
  lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
}
function closeSheet() { if (sheetOpen) history.back(); }
addEventListener('popstate', () => { if (sheetOpen) hideSheet(); });
scrim.addEventListener('click', closeSheet);
$('#sheetClose').addEventListener('click', closeSheet);
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// lehúzással zárás
(() => {
  let y0 = null, dy = 0;
  const start = e => { if (sheetBody.scrollTop > 0 && !e.target.closest('.sheet-grip')) return; y0 = e.touches ? e.touches[0].clientY : e.clientY; dy = 0; };
  const move = e => {
    if (y0 === null) return;
    dy = (e.touches ? e.touches[0].clientY : e.clientY) - y0;
    if (dy > 0) { sheet.classList.add('dragging'); sheet.style.transform = `translateY(${dy}px)`; if (e.cancelable) e.preventDefault(); }
  };
  const end = () => {
    if (y0 === null) return;
    sheet.classList.remove('dragging');
    if (dy > 110) closeSheet(); else sheet.style.transform = '';
    y0 = null;
  };
  sheet.addEventListener('touchstart', start, { passive: true });
  sheet.addEventListener('touchmove', move, { passive: false });
  sheet.addEventListener('touchend', end);
  $('#sheetGrip').addEventListener('pointerdown', start);
  addEventListener('pointermove', e => y0 !== null && e.pointerType === 'mouse' && move(e));
  addEventListener('pointerup', end);
})();

const laneName = { art: 'Művészet', rail: 'Vasút', us: 'Kezdőállomás' };
const curatorChip = c => c ? `<span class="curator ${/matyi|mátyás/i.test(c) ? 'matyi' : ''}"><i>${c[0]}</i>${c}</span>` : '';

function openItem(id) {
  const it = byId.get(id);
  if (!it) return;
  if (it.lane === 'us') { openUs(); return; }
  const links = it.linkTo.map(t => byId.get(t)).filter(Boolean);
  const q = encodeURIComponent(`${it.title} ${it.lane === 'art' ? it.creator : ''}`.trim());
  const more = it.url || `https://hu.wikipedia.org/w/index.php?search=${q}`;
  const html = `
    <div class="sh-hero ${it.lane}">${bigIllustration(it)}${it.imageCredit ? `<span class="credit">${it.imageCredit}</span>` : ''}</div>
    <div class="sh-lane ${it.lane}"><svg class="ico"><use href="#${it.lane === 'art' ? 'i-brush' : 'i-loco'}"/></svg>${laneName[it.lane]}${it.hu ? ' · <span class="flag" aria-hidden="true"></span> magyar szál' : ''}</div>
    <p class="sh-year">${it.yearLabel}</p>
    <h2 class="sh-title ${it.lane}" id="sheetTitle">${it.title}</h2>
    ${it.creator ? `<p class="sh-creator">${it.creator}</p>` : ''}
    <p class="sh-text">${it.text}</p>
    <dl class="sh-meta">
      ${it.place ? `<dt>Hely</dt><dd>${it.place}</dd>` : ''}
      ${it.lane === 'art' && it.locationNow ? `<dt>Ma látható</dt><dd>${it.locationNow}</dd>` : ''}
      ${it.lane === 'art' ? `<dt>Vasút a műben</dt><dd>${it.railInArt === true ? 'igen' : it.railInArt === false ? 'nem – korszakjelző mű' : 'nyitott'}</dd>` : ''}
      ${it.curator ? `<dt>Választotta</dt><dd>${curatorChip(it.curator)}</dd>` : ''}
    </dl>
    ${links.length ? `<div class="sh-links"><h4>Összefonódik ezzel</h4><ul>${links.map(l => `
      <li><button type="button" data-goto="${l.id}"><span class="mini">${l.lane === 'us' ? '' : illustration(l)}</span><span><b>${l.title}</b><small>${l.yearLabel} · ${laneName[l.lane]}</small></span></button></li>`).join('')}</ul></div>` : ''}
    <div class="sh-actions">
      ${it.lat != null ? `<button class="btn" type="button" data-onmap="${it.id}"><svg class="ico"><use href="#i-map"/></svg>Térképen</button>` : ''}
      <a class="btn" href="${more}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-ext"/></svg>Bővebben</a>
    </div>`;
  showSheet(html, it);
  wireSheet();
}

function openUs() {
  const it = usItem;
  showSheet(`
    <div class="info">
      <h2 id="sheetTitle">Zsófia és Mátyás</h2>
      <p class="lead">${it.yearLabel}<br>${it.place}</p>
      <p class="sh-text" style="text-align:center;font-style:italic">${it.text}</p>
      <div class="sh-actions" style="justify-content:center">
        <a class="btn primary" href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-pin"/></svg>Útvonal</a>
        <button class="btn" type="button" data-goto="us-2026"><svg class="ico"><use href="#i-tracks"/></svg>Az idővonalon</button>
      </div>
    </div>`, it);
  wireSheet();
}

function wireSheet() {
  sheetBody.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => goTo(b.dataset.goto)));
  sheetBody.querySelectorAll('[data-onmap]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.onmap;
    closeSheet();
    if (state.view !== 'map') location.hash = '#terkep';
    setTimeout(() => mapView.flyToItem(id), 450);
  }));
}

function goTo(id) {
  const it = byId.get(id);
  if (state.view === 'map') { mapView.flyToItem(id); openItem(id); return; }
  closeSheet();
  setTimeout(() => {
    if (it.lane === 'us') { $('#finale').scrollIntoView({ behavior: 'smooth' }); return; }
    if (!timeline.isShown(id)) setFilter('all');
    timeline.focusItem(id);
  }, 260);
}

/* ---------------- Nekik / info lap ---------------- */
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });

const shareUrl = () => location.href.split('#')[0];
const themeLabel = { auto: 'Automatikus', light: 'Nappali', dark: 'Éjszakai vonat' };

$('#infoBtn').addEventListener('click', () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  showSheet(`
    <div class="info">
      <h2 id="sheetTitle">Zsófinak és Matyinak</h2>
      <p class="lead">Két pálya, kétszáz év, egy közös út. Ez az oldal nektek készült – és mindenkinek, aki ma veletek ünnepel.</p>
      <section>
        <h3>Megosztás</h3>
        <div class="qr" id="qr" aria-label="QR-kód az oldal címével"></div>
        <div class="row" style="justify-content:center">
          ${navigator.share ? `<button class="btn primary" type="button" id="shareBtn">Megosztás</button>` : ''}
          <button class="btn" type="button" id="copyBtn">Link másolása</button>
        </div>
      </section>
      <section>
        <h3>Beállítások</h3>
        <div class="switch"><span>Megjelenés</span><button class="btn" type="button" id="themeBtn">${themeLabel[state.theme]}</button></div>
        <div class="switch"><span>Mozdonysíp a finálénál</span><button class="btn" type="button" id="soundBtn" aria-pressed="${state.sound}"><svg class="ico"><use href="#${state.sound ? 'i-sound' : 'i-mute'}"/></svg>${state.sound ? 'Be' : 'Ki'}</button></div>
      </section>
      <section>
        <h3>Telepítés a telefonra</h3>
        ${deferredInstall ? `<button class="btn gold" type="button" id="installBtn">Hozzáadás a kezdőképernyőhöz</button>` :
          `<p>${ios ? 'Safariban: Megosztás gomb → „Főképernyőhöz adás”.' : 'A böngésző menüjében: „Alkalmazás telepítése” vagy „Hozzáadás a kezdőképernyőhöz”.'} Utána internet nélkül is megnyílik.</p>`}
      </section>
      <section>
        <h3>Hogyan bővíthető?</h3>
        <p>Minden tétel egyetlen táblázatban él (<code>data/timeline.csv</code>). Új sor, <code>npm run build</code> – és a kártya megjelenik az idővonalon és a térképen is. Az utolsó két hely – Zsófi kortárs kedvence és Matyi MÁV-os pillanata – nektek van fenntartva.</p>
      </section>
    </div>`);
  renderQR();
  $('#copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareUrl()); toast('Link a vágólapon'); } catch { toast(shareUrl()); }
  });
  $('#shareBtn')?.addEventListener('click', () => navigator.share({ title: 'Sínek és vásznak – Zsófi és Matyi', text: 'Két pálya, egy út: 1825–2026.', url: shareUrl() }).catch(() => {}));
  $('#themeBtn').addEventListener('click', e => {
    state.theme = { auto: 'light', light: 'dark', dark: 'auto' }[state.theme];
    store.set('theme', state.theme); applyTheme(); mapView.retheme();
    e.currentTarget.textContent = themeLabel[state.theme];
  });
  $('#soundBtn').addEventListener('click', e => {
    state.sound = !state.sound; store.set('sound', state.sound);
    const b = e.currentTarget;
    b.setAttribute('aria-pressed', state.sound);
    b.innerHTML = `<svg class="ico"><use href="#${state.sound ? 'i-sound' : 'i-mute'}"/></svg>${state.sound ? 'Be' : 'Ki'}`;
    syncWhistleBtn();
    if (state.sound) whistle();
  });
  $('#installBtn')?.addEventListener('click', async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; closeSheet(); });
});

function renderQR() {
  const box = $('#qr');
  const draw = () => {
    const qr = window.qrcode(0, 'M');
    qr.addData(shareUrl()); qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };
  if (window.qrcode) return draw();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
  s.onload = draw;
  s.onerror = () => { box.innerHTML = '<p style="color:#555;font-size:13px;text-align:center">A QR-kódhoz internet kell.</p>'; };
  document.head.appendChild(s);
}

function applyTheme() {
  const r = document.documentElement;
  if (state.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = state.theme;
  const dark = state.theme === 'dark' || (state.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#0e1525' : '#f5f0e4'));
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------------- Indulási tábla (visszaszámláló) ---------------- */
function tickBoard() {
  const dg = $('#boardDigits'), lb = $('#boardLbl');
  if (!dg || !finaleInfo?.date) return;
  const now = new Date(), d = finaleInfo.date;
  const ms = d - now;
  const pad = n => String(n).padStart(2, '0');
  if (ms > 0) {
    const days = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    lb.textContent = 'Indulásig';
    dg.textContent = days > 0 ? `${days} nap ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}`;
  } else if (ms > -12 * 36e5) {
    lb.textContent = 'Állomás: Krisztinaváros';
    dg.textContent = 'Most indul a vonat!';
  } else {
    const days = Math.floor(-ms / 864e5);
    lb.textContent = 'Egy vágányon';
    dg.textContent = `${days} napja`;
  }
}
setInterval(tickBoard, 20000);

/* ---------------- Mozdonysíp (szintetizált, alapból némítva) ---------------- */
let actx;
function whistle() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches && !state.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + 0.05;
    const out = actx.createGain();
    out.gain.setValueAtTime(0, t0);
    out.gain.linearRampToValueAtTime(0.16, t0 + 0.12);
    out.gain.setValueAtTime(0.16, t0 + 0.9);
    out.gain.linearRampToValueAtTime(0.0, t0 + 1.25);
    out.gain.setValueAtTime(0, t0 + 1.4);
    out.gain.linearRampToValueAtTime(0.14, t0 + 1.5);
    out.gain.linearRampToValueAtTime(0.0, t0 + 2.6);
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    out.connect(lp).connect(actx.destination);
    for (const fq of [392, 494, 587]) {
      const o = actx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(fq * 0.96, t0); o.frequency.linearRampToValueAtTime(fq, t0 + 0.15);
      const g = actx.createGain(); g.gain.value = 0.33;
      o.connect(g).connect(out); o.start(t0); o.stop(t0 + 2.7);
    }
    const len = actx.sampleRate * 2.7, buf = actx.createBuffer(1, len, actx.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * 0.25;
    const n = actx.createBufferSource(); n.buffer = buf;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    n.connect(bp).connect(out); n.start(t0);
  } catch { /* nincs hang */ }
}
function syncWhistleBtn() {
  const b = $('#finaleWhistle'); if (!b) return;
  b.setAttribute('aria-pressed', state.sound);
  b.innerHTML = `<svg class="ico"><use href="#${state.sound ? 'i-sound' : 'i-mute'}"/></svg>Sípszó`;
}
function wireWhistle() {
  const b = $('#finaleWhistle'); if (!b) return;
  syncWhistleBtn();
  b.addEventListener('click', () => {
    state.sound = !state.sound; store.set('sound', state.sound); syncWhistleBtn();
    if (state.sound) whistle();
  });
}

/* ---------------- Indítás ---------------- */
drawHero();
await document.fonts?.ready.catch(() => {});
layoutAll();
route();

// Mélylinkek: ?ev=1877 egy évre ugrik, ?t=monet-1877 megnyit egy kártyát, ?ev=fin a kezdőállomásra visz
const qs = new URLSearchParams(location.search);
if (qs.get('ev') === 'fin') requestAnimationFrame(() => $('#finale').scrollIntoView());
else if (qs.get('ev')) requestAnimationFrame(() => timeline.scrollToYear(+qs.get('ev'), true));
if (qs.get('t') && byId.has(qs.get('t'))) setTimeout(() => openItem(qs.get('t')), 300);
let lastW = innerWidth;
addEventListener('resize', () => {
  if (Math.abs(innerWidth - lastW) < 2) return; // mobil címsor-ugrálás figyelmen kívül
  lastW = innerWidth;
  clearTimeout(window.__rz);
  window.__rz = setTimeout(() => { drawHero(); layoutAll(); }, 150);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { applyTheme(); mapView.retheme(); });

// Helyi fejlesztésnél (localhost) a service worker csak ?sw paraméterrel indul, hogy a módosítások azonnal látszódjanak.
const devHost = /^(localhost|127.0.0.1)$/.test(location.hostname) && !location.search.includes('sw');
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  if (devHost) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  else navigator.serviceWorker.register('sw.js').catch(() => {});
}
