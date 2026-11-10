import type { Lang, Place, PlaceType, Verification } from './types';
import { localRegion, t } from './i18n';

const TYPE_EN: Record<PlaceType, { label: string; plural: string; color: string }> = {
  landslide: { label: 'Landslide or rockslide', plural: 'Landslides and rockslides', color: '#b5562a' },
  mudflow: { label: 'Mudflow or debris flow', plural: 'Mudflows and debris flows', color: '#7a5a8c' },
  glacial: { label: 'Glacial or dammed lake', plural: 'Glacial and dammed lakes', color: '#2f8a9a' },
  quake: { label: 'Historic earthquake', plural: 'Historic earthquakes', color: '#b8322a' },
  protection: { label: 'Mitigation structure', plural: 'Mitigation structures', color: '#4a5560' },
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
  mk('quake', 'eq-1887-verny', '1887 Verny earthquake', 'Верненское землетрясение 1887 года', 43.2, 76.9, 'Almaty city', 'C', '1887 жылғы Верный жер сілкінісі', { year: 1887, date: '1887-06-09', magnitude: 7.3, magnitudeText: 'M 7.3–7.7', approx: true, trigger: 'Tectonic', note: 'Destroyed much of Verny (now Almaty). Catalogues list about M 7.3; a 2018 reanalysis of magnetogram recordings estimates Mw 7.7 ± 0.17. The epicentre is a historical estimate.', sourceLinks: [{ label: 'Krüger, Kulikova & Landgraf (2018), Geophys. J. Int. 215, 1824–1840', url: 'https://doi.org/10.1093/gji/ggy377' }] }),
  mk('quake', 'eq-1889-chilik', '1889 Chilik earthquake', 'Чиликское землетрясение 1889 года', 43.2, 78.7, 'Almaty', 'C', '1889 жылғы Шелек жер сілкінісі', { year: 1889, date: '1889-07-11', magnitude: 7.9, magnitudeText: 'M 7.9–8.3', approx: true, trigger: 'Tectonic', note: 'One of the largest historical earthquakes in the northern Tien Shan. Older catalogues list about M 8.3; a 2018 reanalysis of magnetogram recordings estimates Mw 7.9 ± 0.13. The epicentre is a historical estimate.', sourceLinks: [{ label: 'Krüger, Kulikova & Landgraf (2018), Geophys. J. Int. 215, 1824–1840', url: 'https://doi.org/10.1093/gji/ggy377' }] }),
  mk('quake', 'eq-1911-kebin', '1911 Kebin (Chon-Kemin) earthquake', 'Кеминское землетрясение 1911 года', 42.9, 77.3, 'Kyrgyzstan (border area)', 'C', '1911 жылғы Кебін (Кемін) жер сілкінісі', { year: 1911, date: '1911-01-03', magnitude: 8.0, magnitudeText: 'M 7.8–8.2', approx: true, trigger: 'Tectonic', note: 'The mapped epicentre lies in the Chon-Kemin valley of Kyrgyzstan, just south of the Kazakhstan border; the earthquake caused heavy damage in Verny (now Almaty) and triggered large rockslides. A 2015 study of analogue seismograms gives M 8.0; other published estimates range from about 7.8 to 8.2.', sourceLinks: [{ label: 'Kulikova & Krüger (2015), Geophys. J. Int. 201, 1891–1911', url: 'https://doi.org/10.1093/gji/ggv091' }, { label: 'Landslides and surface breaks of the 1911 Kemin earthquake', url: 'https://repository.geologyscience.ru/items/18b5c601-4a78-4c17-8d25-1750fdb19030' }] }),
  mk('landslide', 'ls-kaindy', 'Lake Kaindy landslide dam', 'Озеро Каинды (завальное)', 42.99, 78.47, 'Almaty', 'C', 'Қайыңды көлінің көшкін бөгеті', { approx: true, note: 'The lake is landslide-dammed. Published studies disagree about whether its dam formed in 1889 or 1911; the date is not assigned here.', sourceLinks: [{ label: 'Akkemik et al. (2022), Turkish J. Earth Sci.: tree rings support formation in 1911', url: 'https://doi.org/10.55730/1300-0985.1823' }, { label: 'Miramont et al. (2024): tree rings point to the 1889 Chilik earthquake', url: 'https://www.echosciences-paca.fr/uploads/attachment/attached_file/23346119/article_Kaindy_miramont_et_al_2024.pdf' }] }),
  mk('mudflow', 'mf-1921-almaty', '1921 Almaty mudflow', 'Алма-Атинский сель 1921 года', 43.24, 76.95, 'Almaty city', 'B', '1921 жылғы Алматы селi', { year: 1921, date: '1921-07-08', trigger: 'Rain and melt', approx: true, note: 'A destructive mudflow affected the Kishi Almaty valley; the point is an approximate map location.', sourceLinks: [{ label: 'Almaty mudflow hazard assessment (2020)', url: 'https://doi.org/10.21467/abstracts.93.3' }, { label: 'Archival study of the 1921 disaster', url: 'https://bulletinofscience.kazatu.edu.kz/index.php/bulletinofscience/article/view/152' }] }),
  mk('mudflow', 'mf-1963-issyk', '1963 Issyk (Esik) lake outburst mudflow', 'Прорыв озера Иссык и сель 1963 года', 43.253, 77.485, 'Almaty', 'B', '1963 жылғы Есік көлі бұзылуынан болған сел', { year: 1963, date: '1963-07-07', trigger: 'Moraine-dammed lake outburst', approx: true, note: 'A debris flow in the upper Zharsay River triggered the outburst of Issyk Lake; the point marks the lake, not the source of the flow.', sourceLinks: [{ label: 'Kazhydromet research on natural debris flows in Kazakhstan', url: 'https://www.kazhydromet.kz/uploads/files/2050/file/6981a8ee0ac30natural-debris-flows-and-field-experiment-in-kazakhstan.pdf' }] }),
  mk('mudflow', 'mf-1973-kishi-almaty', '1973 Kishi Almaty mudflow', 'Сель в долине Малой Алматинки 1973 года', 43.16, 77.06, 'Almaty city', 'B', '1973 жылғы Кіші Алматы селi', { year: 1973, date: '1973-07-15', trigger: 'Rain and melt', approx: true, note: 'A major mudflow entered the Medeu mudflow-control structures on 15 July 1973; the mapped point is approximate.', sourceLinks: [{ label: 'Kazhydromet overview of mudflows', url: 'https://www.kazhydromet.kz/en/selevedenie-str/chto-takoe-sel' }, { label: 'Almaty mudflow hazard assessment (2020)', url: 'https://doi.org/10.21467/abstracts.93.3' }] }),
  mk('protection', 'mp-medeu', 'Medeu mudflow protection dam', 'Селезащитная плотина Медео', 43.157, 77.059, 'Almaty city', 'B', 'Медеу селден қорғау бөгеті', { note: 'A large mudflow-protection dam in Medeu Gorge, constructed between 1966 and 1972. The mapped point is approximate.', sourceLinks: [{ label: 'UNESCO tentative-list description of Medeu protection structures', url: 'https://whc.unesco.org/en/tentativelists/6914/' }] }),
];

import generated from './places.imported.json';
export const PLACES: Place[] = [...CURATED, ...(generated as unknown as Place[]).filter((p) => !CURATED.some((c) => c.id === p.id))];
export const REGIONS = Array.from(new Set(PLACES.map((p) => p.region))).sort();

export const nameOf = (p: Place, lang: Lang) => p.name[lang] || p.name.en;
export const regionOf = (region: string, lang: Lang) => localRegion(region, lang);
export const triggerOf = (trigger: string, lang: Lang) => t(lang, trigger);
export const noteOf = (id: string, fallback: string, lang: Lang) => t(lang, fallback);
export const detailText = (p: Place) =>
  [p.year ? String(p.year) : '', p.magnitudeText ?? (p.magnitude ? `M ${p.magnitude}` : '')].filter(Boolean).join(' · ');

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
    verification: p.verification, year: p.year ?? 0, magnitude: p.magnitude ?? 0, magnitudeText: p.magnitudeText ?? '', date: p.date ?? '', lat: p.lat, lon: p.lon, trigger: p.trigger ?? '',
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
