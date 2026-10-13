// Imports landslide records inside Kazakhstan into lib/places.imported.json.
//   node scripts/import-landslides.mjs path/to/Global_Landslide_Catalog.csv [--dry]
// Source: NASA Global Landslide Catalog (COOLR), https://gpm.nasa.gov/landslides/data.html
// Any CSV with latitude, longitude and a title/date works; columns are matched loosely.
import { readFile, writeFile } from 'node:fs/promises';

const [, , file, ...flags] = process.argv;
if (!file) { console.error('Usage: node scripts/import-landslides.mjs <catalog.csv> [--dry]'); process.exit(1); }

function parseCSV(t) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const rows = parseCSV((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''));
const h = rows[0].map(norm);
const col = (...n) => { for (const x of n) { const i = h.indexOf(norm(x)); if (i >= 0) return i; } return -1; };
const C = { id: col('event_id', 'id'), title: col('event_title', 'title', 'name'), date: col('event_date', 'date'), desc: col('event_description', 'description'),
  loc: col('location_description'), cat: col('landslide_category', 'category', 'type'), trig: col('landslide_trigger', 'trigger'), country: col('country_name', 'country'),
  lat: col('latitude', 'lat'), lon: col('longitude', 'lon', 'long'), src: col('source_name', 'source'), acc: col('location_accuracy') };
if (C.lat < 0 || C.lon < 0) { console.error('No latitude/longitude columns found.'); process.exit(1); }

const border = JSON.parse(await readFile('public/data/kz-border.geojson', 'utf8')).features[0].geometry;
const adm1 = JSON.parse(await readFile('public/data/kz-adm1.geojson', 'utf8')).features;
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inRing = (x, y, r) => { let o = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o; } return o; };
const inGeom = (x, y, g) => polys(g).some((p) => inRing(x, y, p[0]) && !p.slice(1).some((k) => inRing(x, y, k)));
const regionOf = (x, y) => adm1.find((f) => inGeom(x, y, f.geometry))?.properties.shapeName ?? '';

const out = [];
for (const r of rows.slice(1)) {
  const lat = Number(r[C.lat]), lon = Number(r[C.lon]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inGeom(lon, lat, border)) continue;
  const cat = (C.cat >= 0 ? r[C.cat] : '').toLowerCase();
  const type = /mud|debris|flow/.test(cat) ? 'mudflow' : 'landslide';
  const year = Number((C.date >= 0 ? r[C.date] : '').match(/(1[89]\d\d|20\d\d)/)?.[1]) || undefined;
  const title = (C.title >= 0 && r[C.title]) || (C.loc >= 0 && r[C.loc]) || `Landslide ${year ?? ''}`.trim();
  const approx = C.acc >= 0 && /(5|10|25|50|100)km|unknown|country/i.test(r[C.acc] ?? '');
  out.push({
    id: `glc-${(C.id >= 0 && r[C.id]) || out.length}`, type, name: { en: title, kk: '', ru: '' }, lat: +lat.toFixed(4), lon: +lon.toFixed(4),
    region: regionOf(lon, lat), verification: approx ? 'C' : 'B', year, trigger: C.trig >= 0 ? r[C.trig] : undefined,
    note: [C.cat >= 0 && r[C.cat], C.desc >= 0 && r[C.desc]?.slice(0, 280)].filter(Boolean).join('. '),
    source: `NASA Global Landslide Catalog${C.src >= 0 && r[C.src] ? ` (${r[C.src]})` : ''}`, approx,
  });
}
console.log(`${out.length} records inside Kazakhstan`);
if (flags.includes('--dry')) { console.log(out.slice(0, 3)); process.exit(0); }
const existing = JSON.parse(await readFile('lib/places.imported.json', 'utf8')).filter((p) => !String(p.id).startsWith('glc-'));
await writeFile('lib/places.imported.json', JSON.stringify([...existing, ...out], null, 1));
console.log('Wrote lib/places.imported.json. Restart the dev server.');
