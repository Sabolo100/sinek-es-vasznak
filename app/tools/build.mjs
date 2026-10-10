// timeline.csv → timeline.json
// Futtatás: node tools/build.mjs   (vagy: npm run build)
// Függőség nélküli: a CSV-t saját parser olvassa (vessző vagy pontosvessző, idézőjeles mezők).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const csvPath = join(root, 'data', 'timeline.csv');
const jsonPath = join(root, 'data', 'timeline.json');

function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.slice(0, text.indexOf('\n'));
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  const head = rows.shift().map(h => h.trim());
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const bool = v => /^(true|igen|yes|1|x)$/i.test(v) ? true : /^(false|nem|no|0)$/i.test(v) ? false : null;
const num = v => (v === '' ? null : Number(String(v).replace(',', '.')));
const list = v => v.split(/[\s,;|]+/).filter(Boolean);

const raw = parseCSV(readFileSync(csvPath, 'utf8'));
const errors = [];
const items = raw.map((r, idx) => {
  const lane = r.lane.toLowerCase();
  if (!['art', 'rail', 'us', 'note'].includes(lane)) errors.push(`${idx + 2}. sor: ismeretlen sáv: "${r.lane}"`);
  if (!r.id) errors.push(`${idx + 2}. sor: hiányzó id`);
  const year = num(r.year);
  if (!Number.isFinite(year)) errors.push(`${r.id}: hibás évszám "${r.year}"`);
  const item = {
    id: r.id,
    lane,
    year,
    yearLabel: r.yearLabel || String(r.year),
    title: r.title,
    creator: r.creator || '',
    place: r.place || '',
    lat: num(r.lat),
    lng: num(r.lng),
    locationNow: r.locationNow || '',
    text: r.text || '',
    linkTo: list(r.linkTo || ''),
    curator: r.curator || '',
    hu: bool(r.hu || '') === true,
  };
  if (r.date) item.date = r.date;
  if (lane === 'art') item.railInArt = bool(r.railInArt || '');
  if (r.motif) item.motif = r.motif;
  if (r.palette) item.palette = list(r.palette).map(c => (c.startsWith('#') ? c : '#' + c));
  if (r.url) item.url = r.url;
  if (r.image) {
    item.image = 'images/' + r.image;
    const thumb = r.image.replace(/(\.\w+)$/, '-400$1');
    item.thumb = existsSync(join(root, 'images', thumb)) ? 'images/' + thumb : item.image;
    if (!existsSync(join(root, 'images', r.image))) errors.push(`${r.id}: a kép nem található: images/${r.image}`);
    item.imageCredit = r.imageCredit || '';
    if (!item.imageCredit) errors.push(`${r.id}: a képhez kötelező a forrásjelölés (imageCredit)`);
  }
  return item;
});

// Azonosítók és kapcsolatok ellenőrzése, kapcsolatok kétirányúsítása
const byId = new Map();
for (const it of items) {
  if (byId.has(it.id)) errors.push(`duplikált id: ${it.id}`);
  byId.set(it.id, it);
}
for (const it of items) {
  for (const t of it.linkTo) {
    const other = byId.get(t);
    if (!other) { errors.push(`${it.id}: ismeretlen kapcsolat: ${t}`); continue; }
    if (!other.linkTo.includes(it.id)) other.linkTo.push(it.id);
  }
}

if (errors.length) {
  console.error('Hibák a timeline.csv-ben:\n  ' + errors.join('\n  '));
  process.exit(1);
}

const laneOrder = { rail: 0, art: 1, note: 2, us: 3 };
items.sort((a, b) => a.year - b.year || laneOrder[a.lane] - laneOrder[b.lane]);

writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), items }, null, 1));
const count = l => items.filter(i => i.lane === l).length;
console.log(`timeline.json kész: ${items.length} tétel (művészet ${count('art')}, vasút ${count('rail')}, mi ${count('us')}).`);
