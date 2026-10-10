// Térkép nézet időcsúszkával – Leaflet + OpenStreetMap/CARTO csempék, igény szerint betöltve.
import { illustration } from './art.js';

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((res, rej) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.crossOrigin = '';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = LEAFLET_JS; s.crossOrigin = ''; s.onload = () => res(window.L); s.onerror = rej;
    document.head.appendChild(s);
  });
}

const VIEWS = {
  eu: { center: [49.5, 8], zoom: 4 },
  bp: { center: [47.5, 19.05], zoom: 12 },
  ny: { center: [40.76, -73.95], zoom: 11 },
  us: { center: [40.5, -95], zoom: 3 },
  jp: { center: [35.6, 138.9], zoom: 7 },
  world: { center: [35, 20], zoom: 2 },
};

const JOURNEY = [
  { title: 'Anglia, ahol minden kezdődött', years: '1825–1838', center: [53.2, -1.6], zoom: 6, year: 1838,
    text: 'Az első gőzvonatok Észak-Angliában indultak – a művészet egyelőre csak figyel.', ids: ['stockton-1825', 'rainhill-1829', 'liverpool-1830', 'gwr-1838'] },
  { title: 'London: gőz és köd', years: '1838–1863', center: [51.52, -0.42], zoom: 9, year: 1863,
    text: 'Turner a hídon, Frith a peronon, a város alatt pedig elindul az első metró.', ids: ['gwr-1838', 'turner-1844', 'frith-1862', 'metropolitan-1863'] },
  { title: 'Párizs, Saint-Lazare', years: '1837–1877', center: [48.877, 2.324], zoom: 15, year: 1877,
    text: 'Egyetlen pályaudvar, három festő: itt találkozik a két sávunk a legtöbbször.', ids: ['saintlazare-1837', 'manet-1873', 'caillebotte-1876', 'monet-1877'] },
  { title: 'Budapest: a magyar szál', years: '1846–1934', center: [47.505, 19.06], zoom: 12, year: 1934,
    text: 'Pest–Vác, Nyugati, Keleti, Földalatti, Kandó és az Árpád – meg a Nemzeti Galéria kincsei.', ids: ['pestvac-1846', 'nyugati-1877', 'keleti-1884', 'foldalatti-1896', 'szinyei-1873', 'kando-1932', 'arpad-1934'] },
  { title: 'Kezdőállomás', years: '2026. október 10.', center: [47.4906, 19.0122], zoom: 16, year: 2026,
    text: 'Felsőkrisztinaváros, Apor Vilmos tér. Két sín – egy vágány.', ids: ['us-2026', 'zsofi-2026', 'matyi-2026'] },
];

export function createMap({ items, el, ui, isVisible, onOpen, onReady }) {
  let L, map, tiles, ready = false;
  const markers = new Map();
  let arcLayer;
  let year = 2026;
  const layers = { art: true, rail: true };
  let playing = null;
  let journeyStep = -1;
  const placeable = items.filter(i => i.lat != null && i.lng != null && i.lane !== 'note');
  const byId = new Map(items.map(i => [i.id, i]));

  // OpenStreetMap-csempék, CSS-szűrővel tompítva a papír-hangulathoz (sötét módban invertálva)
  function tileUrl() {
    return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  }

  async function init() {
    if (ready) return;
    try { L = await loadLeaflet(); } catch {
      ui.fallback.hidden = false; return;
    }
    map = L.map(el, { zoomControl: false, worldCopyJump: true, attributionControl: true, tap: true }).setView(VIEWS.eu.center, VIEWS.eu.zoom);
    tiles = L.tileLayer(tileUrl(), {
      maxZoom: 19, className: 'osm-tiles',
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> közreműködők',
    }).addTo(map);
    arcLayer = L.layerGroup().addTo(map);
    for (const it of placeable) {
      const size = it.lane === 'us' ? 22 : 16;
      const icon = L.divIcon({ className: '', html: `<span class="pin ${it.lane}" style="width:${size}px;height:${size}px"><i></i></span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
      const m = L.marker([it.lat, it.lng], { icon, title: `${it.yearLabel} – ${it.title}`, keyboard: true, riseOnHover: true, zIndexOffset: it.lane === 'us' ? 1000 : 0 });
      m.on('click', () => onOpen(it.id));
      m.addTo(map);
      markers.set(it.id, m);
    }
    ready = true;
    refresh();
    onReady && onReady();
  }

  function arcPoints(a, b) {
    const [lat1, lng1] = a, [lat2, lng2] = b;
    const mx = (lat1 + lat2) / 2, my = (lng1 + lng2) / 2;
    const dx = lat2 - lat1, dy = lng2 - lng1;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(0.35 * d, 12);
    const cxp = mx + (-dy / d) * k, cyp = my + (dx / d) * k;
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.05) pts.push([(1 - t) ** 2 * lat1 + 2 * (1 - t) * t * cxp + t * t * lat2, (1 - t) ** 2 * lng1 + 2 * (1 - t) * t * cyp + t * t * lng2]);
    return pts;
  }

  function shownAt(it) {
    if (it.year > year) return false;
    if (it.lane === 'art' && !layers.art) return false;
    if (it.lane === 'rail' && !layers.rail) return false;
    return isVisible(it);
  }

  function refresh() {
    ui.year.textContent = year;
    ui.slider.value = year;
    if (!ready) return;
    for (const it of placeable) {
      const m = markers.get(it.id);
      const pin = m.getElement()?.querySelector('.pin');
      if (!pin) continue;
      const on = shownAt(it);
      pin.classList.toggle('off', !on);
      pin.classList.toggle('now', on && it.year > year - 5);
      pin.classList.toggle('old', on && it.year < year - 60 && year < 2026);
      m.getElement().style.pointerEvents = on ? '' : 'none';
    }
    arcLayer.clearLayers();
    const done = new Set();
    for (const it of placeable) {
      if (!shownAt(it)) continue;
      for (const t of it.linkTo) {
        const o = byId.get(t);
        if (!o || o.lat == null || !shownAt(o)) continue;
        const key = [it.id, t].sort().join('|');
        if (done.has(key)) continue;
        done.add(key);
        L.polyline(arcPoints([it.lat, it.lng], [o.lat, o.lng]), { className: 'maparc', interactive: false }).addTo(arcLayer);
      }
    }
  }

  function setYear(y) { year = Math.max(1825, Math.min(2026, Math.round(y))); refresh(); }

  function play() {
    if (playing) { stop(); return; }
    if (year >= 2026) setYear(1825);
    ui.play.innerHTML = '<svg class="ico"><use href="#i-pause"/></svg>';
    ui.play.setAttribute('aria-label', 'Szünet');
    playing = setInterval(() => {
      if (year >= 2026) { stop(); return; }
      setYear(year + 1);
    }, 110);
  }
  function stop() {
    clearInterval(playing); playing = null;
    ui.play.innerHTML = '<svg class="ico"><use href="#i-play"/></svg>';
    ui.play.setAttribute('aria-label', 'Lejátszás');
  }

  function jump(key) {
    const v = VIEWS[key]; if (!v || !map) return;
    map.flyTo(v.center, v.zoom, { duration: 1.1 });
  }

  function flyToItem(id) {
    const it = byId.get(id);
    if (!it || it.lat == null || !map) return;
    if (it.year > year) setYear(Math.max(it.year, year));
    map.flyTo([it.lat, it.lng], Math.max(map.getZoom(), it.lane === 'us' ? 16 : 12), { duration: 1.2 });
  }

  // --- Utazás mód
  function renderJourney() {
    const st = JOURNEY[journeyStep];
    const items = st.ids.map(id => byId.get(id)).filter(Boolean);
    ui.journey.innerHTML = `
      <div class="jh"><b>${st.title}</b><small>${journeyStep + 1}/${JOURNEY.length} · ${st.years}</small></div>
      <p>${st.text}</p>
      <div class="strip">${items.map(it => `<button type="button" class="${it.lane}" data-id="${it.id}"><span class="mini">${it.lane === 'us' ? '' : illustration(it)}</span><span>${it.title}<small>${it.yearLabel}</small></span></button>`).join('')}</div>
      <div class="jnav">
        <button class="btn" type="button" data-j="prev" ${journeyStep === 0 ? 'disabled' : ''}>‹ Előző</button>
        <button class="btn" type="button" data-j="end">Kiszállok</button>
        <button class="btn primary" type="button" data-j="next">${journeyStep === JOURNEY.length - 1 ? 'Vége' : 'Következő ›'}</button>
      </div>`;
    ui.journey.querySelectorAll('.strip button').forEach(b => b.addEventListener('click', () => onOpen(b.dataset.id)));
    ui.journey.querySelectorAll('[data-j]').forEach(b => b.addEventListener('click', () => {
      const j = b.dataset.j;
      if (j === 'prev') goStep(journeyStep - 1);
      else if (j === 'next') journeyStep === JOURNEY.length - 1 ? endJourney() : goStep(journeyStep + 1);
      else endJourney();
    }));
    stop();
    setYear(st.year);
    const pts = items.filter(i => i.lat != null).map(i => [i.lat, i.lng]);
    const bottom = ui.journey.offsetHeight + 110;
    map.flyToBounds(L.latLngBounds(pts).pad(0.15), { paddingTopLeft: [24, 150], paddingBottomRight: [24, bottom], maxZoom: st.zoom, duration: 1.6 });
  }
  function goStep(i) { journeyStep = Math.max(0, Math.min(JOURNEY.length - 1, i)); renderJourney(); }
  function startJourney() { ui.journey.hidden = false; ui.journeyBtn.classList.add('on'); goStep(0); }
  function endJourney() { journeyStep = -1; ui.journey.hidden = true; ui.journeyBtn.classList.remove('on'); jump('eu'); }

  // --- UI kötések
  ui.slider.addEventListener('input', () => { stop(); setYear(+ui.slider.value); });
  ui.play.addEventListener('click', play);
  ui.chips.forEach(c => c.addEventListener('click', () => {
    const l = c.dataset.layer; layers[l] = !layers[l];
    c.classList.toggle('on', layers[l]); c.setAttribute('aria-pressed', layers[l]);
    refresh();
  }));
  ui.jumps.forEach(b => b.addEventListener('click', () => jump(b.dataset.jump)));
  ui.journeyBtn.addEventListener('click', () => (journeyStep >= 0 ? endJourney() : startJourney()));

  return {
    init,
    refresh,
    invalidate: () => map && map.invalidateSize(),
    flyToItem,
    retheme: () => {},
    get ready() { return ready; },
  };
}
