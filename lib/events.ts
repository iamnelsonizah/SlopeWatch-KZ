import type { Lang, Place, PlaceType, Verification } from './types';
import { localRegion, t } from './i18n';

const TYPE_EN: Record<PlaceType, { label: string; plural: string; color: string }> = {
  landslide: { label: 'Landslide or rockslide', plural: 'Landslides and rockslides', color: '#c2631f' },
  mudflow: { label: 'Mudflow or debris flow', plural: 'Mudflows and debris flows', color: '#7b5ea7' },
  glacial: { label: 'Glacial or dammed lake', plural: 'Glacial and dammed lakes', color: '#1f9ab8' },
  quake: { label: 'Historic earthquake', plural: 'Historic earthquakes', color: '#d62f4b' },
  protection: { label: 'Mitigation structure', plural: 'Mitigation structures', color: '#3d4a52' },
};
export const TYPE_META: Record<PlaceType, { label: string; plural: string; color: string }> = TYPE_EN;
export const typeLabel = (type: PlaceType, lang: Lang, plural = false) => t(lang, TYPE_EN[type][plural ? 'plural' : 'label']);
export const TYPE_ORDER: PlaceType[] = ['landslide', 'mudflow', 'glacial', 'quake', 'protection'];

const mk = (
  type: PlaceType, id: string, en: string, ru: string, lat: number, lon: number, region: string,
  verification: Verification, kk: string, extra: Partial<Place> = {},
): Place => ({ id, type, name: { en, ru, kk }, lat, lon, region, verification, source: 'Published reference', ...extra });

/**
 * Curated landmark events around Almaty and the northern Tien Shan, the best-documented hazard area in Kazakhstan.
 * Locations are approximate (marked on the map) and details are kept to what is widely documented.
 * NASA report points are kept separately from these curated landmarks; refresh them with npm run import:coolr.
 */
const CURATED: Place[] = [
  mk('quake', 'eq-1887-verny', '1887 Verny earthquake', 'Верненское землетрясение 1887 года', 43.2, 76.9, 'Almaty city', 'C', '1887 жылғы Верный жер сілкінісі', { year: 1887, magnitude: 7.3, approx: true, note: 'Destroyed much of Verny (now Almaty). Epicentre and magnitude are historical estimates.', sourceLinks: [{ label: 'Historical earthquake magnitude study (2019)', url: 'https://doi.org/10.1093/gji/ggy377' }] }),
  mk('quake', 'eq-1889-chilik', '1889 Chilik earthquake', 'Чиликское землетрясение 1889 года', 43.1, 78.7, 'Almaty', 'C', '1889 жылғы Шелек жер сілкінісі', { year: 1889, magnitude: 8.3, approx: true, trigger: 'Tectonic', note: 'One of the largest historical earthquakes in the northern Tien Shan; produced surface rupture and widespread slope failures. Estimates vary.', sourceLinks: [{ label: 'Historical earthquake magnitude study (2019)', url: 'https://doi.org/10.1093/gji/ggy377' }] }),
  mk('quake', 'eq-1911-kebin', '1911 Kebin (Kemin) earthquake', 'Кеминское землетрясение 1911 года', 42.9, 77.3, 'Almaty', 'C', '1911 жылғы Кебін (Кемін) жер сілкінісі', { year: 1911, magnitude: 8.0, approx: true, trigger: 'Tectonic', note: 'Triggered large rockslides and surface ruptures in the northern Tien Shan. Historical magnitude estimates vary.', sourceLinks: [{ label: 'Chon-Kemin earthquake source study (2015)', url: 'https://doi.org/10.1093/gji/ggv091' }, { label: 'Landslides and surface breaks of the 1911 Kemin earthquake', url: 'https://repository.geologyscience.ru/items/18b5c601-4a78-4c17-8d25-1750fdb19030' }] }),
  mk('landslide', 'ls-kaindy', 'Lake Kaindy landslide dam', 'Озеро Каинды (завальное)', 42.99, 78.47, 'Almaty', 'C', 'Қайыңды көлінің көшкін бөгеті', { approx: true, note: 'The lake is landslide-dammed. Published studies disagree about whether its dam formed in 1889 or 1911; the date is not assigned here.', sourceLinks: [{ label: 'Tree-ring study supporting formation in 1911 (2022)', url: 'https://doi.org/10.55730/1300-0985.1823' }, { label: 'Tree-ring study examining the 1889 Chilik earthquake (2024)', url: 'https://www.echosciences-paca.fr/uploads/attachment/attached_file/23346119/article_Kaindy_miramont_et_al_2024.pdf' }] }),
  mk('mudflow', 'mf-1921-almaty', '1921 Almaty mudflow', 'Алма-Атинский сель 1921 года', 43.24, 76.95, 'Almaty city', 'B', '1921 жылғы Алматы селi', { year: 1921, trigger: 'Rain and melt', approx: true, note: 'A destructive mudflow affected the Kishi Almaty valley; the point is an approximate map location.', sourceLinks: [{ label: 'Almaty mudflow hazard assessment (2020)', url: 'https://doi.org/10.21467/abstracts.93.3' }, { label: 'Archival study of the 1921 disaster', url: 'https://bulletinofscience.kazatu.edu.kz/index.php/bulletinofscience/article/view/152' }] }),
  mk('mudflow', 'mf-1963-issyk', '1963 Issyk (Esik) lake outburst mudflow', 'Прорыв озера Иссык и сель 1963 года', 43.21, 77.47, 'Almaty', 'B', '1963 жылғы Есік көлі бұзылуынан болған сел', { year: 1963, trigger: 'Moraine-dammed lake outburst', approx: true, note: 'A debris flow in the upper Zharsay River triggered the outburst of Issyk Lake; the mapped point is approximate.', sourceLinks: [{ label: 'Kazhydromet research on natural debris flows in Kazakhstan', url: 'https://www.kazhydromet.kz/uploads/files/2050/file/6981a8ee0ac30natural-debris-flows-and-field-experiment-in-kazakhstan.pdf' }] }),
  mk('mudflow', 'mf-1973-kishi-almaty', '1973 Kishi Almaty mudflow', 'Сель в долине Малой Алматинки 1973 года', 43.16, 77.06, 'Almaty city', 'B', '1973 жылғы Кіші Алматы селi', { year: 1973, trigger: 'Rain and melt', approx: true, note: 'A major mudflow entered the Medeu mudflow-control structures on 15 July 1973; the mapped point is approximate.', sourceLinks: [{ label: 'Kazhydromet overview of mudflows', url: 'https://www.kazhydromet.kz/en/selevedenie-str/chto-takoe-sel' }, { label: 'Almaty mudflow hazard assessment (2020)', url: 'https://doi.org/10.21467/abstracts.93.3' }] }),
  mk('protection', 'mp-medeu', 'Medeu mudflow protection dam', 'Селезащитная плотина Медео', 43.157, 77.059, 'Almaty city', 'B', 'Медеу селден қорғау бөгеті', { note: 'A large mudflow-protection dam in Medeu Gorge, constructed between 1966 and 1972. The mapped point is approximate.', sourceLinks: [{ label: 'UNESCO tentative-list description of Medeu protection structures', url: 'https://whc.unesco.org/en/tentativelists/6914/' }] }),
];

import generated from './places.imported.json';
export const PLACES: Place[] = [...CURATED, ...(generated as unknown as Place[]).filter((p) => !CURATED.some((c) => c.id === p.id))];
export const REGIONS = Array.from(new Set(PLACES.map((p) => p.region))).sort();

export const nameOf = (p: Place, lang: Lang) => p.name[lang] || p.name.en;
export const regionOf = (region: string, lang: Lang) => localRegion(region, lang);
export const triggerOf = (trigger: string, lang: Lang) => t(lang, trigger);
export const noteOf = (id: string, fallback: string, lang: Lang) => t(lang, id === 'ls-kaindy' ? 'The lake is landslide-dammed. Published studies disagree about whether its dam formed in 1889 or 1911; the date is not assigned here.' : fallback);
export const detailText = (p: Place) =>
  [p.year ? String(p.year) : '', p.magnitude ? `M ${p.magnitude}` : ''].filter(Boolean).join(' · ');

export const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'name', label: 'Name A–Z' },
] as const;
export type SortId = (typeof SORTS)[number]['id'];
export function sortPlaces(list: Place[], sort: SortId, lang: Lang): Place[] {
  const arr = [...list];
  if (sort === 'name') return arr.sort((a, b) => nameOf(a, lang).localeCompare(nameOf(b, lang), lang));
  const dir = sort === 'newest' ? -1 : 1;
  return arr.sort((a, b) => ((a.year ?? 0) - (b.year ?? 0)) * dir || nameOf(a, lang).localeCompare(nameOf(b, lang), lang));
}
export function placeProps(p: Place, lang: Lang) {
  return {
    id: p.id, type: p.type, typeLabel: TYPE_META[p.type].label, name: nameOf(p, lang), region: p.region,
    verification: p.verification, year: p.year ?? 0, magnitude: p.magnitude ?? 0, trigger: p.trigger ?? '',
    note: p.note ?? '', source: p.source, sourceLinks: p.sourceLinks ?? [], approx: p.approx ? 1 : 0,
    locationAccuracy: p.locationAccuracy ?? '', fatalities: p.fatalities ?? null, injuries: p.injuries ?? null, catalog: p.catalog ?? '',
    r: p.type === 'quake' ? 5 + ((p.magnitude ?? 6) - 6) * 3 : 7,
  };
}
export function placesToGeoJSON(places: Place[], lang: Lang): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: placeProps(p, lang) })),
  };
}
