'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MLMap } from 'maplibre-gl';
import { getBasemapStyle, type BasemapId } from '@/lib/basemaps';
import { noteOf, placeProps, placesToGeoJSON, PLACES, regionOf, triggerOf, typeLabel, TYPE_META } from '@/lib/events';
import { haversineKm, segments, type LL } from '@/lib/geo';
import { FAULT_COLORS, type LayerId } from '@/lib/layers';
import { contourTiles, DEM_TILES, onDemUnavailable, registerTerrainProtocols, setFaultLines, suscTiles, terrainInspect, type SuscParams } from '@/lib/terrain';
import { EMPTY_FC, type FC, type Lang, type Place, type Report, type SiteWatch } from '@/lib/types';
import { formatNumber, localCity, localName, localQuakePlace, t } from '@/lib/i18n';

export interface Geo { regions: FC; rivers: FC; lakes: FC; border: FC; mask: FC; faults: FC; cities: FC }
export interface View { lng: number; lat: number; z: number; pitch: number; bearing: number }
export interface MapApi {
  capture: () => string | null;
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  flyToLandmark: (view: { center: [number, number]; zoom: number; pitch: number; bearing: number }) => void;
  fitKazakhstan: () => void;
  startFlyover: (path: LL[]) => void;
  stopFlyover: () => void;
}
export type Tool = null | 'report' | 'profile' | 'weather';

interface Props {
  visible: boolean; resizeKey: boolean; basemap: BasemapId; dark: boolean; focus: boolean; layers: Set<LayerId>; places: Place[]; lang: Lang;
  selectedId: string | null; onSelect: (id: string | null) => void; geo: Geo; quakes: FC; sites: SiteWatch[] | null;
  reports: Report[]; susc: SuscParams; terrain3d: boolean; tool: Tool; onMapClick: (lng: number, lat: number) => void;
  profilePath: LL[]; draft: LL | null; initialView: View | null; onMove: (v: View) => void; onNotice: (m: string) => void;
  apiRef: { current: MapApi | null };
  sunAngle?: number;
}
interface PopupTarget { layer: string; properties: Record<string, any>; coordinates: [number, number] }

const LAYER_MAP: Record<LayerId, string[]> = {
  faults: ['faults-in', 'faults-out', 'faults-hit'], folds: ['folds-line'], quakes: ['quakes-circle'], hillshade: ['hillshade'],
  contours: ['contours'], slope: ['slope'], susc: ['susc'], triggers: ['triggers-halo', 'triggers-circle'], cities: ['cities-circle'],
  rivers: ['rivers-line'], lakes: ['lakes-fill', 'lakes-line'], regions: ['regions-line'], reports: ['reports-circle'],
};
const INTERACTIVE = ['places-circle', 'reports-circle', 'quakes-circle', 'triggers-circle', 'cities-circle', 'faults-hit'];
const TYPE_COLORS = Object.entries(TYPE_META).flatMap(([k, v]) => [k, v.color]);
const CAT_LABEL: Record<string, string> = { landslide: 'Landslide', mudflow: 'Mudflow', rockfall: 'Rockfall', cracks: 'Ground cracks', drainage: 'Blocked drainage', other: 'Other' };
const BASE_LABEL_FIELDS = new WeakMap<MLMap, Map<string, unknown>>();
const MAP_LABELS: Record<string, { ru: string; kk: string }> = {
  Kazakhstan: { ru: 'Казахстан', kk: 'Қазақстан' }, Russia: { ru: 'Россия', kk: 'Ресей' }, China: { ru: 'Китай', kk: 'Қытай' },
  Uzbekistan: { ru: 'Узбекистан', kk: 'Өзбекстан' }, Kyrgyzstan: { ru: 'Киргизия', kk: 'Қырғызстан' }, Tajikistan: { ru: 'Таджикистан', kk: 'Тәжікстан' },
  Turkmenistan: { ru: 'Туркменистан', kk: 'Түрікменстан' }, Mongolia: { ru: 'Монголия', kk: 'Моңғолия' }, Afghanistan: { ru: 'Афганистан', kk: 'Ауғанстан' },
  Almaty: { ru: 'Алматы', kk: 'Алматы' }, Astana: { ru: 'Астана', kk: 'Астана' }, Bishkek: { ru: 'Бишкек', kk: 'Бішкек' },
  Tashkent: { ru: 'Ташкент', kk: 'Ташкент' }, Dushanbe: { ru: 'Душанбе', kk: 'Душанбе' }, Shymkent: { ru: 'Шымкент', kk: 'Шымкент' },
};

function localizedNameExpression(lang: Lang) {
  const original = ['coalesce', ['get', `name:${lang}`], ['get', 'name:latin'], ['get', 'name']];
  if (lang === 'en') return original;
  const matches = Object.entries(MAP_LABELS).flatMap(([en, localized]) => [en, localized[lang]]);
  return ['match', original, ...matches, original];
}

function usesNameField(field: unknown): boolean {
  if (typeof field === 'string') return /\{name(?::[^}]+)?\}/.test(field);
  if (!Array.isArray(field)) return false;
  if (field[0] === 'get' && typeof field[1] === 'string' && /^name(?::|$)/.test(field[1])) return true;
  return field.some(usesNameField);
}

function applyBasemapLanguage(map: MLMap, lang: Lang, capture = false) {
  if (capture || !BASE_LABEL_FIELDS.has(map)) {
    const fields = new Map<string, unknown>();
    for (const layer of map.getStyle().layers ?? []) {
      if (layer.type !== 'symbol') continue;
      const field = map.getLayoutProperty(layer.id, 'text-field');
      if (field != null) fields.set(layer.id, field);
    }
    BASE_LABEL_FIELDS.set(map, fields);
  }
  for (const [id, field] of BASE_LABEL_FIELDS.get(map) ?? []) {
    // Some basemap labels contain both Latin and local names in one formatted
    // string. Replacing each name expression separately duplicated the label.
    if (map.getLayer(id) && usesNameField(field)) map.setLayoutProperty(id, 'text-field', localizedNameExpression(lang) as any);
  }
}

function localizeMapControls(map: MLMap, lang: Lang) {
  map.getContainer().setAttribute('aria-label', t(lang, 'Map'));
  const labels: Record<string, string> = {
    '.maplibregl-ctrl-zoom-in': t(lang, 'Zoom in'),
    '.maplibregl-ctrl-zoom-out': t(lang, 'Zoom out'),
    '.maplibregl-ctrl-compass': t(lang, 'Reset bearing to north'),
    '.maplibregl-ctrl-attrib-button': t(lang, 'Toggle map attribution'),
  };
  for (const [selector, label] of Object.entries(labels)) {
    map.getContainer().querySelectorAll<HTMLButtonElement>(selector).forEach((button) => { button.title = label; button.setAttribute('aria-label', label); });
  }
}

function localizePopupClose(map: MLMap, lang: Lang) {
  const button = map.getContainer().querySelector<HTMLButtonElement>('.maplibregl-popup-close-button');
  if (button) { button.title = t(lang, 'Close'); button.setAttribute('aria-label', t(lang, 'Close')); }
}

function el(tag: string, text?: string, cls?: string): HTMLElement {
  const n = document.createElement(tag);
  if (text != null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}
function row(root: HTMLElement, k: string, v: string | number | undefined | null, lang: Lang) {
  if (v === undefined || v === null || v === '' || v === 'null') return;
  const r = el('div', undefined, 'popup-row');
  r.append(el('span', t(lang, k)), el('b', String(v)));
  root.append(r);
}

function popupEl(layer: string, p: Record<string, any>, lang: Lang): HTMLElement {
  const root = el('div', undefined, 'popup');
  if (layer === 'places-circle') {
    root.append(el('strong', p.name), el('div', `${typeLabel(p.type, lang)} · ${regionOf(String(p.region ?? ''), lang)}`, 'popup-sub'));
    row(root, 'Year', p.year ? p.year : null, lang); row(root, 'Magnitude', p.magnitude ? `M ${p.magnitude}` : '', lang); row(root, 'Trigger', p.trigger ? triggerOf(p.trigger, lang) : '', lang);
    row(root, 'Verification', p.verification + (p.approx ? ` (${t(lang, 'location approximate')})` : ''), lang);
    row(root, 'Catalogue', p.catalog, lang);
    row(root, 'Reported location accuracy', p.locationAccuracy ? String(p.locationAccuracy).replace(/km$/i, ' km') : '', lang);
    row(root, 'Reported fatalities', p.fatalities, lang);
    row(root, 'Reported injuries', p.injuries, lang);
    if (p.note) root.append(el('p', noteOf(String(p.id), String(p.note), lang)));
    const source = el('div', undefined, 'popup-src');
    source.append(document.createTextNode(`${t(lang, 'Source:')} ${t(lang, String(p.source ?? 'Published reference'))}`));
    for (const citation of (Array.isArray(p.sourceLinks) ? p.sourceLinks : []) as { label: string; url: string }[]) {
      const link = el('a', citation.label) as HTMLAnchorElement;
      link.href = citation.url; link.target = '_blank'; link.rel = 'noreferrer'; link.className = 'popup-source-link';
      source.append(document.createElement('br'), link);
    }
    root.append(source);
  } else if (layer === 'quakes-circle') {
    root.append(el('strong', t(lang, 'M {magnitude} earthquake', { magnitude: Number(p.mag).toFixed(1) })), el('div', localQuakePlace(String(p.place || ''), lang), 'popup-sub'));
    row(root, 'Date', new Date(Number(p.time)).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-CA'), lang); row(root, 'Depth', p.depth == null ? null : `${Number(p.depth).toFixed(0)} km`, lang);
    row(root, 'Region', p.region ? regionOf(String(p.region), lang) : (Number(p.inside) ? '' : t(lang, 'Outside the border')), lang);
    root.append(el('div', `${t(lang, 'Source:')} USGS ComCat`, 'popup-src'));
  } else if (layer === 'faults-hit') {
    root.append(el('strong', t(lang, p.slip === 'Anticline' || p.slip === 'Syncline' ? p.slipLabel : `${p.slipLabel} fault`)));
    row(root, 'Net slip rate', p.rate != null ? `${p.rate} mm/yr${p.rateRange ? ` (${t(lang, 'range')} ${p.rateRange})` : ''}` : '', lang);
    row(root, 'Dip', p.dip != null ? `${p.dip}°` : '', lang); row(root, 'Seismogenic depth', p.upperDepth != null && p.lowerDepth != null ? `${p.upperDepth}–${p.lowerDepth} km` : '', lang);
    row(root, 'Catalogue', p.catalog, lang); row(root, 'Quality (1 best)', p.quality, lang);
    root.append(el('div', `${t(lang, 'Source:')} GEM Global Active Faults database. ${t(lang, 'Fault map is incomplete: some well-known Almaty-area faults are missing.')}`, 'popup-src'));
  } else if (layer === 'cities-circle') {
    root.append(el('strong', localCity(String(p.name), lang)), el('div', regionOf(String(p.region || ''), lang), 'popup-sub'));
    row(root, 'Population (Natural Earth)', formatNumber(lang, Number(p.pop)), lang);
    row(root, 'Nearest mapped active fault', p.faultKm == null ? null : `${p.faultKm} km`, lang);
    root.append(el('div', t(lang, 'Fault distance uses an incomplete fault map; a large distance does not mean no hazard.'), 'popup-src'));
  } else if (layer === 'triggers-circle') {
    root.append(el('strong', localName(String(p.name), lang)), el('div', `${t(lang, 'Rain screening:')} ${t(lang, String(p.level))}`, 'popup-sub'));
    row(root, 'Rain, last 3 days', p.rainPast3 == null ? null : `${Number(p.rainPast3).toFixed(0)} mm`, lang); row(root, 'Rain, last 7 days', p.rainPast7 == null ? null : `${Number(p.rainPast7).toFixed(0)} mm`, lang);
    row(root, 'Rain, next 3 days', p.rainNext3 == null ? null : `${Number(p.rainNext3).toFixed(0)} mm`, lang); row(root, 'Snowfall, last 7 days', p.snowPast7 == null ? null : `${Number(p.snowPast7).toFixed(0)} cm`, lang);
    row(root, 'Melt flag', p.tmax == null ? t(lang, 'No data') : p.melt ? t(lang, 'Warm after snow') : '–', lang);
    root.append(el('div', t(lang, 'Heuristic screening from Open-Meteo. Not an official warning.'), 'popup-src'));
  } else if (layer === 'reports-circle') {
    root.append(el('strong', t(lang, CAT_LABEL[p.category] ?? 'Report')), el('div', `${String(p.createdAt).slice(0, 10)} · ${t(lang, 'Verification').toLowerCase()} ${p.verification}`, 'popup-sub'));
    root.append(el('p', p.description));
    if (p.photo) { const img = document.createElement('img'); const srcStr = String(p.photo); img.src = srcStr.startsWith('data:') ? srcStr : `/api/uploads/${srcStr}`; img.alt = t(lang, 'Photo submitted with the report'); img.loading = 'lazy'; img.className = 'popup-img'; root.append(img); }
    root.append(el('div', t(lang, 'Community report. Unverified unless marked A or B by a moderator.'), 'popup-src'));
  }
  return root;
}

const reportsFC = (r: Report[]): FC => ({
  type: 'FeatureCollection',
  features: r.map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lon, x.lat] }, properties: { id: x.id, category: x.category, description: x.description, createdAt: x.createdAt, photo: x.photo ?? '', verification: x.verification } })),
});
const sitesFC = (s: SiteWatch[] | null): FC => ({
  type: 'FeatureCollection',
  features: (s ?? []).map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lon, x.lat] }, properties: { name: x.name, level: x.level, rainPast3: x.rainPast3, rainPast7: x.rainPast7, rainNext3: x.rainNext3, snowPast7: x.snowPast7, tmax: x.tmax, melt: x.melt } })),
});
const pt = (c: LL | null): FC => ({ type: 'FeatureCollection', features: c ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} }] : [] });
const profileFC = (p: LL[]): FC => ({
  type: 'FeatureCollection',
  features: [
    ...(p.length > 1 ? [{ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: p }, properties: {} }] : []),
    ...p.map((c) => ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: c }, properties: {} })),
  ],
});

interface HudState {
  lat: number;
  lng: number;
  elevation: number | null;
  slope: number | null;
}

function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? `${lat.toFixed(3)}° N` : `${Math.abs(lat).toFixed(3)}° S`;
  const ew = lng >= 0 ? `${lng.toFixed(3)}° E` : `${Math.abs(lng).toFixed(3)}° W`;
  return `${ns}, ${ew}`;
}

export function getLightingStyle(angle: number, dark: boolean) {
  const a = ((angle % 360) + 360) % 360;
  if (dark) {
    return {
      illuminationDirection: a,
      shadowColor: 'rgba(0, 0, 0, 0.70)',
      highlightColor: 'rgba(180, 220, 255, 0.08)',
      accentColor: 'rgba(0, 0, 0, 0.45)',
      sky: {
        'sky-color': '#050c14',
        'horizon-color': '#0c1824',
        'fog-color': '#09121b',
        'fog-ground-blend': 0.35,
        'horizon-fog-blend': 0.8,
        'sky-horizon-blend': 0.8,
        'atmosphere-blend': 0.85,
      },
    };
  }
  // Dawn (60° - 140°)
  if (a >= 60 && a < 140) {
    return {
      illuminationDirection: a,
      shadowColor: 'rgba(40, 30, 60, 0.42)',
      highlightColor: 'rgba(255, 230, 200, 0.15)',
      accentColor: 'rgba(70, 30, 50, 0.15)',
      sky: {
        'sky-color': '#6366f1',
        'horizon-color': '#f472b6',
        'fog-color': '#fbcfe8',
        'fog-ground-blend': 0.5,
        'horizon-fog-blend': 0.8,
        'sky-horizon-blend': 0.8,
        'atmosphere-blend': 0.75,
      },
    };
  }
  // Noon (140° - 220°)
  if (a >= 140 && a < 220) {
    return {
      illuminationDirection: a,
      shadowColor: 'rgba(20, 30, 44, 0.32)',
      highlightColor: 'rgba(255, 255, 255, 0.08)',
      accentColor: 'rgba(15, 23, 42, 0.10)',
      sky: {
        'sky-color': '#60a5fa',
        'horizon-color': '#bfdbfe',
        'fog-color': '#e0f2fe',
        'fog-ground-blend': 0.4,
        'horizon-fog-blend': 0.8,
        'sky-horizon-blend': 0.8,
        'atmosphere-blend': 0.65,
      },
    };
  }
  // Sunset / Alpenglow (240° - 300°)
  if (a >= 240 && a < 300) {
    return {
      illuminationDirection: a,
      shadowColor: 'rgba(30, 15, 45, 0.50)',
      highlightColor: 'rgba(255, 180, 120, 0.22)',
      accentColor: 'rgba(90, 20, 40, 0.20)',
      sky: {
        'sky-color': '#312e81',
        'horizon-color': '#e11d48',
        'fog-color': '#fda4af',
        'fog-ground-blend': 0.55,
        'horizon-fog-blend': 0.85,
        'sky-horizon-blend': 0.85,
        'atmosphere-blend': 0.8,
      },
    };
  }
  // Default Afternoon (315°)
  return {
    illuminationDirection: a,
    shadowColor: 'rgba(24, 34, 50, 0.35)',
    highlightColor: 'rgba(255, 255, 255, 0.05)',
    accentColor: 'rgba(15, 23, 42, 0.10)',
    sky: {
      'sky-color': '#8cb8e6',
      'horizon-color': '#e2ecf7',
      'fog-color': '#edf3fa',
      'fog-ground-blend': 0.45,
      'horizon-fog-blend': 0.8,
      'sky-horizon-blend': 0.8,
      'atmosphere-blend': 0.7,
    },
  };
}

export default function MapView(props: Props) {
  const [mapLoading, setMapLoading] = useState(true);
  const [hud, setHud] = useState<HudState | null>(null);
  const [flyoverState, setFlyoverProgress] = useState<{ step: number; total: number; km: number; paused: boolean } | null>(null);
  const flyoverActiveRef = useRef(false);
  const flyoverPausedRef = useRef(false);
  const flyoverTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const P = useRef(props);
  P.current = props;
  const ready = useRef(false);
  const applied = useRef<Record<string, unknown>>({});
  const popup = useRef<maplibregl.Popup | null>(null);
  const popupTarget = useRef<PopupTarget | null>(null);
  const currentBase = useRef<BasemapId>(props.basemap);
  const currentDark = useRef<boolean>(props.dark);
  const currentSunAngle = useRef<number>(props.sunAngle ?? 315);
  const suscVersion = useRef(0);
  const lastTerrain = useRef<boolean | null>(null);
  const lastTerrainDark = useRef<boolean | null>(null);
  const lastSunAngle = useRef<number | null | undefined>(null);
  const terrainCameraApplied = useRef(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopFlyover = useCallback(() => {
    flyoverActiveRef.current = false;
    flyoverPausedRef.current = false;
    flyoverTimeouts.current.forEach(clearTimeout);
    flyoverTimeouts.current = [];
    setFlyoverProgress(null);
  }, []);

  const togglePauseFlyover = useCallback(() => {
    if (!flyoverActiveRef.current) return;
    flyoverPausedRef.current = !flyoverPausedRef.current;
    setFlyoverProgress((p) => (p ? { ...p, paused: flyoverPausedRef.current } : null));
  }, []);

  const startFlyover = useCallback((path: LL[]) => {
    const map = mapRef.current;
    if (!map || path.length < 2) return;
    stopFlyover();

    try {
      map.setTerrain({ source: 'dem', exaggeration: 1.15 });
    } catch { /* ignore */ }

    // Interpolate points for smooth cinematic drone movement
    const dense: LL[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i], p2 = path[i + 1];
      dense.push(p1);
      const d = haversineKm(p1, p2);
      const steps = Math.max(1, Math.min(6, Math.round(d / 0.8)));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        dense.push([p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t]);
      }
    }
    dense.push(path[path.length - 1]);

    flyoverActiveRef.current = true;
    flyoverPausedRef.current = false;
    setFlyoverProgress({ step: 1, total: dense.length, km: 0, paused: false });

    let currentIdx = 0;
    let distAcc = 0;

    const flyStep = () => {
      if (!flyoverActiveRef.current || mapRef.current !== map) return;
      if (flyoverPausedRef.current) {
        const t = setTimeout(flyStep, 350);
        flyoverTimeouts.current.push(t);
        return;
      }
      if (currentIdx >= dense.length) {
        stopFlyover();
        return;
      }

      const cur = dense[currentIdx];
      const next = dense[Math.min(dense.length - 1, currentIdx + 1)];
      const cosLat = Math.cos((cur[1] * Math.PI) / 180);
      const dLng = (next[0] - cur[0]) * cosLat;
      const dLat = next[1] - cur[1];
      const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;

      if (currentIdx > 0) {
        distAcc += haversineKm(dense[currentIdx - 1], cur);
      }

      setFlyoverProgress({ step: currentIdx + 1, total: dense.length, km: distAcc, paused: false });

      map.easeTo({
        center: cur,
        zoom: 12.8,
        pitch: 58,
        bearing: currentIdx === dense.length - 1 ? map.getBearing() : bearing,
        duration: 1750,
        easing: (t) => t,
        essential: true,
      });

      currentIdx++;
      const nextTimer = setTimeout(flyStep, 1700);
      flyoverTimeouts.current.push(nextTimer);
    };

    flyStep();
  }, [stopFlyover]);

  const applyTerrainCamera = (map: MLMap) => {
    const focusMountains = map.getZoom() < 5.5;
    map.easeTo({
      ...(focusMountains ? { center: [77.2, 43.1] as [number, number], zoom: 6.2, bearing: -12 } : {}),
      pitch: 48,
      duration: 1100,
      essential: true,
    });
    terrainCameraApplied.current = true;
  };

  const sync = useRef(() => {});
  sync.current = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const p = P.current;
    try {
    const addSource = (id: string, spec: any) => { if (!map.getSource(id)) map.addSource(id, spec); };
    const addLayer = (spec: any) => { if (!map.getLayer(spec.id)) map.addLayer({ ...spec, layout: { visibility: 'none', ...(spec.layout ?? {}) } }); };
    const geo = (id: string, data: FC) => {
      addSource(id, { type: 'geojson', data });
      if (applied.current[id] !== data) { (map.getSource(id) as GeoJSONSource).setData(data as any); applied.current[id] = data; }
    };

    // terrain-derived rasters
    addSource('dem', { type: 'raster-dem', tiles: DEM_TILES, tileSize: 256, maxzoom: 14, encoding: 'terrarium', attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">AWS Terrain Tiles</a> (Tilezen/Mapzen; SRTM, GMTED and other DEM sources)' });
    const isTerrainBase = p.basemap === 'terrain';
    const angle = p.sunAngle ?? 315;
    const lighting = getLightingStyle(angle, p.dark);
    const hillshadeExaggeration = isTerrainBase
      ? (p.terrain3d ? 0.20 : 0.26)
      : (p.terrain3d ? 0.35 : 0.48);

    addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: {
      'hillshade-exaggeration': hillshadeExaggeration,
      'hillshade-illumination-direction': lighting.illuminationDirection,
      'hillshade-shadow-color': lighting.shadowColor,
      'hillshade-highlight-color': lighting.highlightColor,
      'hillshade-accent-color': lighting.accentColor,
    } });
    if (map.getLayer('hillshade')) {
      map.setPaintProperty('hillshade', 'hillshade-exaggeration', hillshadeExaggeration);
      map.setPaintProperty('hillshade', 'hillshade-illumination-direction', lighting.illuminationDirection);
      map.setPaintProperty('hillshade', 'hillshade-shadow-color', lighting.shadowColor);
      map.setPaintProperty('hillshade', 'hillshade-highlight-color', lighting.highlightColor);
      map.setPaintProperty('hillshade', 'hillshade-accent-color', lighting.accentColor);
    }

    addSource('contours', { type: 'raster', tiles: [contourTiles(p.dark)], tileSize: 256, minzoom: 5, maxzoom: 13 });
    addLayer({ id: 'contours', type: 'raster', source: 'contours', paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 150, 'raster-resampling': 'linear' } });
    addSource('slope', { type: 'raster', tiles: ['slope://{z}/{x}/{y}'], tileSize: 256, minzoom: 5, maxzoom: 12 });
    addLayer({ id: 'slope', type: 'raster', source: 'slope', paint: { 'raster-opacity': 0.85, 'raster-fade-duration': 150 } });
    addSource('susc', { type: 'raster', tiles: [suscTiles(p.susc, suscVersion.current)], tileSize: 256, minzoom: 5, maxzoom: 12 });
    addLayer({ id: 'susc', type: 'raster', source: 'susc', paint: { 'raster-opacity': 0.9, 'raster-fade-duration': 150 } });

    // focus mask
    geo('mask', p.geo.mask);
    addLayer({ id: 'focus-mask', type: 'fill', source: 'mask', paint: { 'fill-color': p.dark ? '#070d13' : '#e7eef0', 'fill-opacity': p.dark ? 0.92 : 0.9 } });

    // context vectors
    geo('regions', p.geo.regions);
    addLayer({ id: 'regions-base', type: 'fill', source: 'regions', paint: { 'fill-color': p.dark ? '#111923' : '#f3f6f4' } });
    geo('lakes', p.geo.lakes);
    addLayer({ id: 'lakes-fill', type: 'fill', source: 'lakes', paint: { 'fill-color': p.dark ? '#142c3d' : '#a9d3ee', 'fill-opacity': p.dark ? 0.85 : 0.9 } });
    addLayer({ id: 'lakes-line', type: 'line', source: 'lakes', paint: { 'line-color': p.dark ? '#275270' : '#5aa2cf', 'line-width': 0.8 } });
    geo('rivers', p.geo.rivers);
    addLayer({ id: 'rivers-line', type: 'line', source: 'rivers', paint: { 'line-color': p.dark ? '#2f6892' : '#2d86c4', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 8, 2] } });
    addLayer({ id: 'regions-line', type: 'line', source: 'regions', paint: { 'line-color': p.dark ? '#33485c' : '#6b7c85', 'line-opacity': p.dark ? 0.8 : 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 1.2], 'line-dasharray': [3, 2] } });

    // faults and folds
    geo('faults', p.geo.faults);
    const slipColor: any = ['match', ['get', 'slip'], ['Reverse', 'Dextral-Reverse', 'Sinistral-Reverse'], FAULT_COLORS.reverse, ['Dextral', 'Sinistral'], FAULT_COLORS.strike, ['Normal', 'Dextral-Normal', 'Sinistral-Normal'], FAULT_COLORS.normal, FAULT_COLORS.other];
    const width: any = ['interpolate', ['linear'], ['zoom'], 3, 1.2, 9, ['+', 1.6, ['*', 1.2, ['min', 3, ['coalesce', ['get', 'rate'], 0.5]]]]];
    addLayer({ id: 'folds-line', type: 'line', source: 'faults', filter: ['==', ['get', 'kind'], 'fold'], paint: { 'line-color': p.dark ? '#788a96' : '#9aa7ae', 'line-width': 1, 'line-dasharray': [4, 3], 'line-opacity': 0.8 } });
    addLayer({ id: 'faults-out', type: 'line', source: 'faults', filter: ['all', ['==', ['get', 'kind'], 'fault'], ['==', ['get', 'inside'], false]], layout: { 'line-cap': 'round' }, paint: { 'line-color': slipColor, 'line-width': width, 'line-opacity': 0.55, 'line-dasharray': [3, 2] } });
    addLayer({ id: 'faults-in', type: 'line', source: 'faults', filter: ['all', ['==', ['get', 'kind'], 'fault'], ['==', ['get', 'inside'], true]], layout: { 'line-cap': 'round' }, paint: { 'line-color': slipColor, 'line-width': width } });
    addLayer({ id: 'faults-hit', type: 'line', source: 'faults', paint: { 'line-width': 14, 'line-opacity': 0, 'line-color': '#000' } });

    // cities
    geo('cities', p.geo.cities);
    addLayer({ id: 'cities-circle', type: 'circle', source: 'cities', paint: { 'circle-color': p.dark ? '#e2e8f0' : '#27353c', 'circle-stroke-color': p.dark ? '#0b131e' : '#fff', 'circle-stroke-width': 1.5, 'circle-radius': ['interpolate', ['linear'], ['get', 'pop'], 15000, 3, 100000, 5, 500000, 8, 1200000, 11] } });

    // border always on top of the context layers
    geo('border', p.geo.border);
    addLayer({ id: 'kz-border-casing', type: 'line', source: 'border', layout: { 'line-join': 'round' }, paint: { 'line-color': p.dark ? '#050b12' : '#ffffff', 'line-opacity': p.dark ? 0.95 : 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 7] } });
    addLayer({ id: 'kz-border', type: 'line', source: 'border', layout: { 'line-join': 'round' }, paint: { 'line-color': p.dark ? '#38bdf8' : '#0a3d4f', 'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 8, 3.2] } });

    // event layers
    geo('quakes', p.quakes);
    addLayer({ id: 'quakes-circle', type: 'circle', source: 'quakes', paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 3, 2.5, 5, 6, 7, 16, 8, 24],
      'circle-color': ['case', ['==', ['get', 'depth'], null], '#737f86', ['step', ['get', 'depth'], '#e5384f', 20, '#f08a24', 70, '#e8c21a', 150, '#3b82c4']],
      'circle-opacity': ['case', ['==', ['get', 'inside'], 1], 0.78, 0.4], 'circle-stroke-color': p.dark ? '#0b131e' : '#ffffff', 'circle-stroke-width': 0.7 } });
    geo('triggers', sitesFC(p.sites));
    const lvl: any = ['match', ['get', 'level'], 'elevated', '#c62828', 'watch', '#e0a100', 'nodata', '#9aa5ab', '#2e9d5c'];
    addLayer({ id: 'triggers-halo', type: 'circle', source: 'triggers', paint: { 'circle-radius': 15, 'circle-opacity': 0.25, 'circle-color': lvl } });
    addLayer({ id: 'triggers-circle', type: 'circle', source: 'triggers', paint: { 'circle-radius': 7, 'circle-color': lvl, 'circle-stroke-color': p.dark ? '#0b131e' : '#fff', 'circle-stroke-width': 2 } });
    geo('reports', reportsFC(p.reports));
    addLayer({ id: 'reports-circle', type: 'circle', source: 'reports', paint: { 'circle-radius': 7, 'circle-color': '#27353c', 'circle-stroke-width': 3, 'circle-stroke-color': ['match', ['get', 'verification'], 'A', '#2e9d5c', 'B', '#e0a100', '#c62828'] } });

    // tool layers and places
    geo('profile', profileFC(p.profilePath));
    addLayer({ id: 'profile-line', type: 'line', source: 'profile', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': p.dark ? '#38bdf8' : '#111', 'line-width': 3, 'line-dasharray': [2, 1] } });
    addLayer({ id: 'profile-pts', type: 'circle', source: 'profile', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': p.dark ? '#0f172a' : '#fff', 'circle-stroke-color': p.dark ? '#38bdf8' : '#111', 'circle-stroke-width': 2 } });
    geo('places', placesToGeoJSON(p.places, p.lang));
    addLayer({ id: 'places-circle', type: 'circle', source: 'places', paint: { 'circle-color': ['match', ['get', 'type'], ...TYPE_COLORS, '#888'] as any, 'circle-radius': ['get', 'r'], 'circle-opacity': ['case', ['==', ['get', 'approx'], 1], 0.6, 0.95], 'circle-stroke-color': p.dark ? '#0b131e' : '#fff', 'circle-stroke-width': 1.5 } });
    addLayer({ id: 'places-selected', type: 'circle', source: 'places', filter: ['==', ['get', 'id'], ''], paint: { 'circle-radius': 17, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#f2b705', 'circle-stroke-width': 3 } });
    geo('draft', pt(p.draft));
    addLayer({ id: 'draft-pt', type: 'circle', source: 'draft', paint: { 'circle-radius': 9, 'circle-color': '#f2b705', 'circle-stroke-color': p.dark ? '#0b131e' : '#111', 'circle-stroke-width': 2 } });

    // dynamic update of existing layers if styles were preserved
    if (map.getLayer('focus-mask')) {
      map.setPaintProperty('focus-mask', 'fill-color', p.dark ? '#070d13' : '#e7eef0');
      map.setPaintProperty('focus-mask', 'fill-opacity', p.dark ? 0.92 : 0.9);
    }
    if (map.getLayer('regions-base')) map.setPaintProperty('regions-base', 'fill-color', p.dark ? '#111923' : '#f3f6f4');
    if (map.getLayer('lakes-fill')) map.setPaintProperty('lakes-fill', 'fill-color', p.dark ? '#142c3d' : '#a9d3ee');
    if (map.getLayer('lakes-line')) map.setPaintProperty('lakes-line', 'line-color', p.dark ? '#275270' : '#5aa2cf');
    if (map.getLayer('rivers-line')) map.setPaintProperty('rivers-line', 'line-color', p.dark ? '#2f6892' : '#2d86c4');
    if (map.getLayer('regions-line')) map.setPaintProperty('regions-line', 'line-color', p.dark ? '#33485c' : '#6b7c85');
    if (map.getLayer('kz-border-casing')) map.setPaintProperty('kz-border-casing', 'line-color', p.dark ? '#050b12' : '#ffffff');
    if (map.getLayer('kz-border')) map.setPaintProperty('kz-border', 'line-color', p.dark ? '#38bdf8' : '#0a3d4f');
    if (map.getLayer('cities-circle')) {
      map.setPaintProperty('cities-circle', 'circle-color', p.dark ? '#e2e8f0' : '#27353c');
      map.setPaintProperty('cities-circle', 'circle-stroke-color', p.dark ? '#0b131e' : '#ffffff');
    }
    if (map.getLayer('profile-line')) map.setPaintProperty('profile-line', 'line-color', p.dark ? '#38bdf8' : '#111');
    if (map.getLayer('profile-pts')) {
      map.setPaintProperty('profile-pts', 'circle-color', p.dark ? '#0f172a' : '#fff');
      map.setPaintProperty('profile-pts', 'circle-stroke-color', p.dark ? '#38bdf8' : '#111');
    }
    if (map.getLayer('places-circle')) map.setPaintProperty('places-circle', 'circle-stroke-color', p.dark ? '#0b131e' : '#ffffff');
    if (map.getLayer('quakes-circle')) map.setPaintProperty('quakes-circle', 'circle-stroke-color', p.dark ? '#0b131e' : '#ffffff');
    if (map.getLayer('triggers-circle')) map.setPaintProperty('triggers-circle', 'circle-stroke-color', p.dark ? '#0b131e' : '#ffffff');
    if (map.getLayer('draft-pt')) map.setPaintProperty('draft-pt', 'circle-stroke-color', p.dark ? '#0b131e' : '#111');

    // visibility
    (Object.keys(LAYER_MAP) as LayerId[]).forEach((id) => LAYER_MAP[id].forEach((l) => map.getLayer(l) && map.setLayoutProperty(l, 'visibility', p.layers.has(id) ? 'visible' : 'none')));
    map.setLayoutProperty('regions-base', 'visibility', currentBase.current === 'outline' ? 'visible' : 'none');
    map.setLayoutProperty('focus-mask', 'visibility', p.focus ? 'visible' : 'none');
    ['kz-border-casing', 'kz-border', 'places-circle', 'places-selected', 'profile-line', 'profile-pts', 'draft-pt'].forEach((l) => map.setLayoutProperty(l, 'visibility', 'visible'));
    map.setFilter('places-selected', ['==', ['get', 'id'], p.selectedId ?? '']);

    if (lastTerrain.current !== p.terrain3d || lastTerrainDark.current !== p.dark || lastSunAngle.current !== p.sunAngle) {
      lastTerrain.current = p.terrain3d;
      lastTerrainDark.current = p.dark;
      lastSunAngle.current = p.sunAngle;
      if (p.terrain3d) {
        map.setTerrain({ source: 'dem', exaggeration: 1.15 });
        map.setSky(lighting.sky as any);
      } else {
        map.setTerrain(null);
        map.setSky(null as any);
      }
    }
    if (map.loaded()) {
      setMapLoading(false);
    }
    } catch (error) {
      console.error('Atlas map layer setup failed', error);
      setMapLoading(false);
      p.onNotice(t(p.lang, 'Map overlays could not be prepared. Reload the atlas to try again.'));
    }
  };

  // init
  useEffect(() => {
    if (!box.current) return;
    registerTerrainProtocols();
    const iv = P.current.initialView;
    const map = new maplibregl.Map({
      container: box.current,
      style: getBasemapStyle(P.current.basemap, P.current.dark),
      ...(iv ? { center: [iv.lng, iv.lat] as [number, number], zoom: iv.z, pitch: iv.pitch, bearing: iv.bearing } : { bounds: [[46.2, 40.4], [87.6, 55.6]] as [[number, number], [number, number]], fitBoundsOptions: { padding: { top: 120, left: 30, right: 30, bottom: 30 } } }),
      maxBounds: [[28, 30], [106, 64]], minZoom: 2.5, maxZoom: 15, maxPitch: 75, trackResize: false,
      attributionControl: { compact: true }, preserveDrawingBuffer: true,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    P.current.apiRef.current = {
      capture: () => { try { return map.getCanvas().toDataURL('image/png'); } catch { return null; } },
      flyTo: (lng, lat, zoom = 9) => map.flyTo({ center: [lng, lat], zoom, speed: 1.2 }),
      flyToLandmark: ({ center, zoom, pitch, bearing }) => map.flyTo({ center, zoom, pitch, bearing, speed: 1.25, curve: 1.4, essential: true }),
      fitKazakhstan: () => map.fitBounds([[46.2, 40.4], [87.6, 55.6]], { padding: { top: 120, left: 30, right: 30, bottom: 30 }, pitch: 0, bearing: 0 }),
      startFlyover,
      stopFlyover,
    };

    let demNoticeShown = false;
    let mapNoticeShown = false;
    let mapStartupTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (ready.current) return;
      mapNoticeShown = true;
      setMapLoading(false);
      P.current.onNotice(t(P.current.lang, 'Map did not finish starting. Reload the atlas or try another browser with WebGL enabled.'));
    }, 12000);
    let mapLoadingTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeDem = onDemUnavailable(() => {
      if (demNoticeShown) return;
      demNoticeShown = true;
      P.current.onNotice(t(P.current.lang, 'Elevation tiles did not load. Slope, hillshade and 3D need internet access to the elevation tile host.'));
    });
    const onStyleReady = () => {
      if (ready.current) return;
      ready.current = true;
      if (mapStartupTimer) { clearTimeout(mapStartupTimer); mapStartupTimer = null; }
      if (mapLoadingTimer) clearTimeout(mapLoadingTimer);
      setMapLoading(true);
      applied.current = {};
      lastTerrain.current = null;
      lastTerrainDark.current = null;
      lastSunAngle.current = null;
      try { applyBasemapLanguage(map, P.current.lang, true); }
      catch (error) { console.warn('Could not localize basemap labels', error); }
      localizeMapControls(map, P.current.lang);
      sync.current();
      if (P.current.terrain3d) {
        const lighting = getLightingStyle(P.current.sunAngle ?? 315, P.current.dark);
        map.setTerrain({ source: 'dem', exaggeration: 1.15 });
        map.setSky(lighting.sky as any);
      }
      const shouldApplyTerrainCamera = P.current.terrain3d && !terrainCameraApplied.current;
      requestAnimationFrame(() => {
        if (mapRef.current !== map) return;
        map.resize();
        map.triggerRepaint();
        if (shouldApplyTerrainCamera && P.current.terrain3d && !terrainCameraApplied.current) applyTerrainCamera(map);
        if (map.loaded()) setMapLoading(false);
      });
      mapLoadingTimer = setTimeout(() => setMapLoading(false), 2000);
    };
    const onMapIdle = () => {
      if (mapLoadingTimer) { clearTimeout(mapLoadingTimer); mapLoadingTimer = null; }
      setMapLoading(false);
    };
    // `load` is a one-time fallback for engines/providers where `style.load`
    // fires before this component is subscribed; subsequent basemap switches
    // continue to use `style.load`.
    map.once('load', onStyleReady);
    map.on('style.load', onStyleReady);
    map.on('idle', onMapIdle);
    map.on('error', (e: any) => {
      const sourceId = String(e?.sourceId ?? '');
      if (sourceId === 'dem') {
        if (!demNoticeShown) {
          demNoticeShown = true;
          P.current.onNotice(t(P.current.lang, 'Elevation tiles did not load. Slope, hillshade and 3D need internet access to the elevation tile host.'));
        }
        return;
      }
      if (sourceId === 'slope' || sourceId === 'susc') return;
      if (e?.error && !mapNoticeShown) {
        mapNoticeShown = true;
        setMapLoading(false);
        console.warn('Atlas basemap resource failed', e.error);
        P.current.onNotice(t(P.current.lang, 'Map tiles did not load. Check your connection, then retry or choose another basemap.'));
      }
    });
    map.on('moveend', () => {
      if (moveTimer.current) clearTimeout(moveTimer.current);
      moveTimer.current = setTimeout(() => {
        const c = map.getCenter();
        P.current.onMove({ lng: c.lng, lat: c.lat, z: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() });
      }, 400);
    });
    map.on('mousemove', (e) => {
      if (P.current.tool) { map.getCanvas().style.cursor = 'crosshair'; }
      else {
        const layers = INTERACTIVE.filter((l) => map.getLayer(l));
        map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers }).length ? 'pointer' : '';
      }
      const lng = e.lngLat.lng, lat = e.lngLat.lat;
      if (hudTimer.current) clearTimeout(hudTimer.current);
      hudTimer.current = setTimeout(async () => {
        try {
          const inspect = await terrainInspect(lng, lat, Math.min(12, Math.max(8, Math.round(map.getZoom()))));
          setHud({ lng, lat, elevation: inspect?.elevation ?? null, slope: inspect?.slope ?? null });
        } catch { /* ignore */ }
      }, 70);
    });
    map.on('mouseout', () => {
      if (hudTimer.current) clearTimeout(hudTimer.current);
    });
    map.on('click', (e) => {
      if (P.current.tool) { P.current.onMapClick(e.lngLat.lng, e.lngLat.lat); return; }
      const layers = INTERACTIVE.filter((l) => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none');
      const box = [[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]] as [[number, number], [number, number]];
      const f = map.queryRenderedFeatures(box, { layers })[0];
      if (!f) return;
      if (f.layer.id === 'places-circle') { P.current.onSelect(String(f.properties?.id)); return; }
      popupTarget.current = null;
      popup.current?.remove();
      const target = { layer: f.layer.id, properties: f.properties ?? {}, coordinates: [e.lngLat.lng, e.lngLat.lat] as [number, number] };
      popupTarget.current = target;
      popup.current = new maplibregl.Popup({ maxWidth: '300px', offset: 10 }).setLngLat(target.coordinates).setDOMContent(popupEl(target.layer, target.properties, P.current.lang)).addTo(map);
      localizePopupClose(map, P.current.lang);
      popup.current.on('close', () => { if (popupTarget.current === target) popupTarget.current = null; });
    });
    return () => {
      if (hudTimer.current) clearTimeout(hudTimer.current);
      if (mapStartupTimer) clearTimeout(mapStartupTimer);
      if (mapLoadingTimer) clearTimeout(mapLoadingTimer);
      stopFlyover();
      unsubscribeDem();
      popup.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.visible || !ready.current) return;
    let frame = 0;
    const resize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.resize());
    };
    // MapLibre's own ResizeObserver can re-enter its renderer during rapid
    // layout changes. Resize on deliberate layout and viewport changes instead.
    window.addEventListener('resize', resize);
    if (props.visible) resize();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(frame); };
  }, [props.visible, props.resizeKey]);

  useEffect(() => { setFaultLines(segments(props.geo.faults, (q) => q.kind === 'fault'), props.geo.faults.features.some((f) => f.properties?.kind === 'fault')); suscRefresh(); }, [props.geo.faults]);
  const suscRefresh = () => {
    const src = mapRef.current?.getSource('susc') as any;
    if (src?.setTiles) src.setTiles([suscTiles(P.current.susc, ++suscVersion.current)]);
  };
  useEffect(() => { suscRefresh(); }, [props.susc]);

  useEffect(() => { sync.current(); }, [props.layers, props.focus, props.places, props.lang, props.geo, props.quakes, props.sites, props.reports, props.selectedId, props.profilePath, props.draft, props.terrain3d, props.dark, props.sunAngle]);

  useEffect(() => {
    const map = mapRef.current;
    if (ready.current && map) applyBasemapLanguage(map, props.lang);
    if (ready.current && map) localizeMapControls(map, props.lang);
    const target = popupTarget.current;
    if (!map || !target) return;
    popupTarget.current = null;
    popup.current?.remove();
    const place = target.layer === 'places-circle' ? PLACES.find((item) => item.id === String(target.properties.id)) : undefined;
    const localizedTarget = place ? { ...target, properties: placeProps(place, props.lang) } : target;
    popupTarget.current = localizedTarget;
    popup.current = new maplibregl.Popup({ maxWidth: '300px', offset: 10 }).setLngLat(localizedTarget.coordinates).setDOMContent(popupEl(localizedTarget.layer, localizedTarget.properties, props.lang)).addTo(map);
    localizePopupClose(map, props.lang);
    popup.current.on('close', () => { if (popupTarget.current === localizedTarget) popupTarget.current = null; });
  }, [props.lang]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (currentBase.current === props.basemap && currentDark.current === props.dark)) return;
    currentBase.current = props.basemap;
    currentDark.current = props.dark;
    ready.current = false;
    setMapLoading(true);
    map.setStyle(getBasemapStyle(props.basemap, props.dark));
  }, [props.basemap, props.dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (props.terrain3d) {
      if (ready.current) applyTerrainCamera(map);
      else terrainCameraApplied.current = false;
    }
    else {
      terrainCameraApplied.current = false;
      map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
    }
  }, [props.terrain3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    popupTarget.current = null;
    popup.current?.remove();
    if (!props.selectedId) return;
    const place = props.places.find((x) => x.id === props.selectedId);
    if (!place) return;
    map.flyTo({ center: [place.lon, place.lat], zoom: Math.max(map.getZoom(), 9), speed: 1.2 });
    const target = { layer: 'places-circle', properties: placeProps(place, props.lang), coordinates: [place.lon, place.lat] as [number, number] };
    popupTarget.current = target;
    popup.current = new maplibregl.Popup({ maxWidth: '300px', offset: 14 }).setLngLat(target.coordinates).setDOMContent(popupEl(target.layer, target.properties, props.lang)).addTo(map);
    localizePopupClose(map, props.lang);
    popup.current.on('close', () => { if (popupTarget.current === target) { popupTarget.current = null; P.current.selectedId === place.id && P.current.onSelect(null); } });
  }, [props.selectedId]);

  return <>
    <div ref={box} className="map-canvas" aria-label={t(props.lang, 'Map')} />
    {mapLoading && (
      <div className="map-loading-indicator" role="status" aria-live="polite">
        <div className="map-loading-bar" aria-hidden="true" />
        <span className="map-loading-badge">
          <span className="map-loading-spinner" aria-hidden="true" />
          {t(props.lang, 'Loading map…')}
        </span>
      </div>
    )}
    {hud && (
      <div className="terrain-hud" role="status" aria-live="off">
        <span className="hud-coord">{formatCoord(hud.lat, hud.lng)}</span>
        {hud.elevation != null && (
          <>
            <span className="hud-sep">·</span>
            <span className="hud-val"><b>{formatNumber(props.lang, hud.elevation)}</b> {t(props.lang, 'm')}</span>
          </>
        )}
        {hud.slope != null && (
          <>
            <span className="hud-sep">·</span>
            <span className="hud-val"><b>{hud.slope}°</b> {t(props.lang, 'slope')}</span>
          </>
        )}
      </div>
    )}
    {flyoverState && (
      <div className="flyover-hud" role="status" aria-live="polite">
        <span className="flyover-badge">🛰️ {t(props.lang, '3D Flyover')}</span>
        <span className="flyover-info">
          {flyoverState.km.toFixed(1)} km · {flyoverState.step}/{flyoverState.total}
        </span>
        <button
          type="button"
          className="flyover-btn"
          onClick={togglePauseFlyover}
          aria-label={t(props.lang, flyoverState.paused ? 'Resume' : 'Pause')}
          title={t(props.lang, flyoverState.paused ? 'Resume' : 'Pause')}
        >
          {flyoverState.paused ? '▶' : '⏸'}
        </button>
        <button
          type="button"
          className="flyover-btn stop"
          onClick={stopFlyover}
          aria-label={t(props.lang, 'Stop')}
          title={t(props.lang, 'Stop')}
        >
          ⏹
        </button>
      </div>
    )}
  </>;
}
