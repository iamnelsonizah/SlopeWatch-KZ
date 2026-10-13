import { fcContains } from './geo';
import { geomContains } from './geo';
import type { FC, Quake } from './types';

const BOX = 'minlatitude=39&maxlatitude=57&minlongitude=45&maxlongitude=89';

/** USGS ComCat via the public FDSN API (CORS enabled). M3+ since 1990 within the region around Kazakhstan. */
export async function fetchQuakes(border: FC, context: FC, regions: FC, signal?: AbortSignal): Promise<{ quakes: Quake[]; truncated: boolean }> {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&${BOX}&minmagnitude=3&starttime=1990-01-01&orderby=time&limit=20000`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`USGS ${r.status}`);
  const j = (await r.json()) as FC;
  const out: Quake[] = [];
  for (const f of j.features) {
    if (f.geometry.type !== 'Point') continue;
    const [lon, lat, depth] = f.geometry.coordinates as number[];
    const p = (f.properties ?? {}) as any;
    if (p.mag == null || p.time == null) continue;
    const inside = fcContains(border, lon, lat);
    if (!inside && !fcContains(context, lon, lat)) continue;
    let region = '';
    if (inside) region = String(regions.features.find((g) => geomContains(g.geometry, lon, lat))?.properties?.shapeName ?? '');
    out.push({ id: String(f.id), mag: p.mag, depth: Number.isFinite(depth) ? depth : null, time: p.time, lat, lon, place: p.place ?? '', inside, region });
  }
  return { quakes: out, truncated: j.features.length >= 20000 };
}

export function quakesToGeoJSON(q: Quake[]): FC {
  return {
    type: 'FeatureCollection',
    features: q.map((x) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: [x.lon, x.lat] },
      properties: { id: x.id, mag: x.mag, depth: x.depth, time: x.time, place: x.place, inside: x.inside ? 1 : 0, region: x.region },
    })),
  };
}
