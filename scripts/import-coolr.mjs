// Refresh the checked-in Kazakhstan point snapshot from NASA's public COOLR feature service.
// The report catalog is incomplete and many locations are approximate; retain its source accuracy.
import { readFile, writeFile } from 'node:fs/promises';

const SERVICE = 'https://gis.earthdata.nasa.gov/portal/rest/services/Landslides/COOLR_Reports_Points/FeatureServer/0/query';
const PAGE_SIZE = 2000;
const REPORT_SOURCE = 'NASA Global Landslide Catalog (COOLR)';
const TRIGGERS = {
  rain: 'Rain',
  downpour: 'Downpour',
  snowfall_snowmelt: 'Snowfall and snowmelt',
  dam_embankment_collapse: 'Dam embankment collapse',
  continuous_rain: 'Continuous rain',
};
const TITLES = {
  'Mudslides in Almaty region': {
    ru: 'Сели в Алматинской области',
    kk: 'Алматы облысындағы селдер',
  },
  'Landslide on slope in Talgar District': {
    ru: 'Оползень на склоне в Талгарском районе',
    kk: 'Талғар ауданындағы беткей көшкіні',
  },
  'Kargaly River, Chapaevo Settlement in the Nauryzbai District, Auezov District, Almaty': {
    ru: 'Сель на реке Каргалы, посёлок Чапаево, Алматы',
    kk: 'Қарғалы өзеніндегі, Шапаев елді мекеніндегі сел, Алматы',
  },
};

async function fetchPage(offset) {
  const url = new URL(SERVICE);
  url.search = new URLSearchParams({
    where: "country_code='KZ'",
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: String(PAGE_SIZE),
    resultOffset: String(offset),
  }).toString();
  const response = await fetch(url, { headers: { accept: 'application/geo+json, application/json' } });
  if (!response.ok) throw new Error(`NASA COOLR returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.error) throw new Error(`NASA COOLR error: ${payload.error.message ?? 'query failed'}`);
  if (!Array.isArray(payload.features)) throw new Error('NASA COOLR response did not contain a feature list.');
  return payload;
}

function mapRecord(feature) {
  const p = feature.properties ?? {};
  const [lon, lat] = feature.geometry?.coordinates ?? [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const title = String(p.event_title || p.location_description || `NASA COOLR event ${p.event_id ?? feature.id}`);
  const category = String(p.landslide_category ?? '').toLowerCase();
  const type = /mud|debris|flow/.test(category) ? 'mudflow' : 'landslide';
  const year = p.event_date ? new Date(Number(p.event_date)).getUTCFullYear() : undefined;
  const accuracy = p.location_accuracy ? String(p.location_accuracy) : '';
  const sourceName = String(p.source_name || 'Original source');
  const sourceLinks = [];
  const objectId = p.objectid ?? feature.id;
  if (objectId != null) {
    const nasaUrl = new URL(SERVICE);
    nasaUrl.search = new URLSearchParams({ where: `objectid=${objectId}`, outFields: '*', returnGeometry: 'true', f: 'pjson' }).toString();
    sourceLinks.push({ label: `NASA COOLR record · ${objectId}`, url: nasaUrl.toString() });
  }
  if (/^https?:\/\//i.test(String(p.source_link ?? ''))) {
    sourceLinks.push({ label: sourceName, url: String(p.source_link) });
  }
  const count = (value) => value == null || value === '' ? undefined : Number(value);
  const eventYear = Number.isFinite(year) ? year : undefined;
  const id = p.event_import_id || p.event_id || objectId || feature.id;
  return {
    id: `nasa-coolr-${String(id)}`,
    type,
    name: { en: title, ru: TITLES[title]?.ru ?? '', kk: TITLES[title]?.kk ?? '' },
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    region: String(p.admin_division_name || p.country_name || 'Kazakhstan'),
    verification: 'C',
    ...(eventYear ? { year: eventYear } : {}),
    ...(TRIGGERS[p.landslide_trigger] ? { trigger: TRIGGERS[p.landslide_trigger] } : {}),
    note: 'NASA COOLR report point; this is not a mapped landslide boundary.',
    source: REPORT_SOURCE,
    sourceLinks,
    approx: accuracy.toLowerCase() !== 'exact',
    ...(accuracy ? { locationAccuracy: accuracy } : {}),
    ...(count(p.fatality_count) !== undefined ? { fatalities: count(p.fatality_count) } : {}),
    ...(count(p.injury_count) !== undefined ? { injuries: count(p.injury_count) } : {}),
    ...(p.event_import_source ? { catalog: String(p.event_import_source) } : {}),
  };
}

const features = [];
for (let offset = 0; ; offset += PAGE_SIZE) {
  const page = await fetchPage(offset);
  features.push(...page.features);
  if (page.features.length < PAGE_SIZE && !page.exceededTransferLimit) break;
}

const imported = features.map(mapRecord).filter(Boolean);
const old = JSON.parse(await readFile('lib/places.imported.json', 'utf8'));
const retained = old.filter((record) => !String(record.id).startsWith('nasa-coolr-'));
await writeFile('lib/places.imported.json', JSON.stringify([...retained, ...imported], null, 2) + '\n');
console.log(`Imported ${imported.length} NASA COOLR point records for Kazakhstan into lib/places.imported.json.`);
