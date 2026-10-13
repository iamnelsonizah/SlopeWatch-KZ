// Adds national or regional fault traces to public/data/kz-faults.geojson.
//   node scripts/import-faults.mjs path/to/faults.geojson "Source name" [--slip=Reverse] [--dry]
// Input: GeoJSON LineString / MultiLineString features. Convert shapefiles first:
//   ogr2ogr -f GeoJSON -t_srs EPSG:4326 faults.geojson faults.shp
// Recognised properties (all optional): slip (Reverse, Dextral, Sinistral, Normal), rate (mm/yr), dip, name.
import { readFile, writeFile } from 'node:fs/promises';

const [, , file, source, ...flags] = process.argv;
if (!file || !source) { console.error('Usage: node scripts/import-faults.mjs <faults.geojson> "<source name>" [--slip=Reverse] [--dry]'); process.exit(1); }
const defSlip = (flags.find((f) => f.startsWith('--slip=')) ?? '').split('=')[1];
const input = JSON.parse(await readFile(file, 'utf8'));
const border = JSON.parse(await readFile('public/data/kz-border.geojson', 'utf8')).features[0].geometry;
const polys = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const inRing = (x, y, r) => { let o = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o; } return o; };
const inKZ = (x, y) => polys(border).some((p) => inRing(x, y, p[0]));
const LABEL = { Reverse: 'Reverse (thrust)', Dextral: 'Strike-slip, right-lateral', Sinistral: 'Strike-slip, left-lateral', Normal: 'Normal' };

const feats = [];
for (const f of input.features ?? []) {
  const g = f.geometry; if (!g || !/LineString/.test(g.type)) continue;
  const lines = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
  const p = f.properties ?? {};
  const slip = p.slip ?? p.slip_type ?? defSlip ?? 'Unknown';
  feats.push({ type: 'Feature', geometry: g, properties: {
    id: `${source}-${p.name ?? p.id ?? feats.length}`, catalog: source, kind: 'fault', slip, slipLabel: LABEL[slip] ?? slip,
    inside: lines.some((l) => l.some(([x, y]) => inKZ(x, y))), ...(p.rate != null ? { rate: Number(p.rate) } : {}), ...(p.dip != null ? { dip: Number(p.dip) } : {}),
  } });
}
console.log(`${feats.length} fault traces (${feats.filter((x) => x.properties.inside).length} inside Kazakhstan)`);
if (flags.includes('--dry')) process.exit(0);
const path = 'public/data/kz-faults.geojson';
const fc = JSON.parse(await readFile(path, 'utf8'));
fc.features = fc.features.filter((x) => x.properties.catalog !== source).concat(feats);
await writeFile(path, JSON.stringify(fc));
console.log('Updated', path);
