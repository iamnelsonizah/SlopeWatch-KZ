import type { Place, Quake } from './types';

/** Downloads carry their own provenance so a file found later still says where it came from. */
export const ATLAS_NAME = 'SlopeWatch KZ: Kazakhstan Landslide and Earthquake Atlas';
export const ATLAS_URL = 'https://slopewatch-kz.nelsonizah.com';
export const today = () => new Date().toISOString().slice(0, 10);

export function citation(date = today()): string {
  return `Izah, N. (${date.slice(0, 4)}). ${ATLAS_NAME}. ${ATLAS_URL} (accessed ${date}).`;
}

const cell = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(header: string[], rows: unknown[][], comments: string[]): string {
  return [...comments.map((c) => `# ${c}`), header.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n') + '\n';
}
export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const QUAKE_NOTES = (n: number, filter: string) => [
  `${ATLAS_NAME}`,
  `Source: USGS ComCat (https://earthquake.usgs.gov/fdsnws/event/1/), retrieved ${new Date().toISOString()}`,
  `Selection: ${filter}; ${n} events`,
  'Magnitudes are as published by USGS and mix scales (see mag_type). Cite USGS ComCat as the data source.',
  'inside_kz = epicentre inside the national border (Natural Earth boundary); otherwise within about 100 km of it.',
];
export function quakesCsv(quakes: Quake[], filter: string): string {
  return toCsv(
    ['usgs_id', 'time_utc', 'latitude', 'longitude', 'depth_km', 'magnitude', 'mag_type', 'inside_kz', 'region', 'place', 'usgs_url'],
    quakes.map((q) => [q.id, new Date(q.time).toISOString(), q.lat, q.lon, q.depth, q.mag, q.magType, q.inside ? 1 : 0, q.region, q.place, q.url]),
    QUAKE_NOTES(quakes.length, filter),
  );
}
export function quakesGeoJson(quakes: Quake[], filter: string): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    metadata: { title: ATLAS_NAME, notes: QUAKE_NOTES(quakes.length, filter) },
    features: quakes.map((q) => ({
      type: 'Feature', id: q.id, geometry: { type: 'Point', coordinates: q.depth == null ? [q.lon, q.lat] : [q.lon, q.lat, -q.depth * 1000] },
      properties: { time_utc: new Date(q.time).toISOString(), depth_km: q.depth, magnitude: q.mag, mag_type: q.magType, inside_kz: q.inside, region: q.region, place: q.place, usgs_url: q.url },
    })),
  });
}

const PLACE_NOTES = (n: number) => [
  `${ATLAS_NAME}`,
  `Exported ${new Date().toISOString()}; ${n} records`,
  'This is not a national landslide inventory. Records are curated landmarks and NASA COOLR report points.',
  'verification: A well documented, B details approximate, C unverified or substantially approximate.',
  'Coordinates flagged location_approximate=1 mark a general area, not a surveyed position.',
  `Cite as: ${citation()} Cite the original references listed in each row.`,
];
export function placesCsv(places: Place[]): string {
  return toCsv(
    ['id', 'type', 'name_en', 'name_ru', 'name_kk', 'latitude', 'longitude', 'location_approximate', 'reported_location_accuracy', 'region', 'year', 'date', 'magnitude', 'trigger', 'verification', 'fatalities', 'injuries', 'catalogue', 'source', 'references', 'note'],
    places.map((p) => [p.id, p.type, p.name.en, p.name.ru, p.name.kk, p.lat, p.lon, p.approx ? 1 : 0, p.locationAccuracy, p.region, p.year, p.date, p.magnitudeText ?? p.magnitude, p.trigger, p.verification, p.fatalities, p.injuries, p.catalog, p.source, (p.sourceLinks ?? []).map((l) => `${l.label} <${l.url}>`).join(' | '), p.note]),
    PLACE_NOTES(places.length),
  );
}
export function placesGeoJson(places: Place[]): string {
  return JSON.stringify({
    type: 'FeatureCollection',
    metadata: { title: ATLAS_NAME, notes: PLACE_NOTES(places.length) },
    features: places.map((p) => ({
      type: 'Feature', id: p.id, geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { type: p.type, name: p.name, region: p.region, year: p.year ?? null, date: p.date ?? null, magnitude: p.magnitudeText ?? p.magnitude ?? null, trigger: p.trigger ?? null, verification: p.verification, location_approximate: !!p.approx, reported_location_accuracy: p.locationAccuracy ?? null, fatalities: p.fatalities ?? null, injuries: p.injuries ?? null, catalogue: p.catalog ?? null, source: p.source, references: p.sourceLinks ?? [], note: p.note ?? null },
    })),
  });
}
