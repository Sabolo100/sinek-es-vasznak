# Sínek és vásznak – Zsófi és Matyi, 1825–2026

Telefonra tervezett PWA esküvői ajándéknak. Két sín fut egymás mellett: balra a művészet (Zsófi, olajzöld), jobbra a vasút (Matyi, MÁV-kék). A sínek mentén két inda halad, és az évek múlásával egyre sűrűbben fonódik össze. 2026-nál a két sín egy vágánnyá fut össze, ott nyílik ki a meghívóról ismert teavirág, és ott áll a *Kezdőállomás*.

## Futtatás

```bash
npm run dev        # build + helyi szerver: http://localhost:5173
```

Helyben (localhost) a service worker szándékosan nem indul el, hogy a módosítások azonnal látszódjanak. A teszteléséhez nyisd meg így: `http://localhost:5173/?sw`.

## Tartalom szerkesztése

Minden tétel a `data/timeline.csv` fájlban van. Szerkesztheted Excelben vagy Google Táblázatban is; vesszővel és pontosvesszővel elválasztott formát is elfogad. Mentés után:

```bash
npm run build      # data/timeline.csv → data/timeline.json (ellenőrzi az id-kat és a kapcsolatokat)
```

| Oszlop | Jelentés |
| --- | --- |
| `id` | egyedi azonosító, pl. `monet-1877` |
| `lane` | `art` / `rail` / `us` (a pár állomása) / `note` (középre kerülő megjegyzés) |
| `year`, `yearLabel` | rendezési év, illetve a megjelenített évszám (`1862–64`) |
| `date` | csak a `us` sorhoz: az esküvő ISO-időpontja (ebből számol a visszaszámláló) |
| `title`, `creator`, `place`, `lat`, `lng`, `locationNow`, `text` | a kártya tartalma és helye a térképen |
| `image`, `imageCredit` | opcionális kép az `images/` mappából. Ha van `név-400.webp` is, az lesz a bélyegkép. A forrásjelölés kötelező. |
| `linkTo` | kapcsolt tételek id-jai szóközzel elválasztva. A kapcsolat kétirányú, az egyik oldalon elég megadni. |
| `railInArt` | művészeti tételnél `true` vagy `false` |
| `curator` | `Zsófi` / `Matyi` |
| `hu` | `true`, ha a tétel a magyar szálhoz tartozik |
| `motif` | vasúti vonalrajz: `steam`, `streamliner`, `station`, `metro`, `spike`, `express`, `electric`, `railcar`, `highspeed`, `tunnel`, `maglev`, `signal` |
| `palette` | művészeti tételnél 5 szín (`#c9a24a #e8d6a0 …`). Kép helyett ebből készül a stilizált „vászon”. |
| `url` | opcionális „Bővebben” link. Ha üres, Wikipédia-keresés lesz belőle. |

A bemutatóverzióban 39 tételhez Wikimedia Commons-képet raktunk be (`images/`, 800 px + `-400` bélyegkép), további 6 (Severini, Dalí, Picasso, Magritte, Haring, Banksy) kézzel megadott kép, ezek jogait külön tisztázni kell. A forrás és a licenc az `imageCredit` oszlopban áll. Ahol nincs kép (Matyi és Zsófi saját állomása), ott a stilizált színpaletta marad. **Éles használat előtt** ellenőrizd a képek jogait: a de Chirico- és a Warhol-kép a Commons szerint közkincs, de a 20. századi alkotók műveinél ez országonként eltérhet.

## Mélylinkek

- `?ev=1877`: az adott évhez görget
- `?t=monet-1877`: megnyit egy kártyát
- `?ev=fin`: a Kezdőállomáshoz ugrik
- `#terkep`: a térkép nézet

## Közzététel

Statikus oldal, build után az `app/` mappa tartalma bárhová feltölthető (Netlify, Vercel, GitHub Pages). Az új verzió letöltéséhez módosítsd a `sw.js` fájlban a `VERSION` értékét. Az ikonok és az OG-kép a `tools/render/*.html` oldalakból készültek headless Chrome-mal.

## Ellenőrizendő

- A dátumokat és a sztorikat emlékezetből gyűjtöttük, érdemes Zsófival és Matyival átnézni.
- A `zsofi-2026` és a `matyi-2026` sor nekik van fenntartva.
