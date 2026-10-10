// SVG-illusztrációk: teacserje-ágak (a meghívó motívuma), festmény-paletták, vasúti vonalrajzok.

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = n => Math.round(n * 10) / 10;

/* ---------- Botanika ---------- */

// Levél a (0,0) pontból a (L,0) felé, középérrel
export function leaf(x, y, L, angle, tone = 0) {
  const w = L * 0.34;
  const fill = ['url(#gLeafA)', 'url(#gLeafB)', 'url(#gLeafC)'][tone % 3];
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <path d="M0 0C${f(L * .22)} ${f(-w)} ${f(L * .68)} ${f(-w * .95)} ${f(L)} 0C${f(L * .68)} ${f(w * .9)} ${f(L * .22)} ${f(w)} 0 0Z" fill="${fill}"/>
    <path d="M${f(L * .04)} 0Q${f(L * .5)} ${f(-L * .03)} ${f(L * .94)} 0" class="vein"/>
    <path d="M${f(L * .3)} ${f(-L * .01)}l${f(L * .12)} ${f(-w * .5)}M${f(L * .52)} ${f(-L * .015)}l${f(L * .12)} ${f(-w * .45)}M${f(L * .36)} 0l${f(L * .12)} ${f(w * .5)}M${f(L * .6)} 0l${f(L * .1)} ${f(w * .42)}" class="vein thin"/>
  </g>`;
}

export function flower(x, y, r, rot = 0) {
  let petals = '';
  for (let i = 0; i < 5; i++) {
    const a = rot + i * 72;
    petals += `<ellipse cx="0" cy="${f(-r * .55)}" rx="${f(r * .52)}" ry="${f(r * .6)}" transform="rotate(${f(a)})" class="petal"/>`;
  }
  let stamens = '';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2, d = r * .2;
    stamens += `<circle cx="${f(Math.cos(a) * d)}" cy="${f(Math.sin(a) * d)}" r="${f(r * .07)}" class="stamen"/>`;
  }
  return `<g class="flower" transform="translate(${f(x)} ${f(y)})"><g class="petals">${petals}</g><circle r="${f(r * .3)}" class="pistil"/>${stamens}</g>`;
}

export function bud(x, y, r, angle) {
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})">
    <ellipse cx="0" cy="${f(-r * .2)}" rx="${f(r * .7)}" ry="${f(r * .85)}" class="petal"/>
    <path d="M${f(-r * .7)} ${f(r * .1)}Q0 ${f(r * 1.2)} ${f(r * .7)} ${f(r * .1)}Q0 ${f(r * .55)} ${f(-r * .7)} ${f(r * .1)}Z" fill="url(#gLeafB)"/>
  </g>`;
}

// Egy teacserje-ág: x,y kezdőpontból angle irányba (fokban), length hosszan
export function branch({ x, y, angle, length, seed = 'b', flowers = 1, buds = 2, leaves = 7, scale = 1, bend = 0.25 }) {
  const r = rng(seed);
  const a = angle * Math.PI / 180;
  const ex = x + Math.cos(a) * length, ey = y + Math.sin(a) * length;
  const nx = -Math.sin(a), ny = Math.cos(a);
  const bendSide = (r() > .5 ? 1 : -1) * length * bend;
  const cx = (x + ex) / 2 + nx * bendSide, cy = (y + ey) / 2 + ny * bendSide;
  const pt = t => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey];
  const tan = t => Math.atan2(2 * (1 - t) * (cy - y) + 2 * t * (ey - cy), 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx)) * 180 / Math.PI;
  let out = `<path d="M${f(x)} ${f(y)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}" class="stem" style="stroke-width:${f(1.6 * scale)}"/>`;
  let leafs = '';
  for (let i = 0; i < leaves; i++) {
    const t = 0.12 + (i / leaves) * 0.8;
    const [px, py] = pt(t);
    const side = i % 2 ? 1 : -1;
    const L = (30 + r() * 16) * scale * (1.1 - t * .45);
    leafs += leaf(px, py, L, tan(t) + side * (38 + r() * 22), Math.floor(r() * 3));
  }
  out += leafs;
  let extras = '';
  for (let i = 0; i < buds; i++) {
    const t = 0.35 + r() * 0.5; const [px, py] = pt(t);
    extras += `<path d="M${f(px)} ${f(py)}l${f(nx * 8 * scale)} ${f(ny * 8 * scale)}" class="stem thin"/>` + bud(px + nx * 9 * scale, py + ny * 9 * scale, 4.2 * scale, tan(t) + 90);
  }
  for (let i = 0; i < flowers; i++) {
    const t = i === 0 ? 1 : 0.5 + r() * 0.3; const [px, py] = pt(t);
    extras += flower(px, py, (13 + r() * 4) * scale, r() * 72);
  }
  return out + extras;
}

export const botanicDefs = `
  <linearGradient id="gLeafA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--leaf-1)"/><stop offset="1" stop-color="var(--leaf-2)"/></linearGradient>
  <linearGradient id="gLeafB" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="var(--leaf-2)"/><stop offset=".6" stop-color="var(--leaf-3)"/><stop offset="1" stop-color="var(--leaf-1)"/></linearGradient>
  <linearGradient id="gLeafC" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--leaf-3)"/><stop offset="1" stop-color="var(--leaf-2)"/></linearGradient>`;

export function botanicCorners(w, h) {
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" class="botanic">
    <defs>${botanicDefs}</defs>
    <g>${branch({ x: -8, y: 40, angle: -8, length: 150, seed: 'tl', flowers: 1, buds: 2, leaves: 7, scale: 1 })}</g>
    <g>${branch({ x: -10, y: 120, angle: 22, length: 90, seed: 'tl2', flowers: 0, buds: 1, leaves: 5, scale: .8 })}</g>
    <g>${branch({ x: w + 8, y: 30, angle: 196, length: 130, seed: 'tr', flowers: 1, buds: 1, leaves: 6, scale: .95 })}</g>
    <g>${branch({ x: -6, y: h + 10, angle: -62, length: 210, seed: 'bl', flowers: 2, buds: 2, leaves: 9, scale: 1 })}</g>
    <g>${branch({ x: w + 6, y: h + 10, angle: -116, length: 230, seed: 'br', flowers: 2, buds: 3, leaves: 9, scale: 1.02 })}</g>
  </svg>`;
}

/* ---------- Festmény-paletta (jogvédett/hiányzó kép helyett) ---------- */

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
}

export function paletteArt(item, w = 160, h = 100) {
  const pal = item.palette && item.palette.length ? item.palette : ['#8a9a5b', '#f4efe3', '#d9b45a', '#5f6b3a', '#ffffff'];
  const sorted = [...pal].sort((a, b) => lum(b) - lum(a));
  const bg = sorted[0];
  const r = rng(item.id);
  let strokes = '';
  const rest = pal.filter(c => c !== bg);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const c = rest[i % rest.length];
    const y0 = h * (0.1 + r() * 0.8), y1 = h * (0.1 + r() * 0.8);
    const x0 = -10 + r() * w * .3, x1 = w * (.7 + r() * .4);
    const cx1 = w * r(), cy1 = h * r(), cx2 = w * r(), cy2 = h * r();
    const sw = h * (0.08 + r() * 0.2);
    strokes += `<path d="M${f(x0)} ${f(y0)}C${f(cx1)} ${f(cy1)} ${f(cx2)} ${f(cy2)} ${f(x1)} ${f(y1)}" stroke="${c}" stroke-width="${f(sw)}" stroke-linecap="round" fill="none" opacity="${f(.55 + r() * .4)}"/>`;
  }
  // kis "ecsetfolt" pöttyök
  for (let i = 0; i < 6; i++) {
    strokes += `<circle cx="${f(w * r())}" cy="${f(h * r())}" r="${f(1 + r() * h * .05)}" fill="${rest[(i + 2) % rest.length]}" opacity=".7"/>`;
  }
  let rails = '';
  if (item.railInArt) {
    const dark = sorted[sorted.length - 1];
    const vx = w * (.35 + r() * .3), vy = h * .38;
    rails = `<g stroke="${dark}" stroke-linecap="round" fill="none" opacity=".85">
      <path d="M${f(vx - 2)} ${f(vy)}L${f(w * .12)} ${h + 2}M${f(vx + 2)} ${f(vy)}L${f(w * .62)} ${h + 2}" stroke-width="1.6"/>
      ${[0.2, 0.36, 0.56, 0.8].map(t => {
        const yy = vy + (h - vy) * t; const xl = vx - 2 + (w * .12 - vx + 2) * t; const xr = vx + 2 + (w * .62 - vx - 2) * t;
        return `<path d="M${f(xl - 2)} ${f(yy)}H${f(xr + 2)}" stroke-width="${f(.6 + t * 1.4)}" opacity=".6"/>`;
      }).join('')}
    </g>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" class="pal" role="img" aria-label="Stilizált színpaletta: ${item.title}">
    <g><rect width="${w}" height="${h}" fill="${bg}"/>${strokes}${rails}</g>
  </svg>`;
}

/* ---------- Vasúti vonalrajzok ---------- */

const track = (w, y) => {
  let s = `<path d="M0 ${y}H${w}" class="ln"/><path d="M0 ${y + 4}H${w}" class="ln thin"/>`;
  for (let x = 6; x < w; x += 12) s += `<path d="M${x} ${y - 1}v6" class="ln thin" opacity=".5"/>`;
  return s;
};
const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" class="ln"/><circle cx="${x}" cy="${y}" r="1" class="fillc"/>`;

const motifs = {
  steam: () => `
    <path d="M30 70V48h52v22M82 70V40h22v30M30 70h82" class="ln"/>
    <path d="M40 48V36h9v12M60 48v-6h7v6M86 40v-6h18v6" class="ln"/>
    <path d="M112 70l10 6H24" class="ln"/>
    ${wheel(42, 72, 6)}${wheel(60, 72, 6)}${wheel(93, 70, 9)}
    <path d="M42 72h51" class="ln thin"/>
    <g class="puff"><circle cx="44" cy="26" r="6"/><circle cx="34" cy="17" r="8"/><circle cx="20" cy="11" r="9"/></g>`,
  streamliner: () => `
    <path d="M20 70V46c0-6 4-10 10-10h66c14 0 28 14 36 34Z" class="ln"/>
    <path d="M106 42h10M94 46h30" class="ln thin"/><path d="M28 54h70" class="ln thin"/>
    ${wheel(40, 73, 6)}${wheel(58, 73, 6)}${wheel(84, 73, 6)}${wheel(102, 73, 6)}`,
  station: () => `
    <path d="M20 76V40M140 76V40M20 40h120" class="ln"/>
    <path d="M30 76V50a50 34 0 0 1 100 0v26" class="ln"/>
    <path d="M42 76V54a38 26 0 0 1 76 0v22M80 76V24M55 76V36M105 76V36" class="ln thin"/>
    <path d="M14 40l6-14h8l-6 14M146 40l-6-14h-8l6 14" class="ln thin"/>
    <path d="M18 26h10M132 26h10" class="ln"/>`,
  metro: () => `
    <path d="M20 80V44a60 34 0 0 1 120 0v36" class="ln"/>
    <rect x="52" y="34" width="56" height="40" rx="10" class="ln"/>
    <rect x="60" y="42" width="40" height="14" rx="3" class="ln thin"/>
    <circle cx="64" cy="66" r="2.5" class="fillc"/><circle cx="96" cy="66" r="2.5" class="fillc"/>
    <path d="M70 80l-8-6M90 80l8-6" class="ln thin"/>`,
  spike: () => `
    <path d="M10 82 70 30M150 82 90 30" class="ln"/>
    ${[0.25, 0.5, 0.75].map(t => `<path d="M${10 + 60 * t - 8} ${82 - 52 * t}H${150 - 60 * t + 8}" class="ln thin" opacity=".55"/>`).join('')}
    <path d="M80 18v34" class="gold" stroke-width="5" stroke-linecap="round"/><path d="M74 18h12" class="gold" stroke-width="4" stroke-linecap="round"/>`,
  express: () => `
    <path d="M14 70V44h30v26M44 70V36h10v34" class="ln"/><path d="M18 44V32h7v12" class="ln"/>
    ${wheel(24, 72, 5)}${wheel(38, 72, 5)}
    <rect x="60" y="38" width="86" height="32" rx="3" class="ln"/>
    ${[66, 82, 98, 114, 130].map(x => `<rect x="${x}" y="45" width="10" height="9" rx="1.5" class="ln thin"/>`).join('')}
    <path d="M60 60h86" class="gold" stroke-width="1.4"/>
    ${wheel(72, 72, 4)}${wheel(84, 72, 4)}${wheel(122, 72, 4)}${wheel(134, 72, 4)}`,
  electric: () => `
    <path d="M14 14V78M146 14V78M8 20h146" class="ln"/><path d="M14 28h132" class="ln thin"/>
    <path d="M70 28l-10 12h28l-10-12" class="ln thin"/>
    <rect x="34" y="40" width="96" height="30" rx="5" class="ln"/>
    ${[44, 60, 104, 118].map(x => `<rect x="${x}" y="46" width="10" height="9" rx="1.5" class="ln thin"/>`).join('')}
    <path d="M34 62h96" class="ln thin"/>
    ${wheel(50, 72, 5)}${wheel(64, 72, 5)}${wheel(100, 72, 5)}${wheel(114, 72, 5)}`,
  railcar: () => `
    <path d="M18 70V52c0-10 10-16 24-16h80c12 0 22 10 24 34Z" class="ln"/>
    ${[38, 54, 70, 86, 102].map(x => `<rect x="${x}" y="43" width="11" height="10" rx="2" class="ln thin"/>`).join('')}
    <path d="M118 44c8 2 14 8 18 16h-18Z" class="ln thin"/><path d="M20 60h124" class="gold" stroke-width="1.4"/>
    ${wheel(40, 72, 5)}${wheel(54, 72, 5)}${wheel(110, 72, 5)}${wheel(124, 72, 5)}`,
  highspeed: () => `
    <path d="M8 70V50h96c22 0 38 8 48 20Z" class="ln"/>
    <path d="M110 52c10 1 20 5 26 10h-26Z" class="ln thin"/>
    ${[18, 36, 54, 72, 90].map(x => `<rect x="${x}" y="55" width="12" height="7" rx="1.5" class="ln thin"/>`).join('')}
    <path d="M8 66h140" class="gold" stroke-width="1.4"/>
    <path d="M4 40h20M0 34h30M10 28h14" class="ln thin" opacity=".5"/>`,
  tunnel: () => `
    <path d="M0 76 46 26l18 12 22-24 26 26 18-10 30 46" class="ln"/>
    <path d="M58 76V62a22 18 0 0 1 44 0v14" class="ln"/>
    <path d="M64 76V64a16 13 0 0 1 32 0v12" class="ln thin"/>
    <path d="M28 54l6-4M120 50l6 5M80 32l-4 6" class="ln thin" opacity=".55"/>`,
  maglev: () => `
    <path d="M8 62V48h100c20 0 34 6 44 14Z" class="ln"/>
    ${[18, 36, 54, 72, 90].map(x => `<rect x="${x}" y="52" width="12" height="6" rx="1.5" class="ln thin"/>`).join('')}
    <path d="M4 72h152" class="ln"/><path d="M14 66v2M40 66v2M66 66v2M92 66v2M118 66v2" class="gold" stroke-width="1.6"/>
    <path d="M10 80h20M60 80h20M110 80h20" class="ln thin" opacity=".55"/>`,
  signal: () => `
    <path d="M70 80V20" class="ln"/><path d="M62 80h16" class="ln"/>
    <path d="M70 26l38-12v10L70 34Z" class="ln"/><circle cx="62" cy="30" r="4" class="ln thin"/>
    <path d="M118 44c-3-6-12-6-12 1 0 6 12 12 12 12s12-6 12-12c0-7-9-7-12-1Z" class="gold" fill="none" stroke-width="1.6"/>`,
};

export function railArt(item, w = 160, h = 100) {
  const m = motifs[item.motif] || motifs.steam;
  const hasTrack = !['station', 'spike', 'signal', 'tunnel', 'metro', 'maglev', 'electric'].includes(item.motif);
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid meet" class="rart" role="img" aria-label="Vonalrajz: ${item.title}">
    <g class="rart-g">${m()}${hasTrack ? track(160, 82) : ['tunnel', 'electric', 'station'].includes(item.motif) ? track(160, 80) : ''}</g>
  </svg>`;
}

export function illustration(item) {
  if (item.image) return `<img src="${item.thumb || item.image}" alt="${item.title}" loading="lazy" decoding="async">`;
  return item.lane === 'art' ? paletteArt(item) : railArt(item);
}

export function bigIllustration(item) {
  if (item.image) return `<img src="${item.image}" alt="${item.title}" loading="lazy" decoding="async">`;
  return item.lane === 'art' ? paletteArt(item, 320, 200) : railArt(item, 320, 200);
}

// Felülnézeti mozdony a haladásjelzőhöz (lefelé néz)
export const locoTop = `<svg viewBox="0 0 24 40" width="24" height="40">
  <g class="steam"><circle cx="12" cy="4" r="3"/><circle cx="9" cy="-3" r="3.6"/><circle cx="14" cy="-10" r="4.2"/></g>
  <rect x="4" y="6" width="16" height="11" rx="2" class="cab"/>
  <rect x="5" y="16" width="14" height="19" rx="6" class="boiler"/>
  <circle cx="12" cy="27" r="2.6" class="chimney"/>
  <path d="M5 36h14l-2 3H7Z" class="buffer"/>
</svg>`;
