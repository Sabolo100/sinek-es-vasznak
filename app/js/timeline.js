// Kétsávos, függőleges idővonal: balra a művészet, jobbra a vasút.
// A két sín mentén két inda fut (olajzöld = Zsófi, MÁV-kék = Matyi): eleinte a saját sínjükön,
// az évek múlásával egyre többször fonódnak össze – 2026-ban egy vágánnyá válnak.
import { illustration, leaf, flower, branch, botanicDefs, locoTop } from './art.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function createTimeline({ items, track, cards, railsSvg, loco, onOpen, onYear, isVisible }) {
  const laneItems = items.filter(i => i.lane === 'art' || i.lane === 'rail' || i.lane === 'note');
  const els = new Map();
  let geo = null;           // elrendezés-geometria
  let strandData = null;    // indák mintavételezett pontjai
  let leaves = [];
  let progressY = 0;

  loco.innerHTML = locoTop;

  // --- kártyák létrehozása
  for (const it of laneItems) {
    let el;
    if (it.lane === 'note') {
      el = document.createElement('aside');
      el.className = 'note';
      el.innerHTML = `<h3>${it.title}</h3><p>${it.text}</p>`;
    } else {
      el = document.createElement('button');
      el.type = 'button';
      el.className = `card ${it.lane}${it.linkTo.length ? ' linked' : ''}`;
      el.dataset.id = it.id;
      const railMark = it.lane === 'art' && it.railInArt ? `<svg class="ico" aria-label="a vasút megjelenik a műben"><use href="#i-loco"/></svg>` : '';
      const hu = it.hu ? `<span class="hu flag" title="magyar szál" aria-label="magyar szál"></span>` : '';
      el.innerHTML = `
        <span class="thumb" aria-hidden="true">${illustration(it)}</span>
        <span class="body">
          <span class="yr">${it.yearLabel}${railMark}${hu}</span>
          <span class="ttl">${it.title}</span>
          <span class="who">${it.lane === 'art' ? it.creator : (it.place || it.creator)}</span>
        </span>`;
      el.setAttribute('aria-label', `${it.yearLabel}: ${it.title}${it.creator ? ', ' + it.creator : ''}`);
      el.addEventListener('click', () => onOpen(it.id));
    }
    cards.appendChild(el);
    els.set(it.id, el);
  }

  // belépő animáció
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });

  // --- elrendezés
  function layout() {
    const W = track.clientWidth;
    const narrow = W < 340;
    track.classList.toggle('narrow', narrow);
    const pad = narrow ? 10 : Math.max(10, Math.min(18, W * 0.03));
    const gutter = narrow ? 0 : Math.round(Math.max(46, Math.min(84, W * 0.13)));
    const cx = narrow ? 22 : W / 2;
    const gauge = narrow ? 14 : Math.round(Math.max(16, Math.min(22, gutter * 0.32)));
    const colW = narrow ? W - 44 - pad : (W - 2 * pad - gutter) / 2;
    const headH = narrow ? 14 : 58;

    const visible = laneItems.filter(isVisible);
    const shown = new Set(visible.map(i => i.id));
    for (const [id, el] of els) el.hidden = !shown.has(id);

    // szélesség beállítása, majd mérés
    for (const it of visible) {
      const el = els.get(it.id);
      if (it.lane === 'note') { el.style.width = ''; continue; }
      el.style.width = colW + 'px';
      el.style.left = (narrow ? 44 : it.lane === 'art' ? pad : W - pad - colW) + 'px';
    }
    const heights = visible.map(it => els.get(it.id).offsetHeight);

    const GAP = 14, STAGGER = 34, DEC = 30;
    const cur = { art: headH, rail: headH };
    let prevTop = headH - STAGGER, prevYear = 1825, prev = null;
    const pos = [];
    visible.forEach((it, i) => {
      const h = heights[i];
      const decades = Math.floor(it.year / 10) - Math.floor(prevYear / 10);
      const minByTime = prevTop + Math.max(STAGGER, decades * DEC);
      let top;
      if (it.lane === 'note') {
        top = Math.max(cur.art, cur.rail, minByTime) + 10;
        cur.art = cur.rail = top + h + 24;
      } else if (narrow) {
        top = Math.max(cur.art, prevTop + (prev ? 0 : 0)) + (decades > 0 ? decades * 8 : 0);
        cur.art = cur.rail = top + h + GAP;
      } else {
        const own = it.lane;
        top = Math.max(cur[own], minByTime);
        // közvetlenül kapcsolt, azonos korú pár pontosan egy sorba kerül (egyik sem előbb, mint a másik)
        if (prev && prev.lane !== own && prev.lane !== 'note' && prev.linkTo.includes(it.id) && Math.abs(prev.year - it.year) <= 2) {
          top = Math.max(cur[own], prevTop);
          if (top > prevTop) {
            const pp = pos[pos.length - 1];
            pp.top = top; pp.dotY = top + 24;
            els.get(prev.id).style.top = top + 'px';
            cur[prev.lane] = top + pp.h + GAP;
          }
        }
        cur[own] = top + h + GAP;
      }
      els.get(it.id).style.top = top + 'px';
      pos.push({ it, top, h, dotY: top + (it.lane === 'note' ? h / 2 : 24) });
      prevTop = top; prevYear = it.year; prev = it;
    });
    const H = Math.max(cur.art, cur.rail) + 40;
    cards.style.height = H + 'px';
    track.style.height = H + 'px';

    // év <-> y megfeleltetés
    const anchors = [{ year: 1825, y: headH - 10 }];
    for (const p of pos) if (p.it.year > anchors[anchors.length - 1].year) anchors.push({ year: p.it.year, y: p.dotY });
      else if (p.it.year === anchors[anchors.length - 1].year) anchors[anchors.length - 1].y = Math.min(anchors[anchors.length - 1].y, p.dotY);
    anchors.push({ year: 2026.9, y: H });

    geo = { W, H, cx, gauge, pad, colW, narrow, pos, anchors, gutter };
    drawRails();
    for (const p of pos) io.observe(els.get(p.it.id));
    update();
  }

  const yearToY = year => {
    const a = geo.anchors;
    if (year <= a[0].year) return a[0].y;
    for (let i = 1; i < a.length; i++) {
      if (year <= a[i].year) {
        const t = (year - a[i - 1].year) / (a[i].year - a[i - 1].year || 1);
        return a[i - 1].y + t * (a[i].y - a[i - 1].y);
      }
    }
    return a[a.length - 1].y;
  };
  const yToYear = y => {
    const a = geo.anchors;
    if (y <= a[0].y) return a[0].year;
    for (let i = 1; i < a.length; i++) {
      if (y <= a[i].y) {
        const t = (y - a[i - 1].y) / (a[i].y - a[i - 1].y || 1);
        return a[i - 1].year + t * (a[i].year - a[i - 1].year);
      }
    }
    return 2026;
  };

  // --- sínek, indák, kapcsolatok rajzolása
  function drawRails() {
    const { W, H, cx, gauge, pos, narrow, pad, colW } = geo;
    const g = gauge / 2;
    let s = `<defs>${botanicDefs}
      <pattern id="sleepers" width="40" height="15" patternUnits="userSpaceOnUse" x="${cx - gauge}"><rect y="5" width="${gauge * 2}" height="4" rx="1" class="sl"/></pattern></defs>`;
    s += `<rect x="${cx - gauge}" y="0" width="${gauge * 2}" height="${H}" fill="url(#sleepers)" opacity=".85"/>`;
    s += `<path d="M${cx - g} 0V${H}M${cx + g} 0V${H}" class="rl"/>`;

    // évtized-kilométerkövek
    let decs = '';
    for (let d = 1830; d <= 2020; d += 10) {
      const y = yearToY(d);
      decs += `<g class="dec" transform="translate(${cx} ${y.toFixed(1)})"><rect x="-17" y="-8" width="34" height="16" rx="8"/><text>${d}</text></g>`;
    }

    // állomás-csonkok
    let stubs = '';
    for (const p of pos) {
      if (p.it.lane === 'note') continue;
      const lane = p.it.lane;
      const railX = narrow ? cx : lane === 'art' ? cx - g : cx + g;
      const edge = narrow ? 44 : lane === 'art' ? pad + colW : W - pad - colW;
      stubs += `<path d="M${edge} ${p.dotY}H${railX}" class="stub ${lane}"/><circle cx="${railX}" cy="${p.dotY}" r="4.2" class="dot ${lane}"/>`;
    }

    // kapcsolatok (arany váltók)
    let links = '';
    const done = new Set();
    if (!narrow) {
      const byId = new Map(pos.map(p => [p.it.id, p]));
      let k = 0;
      for (const p of pos) {
        for (const t of p.it.linkTo) {
          const q = byId.get(t);
          if (!q || p.it.lane === q.it.lane || q.it.lane === 'note') continue;
          const key = [p.it.id, t].sort().join('|');
          if (done.has(key)) continue;
          done.add(key);
          const [A, B] = p.it.lane === 'art' ? [p, q] : [q, p];
          const xa = pad + colW, xb = W - pad - colW;
          const off = ((k++ % 3) - 1) * 4;
          const midY = (A.dotY + B.dotY) / 2;
          links += `<path d="M${xa} ${A.dotY}C${cx + off} ${A.dotY} ${cx + off} ${B.dotY} ${xb} ${B.dotY}" class="link" data-a="${A.it.id}" data-b="${B.it.id}"/>`;
          links += `<g class="linkflower">${flower(cx + off, midY, 6.5, k * 23)}</g>`;
        }
      }
    }

    // két inda: t = idő-előrehaladás (0..1); eleinte a saját sínen, később fonat
    const step = 5;
    const ptsA = [], ptsB = [];
    const R = g + 4;
    for (let y = 0; y <= H; y += step) {
      const yr = yToYear(y);
      let t = Math.max(0, Math.min(1, (yr - 1825) / (2026 - 1825)));
      t = t ** 1.15;
      const wave = 150 - 60 * t; // egyre sűrűbb fonat
      const phi = (y / wave) * Math.PI * 2;
      const amp = narrow ? R * t : R * t;
      const base = narrow ? (g * (1 - t)) : g * (1 - t);
      ptsA.push([cx - base + amp * Math.sin(phi), y]);
      ptsB.push([cx + base - amp * Math.sin(phi), y]);
    }
    const toD = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
    const cum = pts => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };
    strandData = { A: { pts: ptsA, cum: cum(ptsA) }, B: { pts: ptsB, cum: cum(ptsB) } };

    // levelek az indán – a későbbi években sűrűbben
    let leafSvg = '';
    leaves = [];
    let lastLeafY = -999;
    for (let i = 8; i < ptsA.length - 2; i++) {
      const [x, y] = ptsA[i];
      const yr = yToYear(y);
      const t = (yr - 1825) / 201;
      const gapNeeded = 150 - 95 * t;
      if (y - lastLeafY < gapNeeded) continue;
      lastLeafY = y;
      const strand = i % 2 ? ptsA : ptsB;
      const [lx, ly] = strand[i];
      const [nx, ny] = strand[i + 1];
      const ang = Math.atan2(ny - ly, nx - lx) * 180 / Math.PI;
      const side = (i % 4 < 2) ? -1 : 1;
      leafSvg += `<g class="vleaf" data-y="${ly.toFixed(0)}">${leaf(lx, ly, 11 + 5 * t, ang + side * 55, i % 3)}</g>`;
      leaves.push(ly);
    }

    s += `<path d="${toD(ptsA)}" class="strand a" id="strandA"/>`;
    s += `<path d="${toD(ptsB)}" class="strand b" id="strandB"/>`;
    s += `<g class="vleaves">${leafSvg}</g>`;
    s += `<g class="links">${links}</g>`;
    s += `<g class="stubs">${stubs}</g>`;
    s += `<g class="decs">${decs}</g>`;
    railsSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    railsSvg.setAttribute('width', W);
    railsSvg.setAttribute('height', H);
    railsSvg.style.height = H + 'px';
    railsSvg.innerHTML = s;
    const sA = railsSvg.querySelector('#strandA'), sB = railsSvg.querySelector('#strandB');
    strandData.A.el = sA; strandData.B.el = sB;
    for (const k of ['A', 'B']) {
      const L = strandData[k].cum[strandData[k].cum.length - 1];
      strandData[k].el.style.strokeDasharray = `${L} ${L}`;
    }
    railsSvg._leafEls = [...railsSvg.querySelectorAll('.vleaf')];
  }

  // --- görgetés: mozdony + indák kirajzolása
  function lengthAt(sd, y) {
    const i = Math.max(0, Math.min(sd.pts.length - 1, Math.round(y / 5)));
    return sd.cum[i];
  }
  let lastYear = null;
  function update() {
    if (!geo) return;
    const rect = track.getBoundingClientRect();
    const vh = innerHeight;
    const y = Math.max(0, Math.min(geo.H, vh * 0.5 - rect.top));
    progressY = y;
    loco.style.transform = `translate(${geo.cx - 12}px, ${y - 20}px)`;
    loco.classList.toggle('idle', y <= 0 || y >= geo.H);
    for (const k of ['A', 'B']) {
      const sd = strandData[k];
      const L = sd.cum[sd.cum.length - 1];
      sd.el.style.strokeDashoffset = (L - lengthAt(sd, y)).toFixed(1);
    }
    const le = railsSvg._leafEls || [];
    for (let i = 0; i < le.length; i++) le[i].classList.toggle('on', leaves[i] < y);
    const yr = Math.round(yToYear(y));
    if (yr !== lastYear) { lastYear = yr; onYear(Math.min(2026, Math.max(1825, yr))); }
  }

  let raf = 0;
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
  addEventListener('scroll', onScroll, { passive: true });
  let rto;
  const ro = new ResizeObserver(() => { clearTimeout(rto); rto = setTimeout(layout, 80); });
  ro.observe(track);

  function scrollToYear(year, instant = false) {
    if (!geo) return;
    const y = yearToY(year);
    const top = track.getBoundingClientRect().top + scrollY + y - innerHeight * 0.5 + 1;
    scrollTo({ top, behavior: instant || reduceMotion.matches ? 'auto' : 'smooth' });
  }

  function focusItem(id) {
    const el = els.get(id);
    if (!el || el.hidden) return false;
    const r = el.getBoundingClientRect();
    scrollTo({ top: r.top + scrollY - innerHeight * 0.32, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    el.classList.add('in');
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    return true;
  }

  function highlight(id) {
    railsSvg.querySelectorAll('.link').forEach(l => l.classList.toggle('hot', !!id && (l.dataset.a === id || l.dataset.b === id)));
  }

  return {
    layout, update, scrollToYear, focusItem, highlight,
    get geo() { return geo; },
    isShown: id => els.get(id) && !els.get(id).hidden,
  };
}

// ---- Finálé: a két sín egy vágánnyá fut össze
export function renderFinale({ finale, item, geo, onMap }) {
  const W = finale.clientWidth || innerWidth;
  const cx0 = geo ? geo.cx : W / 2;
  const g = geo ? geo.gauge / 2 : 9;
  const cx = W / 2;
  const H = 260;
  const yMerge = 175;
  const len = 600;
  // sínek: a két sín (bal: művészet, jobb: vasút) középre hajlik és összeolvad
  const pathL = `M${cx0 - g} 0C${cx0 - g} 70 ${cx - 2} ${yMerge - 70} ${cx} ${yMerge}`;
  const pathR = `M${cx0 + g} 0C${cx0 + g} 70 ${cx + 2} ${yMerge - 70} ${cx} ${yMerge}`;
  const one = `M${cx} ${yMerge}V${H}`;
  let sleepers = '';
  for (let y = 6; y < yMerge - 20; y += 15) {
    const t = y / yMerge;
    const x = cx0 + (cx - cx0) * (t * t * (3 - 2 * t));
    const w = (g * 2 + 12) * (1 - t * .7);
    sleepers += `<rect x="${(x - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="4" rx="1" class="sl" opacity="${(1 - t * .6).toFixed(2)}"/>`;
  }
  const bloomLeaves = branch({ x: cx - 4, y: yMerge + 4, angle: 200, length: 80, seed: 'fl1', flowers: 0, buds: 1, leaves: 5, scale: .8, bend: .3 })
    + branch({ x: cx + 4, y: yMerge + 4, angle: -20, length: 80, seed: 'fl2', flowers: 0, buds: 1, leaves: 5, scale: .8, bend: .3 });

  const d = item.date ? new Date(item.date) : null;
  finale.innerHTML = `
    <svg class="merge" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <defs>${botanicDefs}</defs>
      ${sleepers}
      <path d="${pathL}" class="rl"/><path d="${pathR}" class="rl"/>
      <path d="${pathL}" class="sa dw" style="--len:${len}"/>
      <path d="${pathR}" class="sb dw" style="--len:${len}"/>
      <path d="${one}" class="one dw late" style="--len:${H}"/>
      <g class="bl-leaf botanic">${bloomLeaves}</g>
      <g class="bloom">${flower(cx, yMerge, 22, 10)}</g>
    </svg>
    <article class="station" aria-labelledby="stTitle">
      <div class="st-bot botanic" aria-hidden="true"></div>
      <div class="plate"><b>Kezdőállomás</b><span>${item.yearLabel.split('·')[0].trim()}</span></div>
      <div class="st-in">
        <p class="kicker">2026 · egy vágány</p>
        <h2 id="stTitle"><span class="n1">Zsófia</span> <span class="amp">és</span> <span class="n2">Mátyás</span></h2>
        <p class="date">${item.yearLabel}</p>
        <p class="place">${item.place}</p>
        <p class="msg">${item.text}</p>
        ${d ? `<div class="board" id="board"><small id="boardLbl">Indulásig</small><span class="digits" id="boardDigits">--</span></div>` : ''}
        <div class="actions">
          <a class="btn primary" href="https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-pin"/></svg>Útvonal</a>
          <button class="btn" type="button" id="finaleMap"><svg class="ico"><use href="#i-map"/></svg>Térképen</button>
          <button class="btn gold" type="button" id="finaleWhistle" aria-pressed="false"><svg class="ico"><use href="#i-mute"/></svg>Sípszó</button>
        </div>
      </div>
    </article>`;
  finale.querySelectorAll('.dw').forEach(p => { if (!p.style.getPropertyValue('--len')) p.style.setProperty('--len', len); });
  finale.querySelector('#finaleMap').addEventListener('click', () => onMap(item.id));
  return { date: d };
}
