'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASEMAPS, type BasemapId } from '@/lib/basemaps';
import { PLACES, nameOf, sortPlaces, type SortId } from '@/lib/events';
import { fcContains, nearestSeg, segments, type LL } from '@/lib/geo';
import { DEFAULT_LAYERS, type LayerId } from '@/lib/layers';
import { buildProfile, type Profile } from '@/lib/profile';
import { DEFAULT_SUSC, terrainInspect, type SuscParams } from '@/lib/terrain';
import { fetchPointWeather, fetchSites } from '@/lib/triggers';
import { fetchQuakes, quakesToGeoJSON } from '@/lib/usgs';
import { decode, encode } from '@/lib/urlstate';
import { EMPTY_FC, type FC, type Lang, type LoadState, type PlaceType, type Quake, type Report, type SiteWatch } from '@/lib/types';
import type { Geo, MapApi, Tool, View } from './MapView';
import Sidebar, { type Filters } from './Sidebar';
import LayerBar from './LayerBar';
import ToolsMenu from './ToolsMenu';
import StatusStrip from './StatusStrip';
import Icon, { type IconName } from './Icon';
import Legend from './Legend';
import LimitsDialog from './LimitsDialog';
import { getLimits } from '@/lib/limits';
import { localName, localRegion, t } from '@/lib/i18n';
import PrintSheet, { type PrintData } from './PrintSheet';
import ReportDrawer from './ReportDrawer';
import type { Landmark } from '@/lib/landmarks';
import { download, placesCsv, placesGeoJson, today } from '@/lib/export';
import { DraggablePanel, LocatePanel, ProfilePanel, QuakePanel, SuscPanel, WeatherPanel, type LocateData, type QuakeFilter } from './Panels';
import TriggerWatch from './tabs/TriggerWatch';
import Exposure from './tabs/Exposure';
import QuakeStats from './tabs/QuakeStats';
import Learn from './tabs/Learn';
import DataSources from './tabs/DataSources';
import Community from './tabs/Community';
import DataHelpDialog from './DataHelpDialog';

const MapView = dynamic(() => import('./MapView'), { ssr: false, loading: () => <div className="map-canvas map-loading" /> });

const TABS = [
  { id: 'map', label: 'Map', short: 'Map', icon: 'map' }, { id: 'triggers', label: 'Trigger watch', short: 'Triggers', icon: 'rain' },
  { id: 'quakes', label: 'Earthquake statistics', short: 'Quakes', icon: 'wave' }, { id: 'exposure', label: 'Exposure', short: 'Exposure', icon: 'city' },
  { id: 'community', label: 'Community', short: 'Community', icon: 'users' }, { id: 'learn', label: 'Understand the hazards', short: 'Learn', icon: 'book' },
  { id: 'data', label: 'Data and sources', short: 'Data', icon: 'database' },
] as const satisfies readonly { id: string; label: string; short: string; icon: IconName }[];
type TabId = (typeof TABS)[number]['id'];
const ALL_TYPES: PlaceType[] = ['landslide', 'mudflow', 'glacial', 'quake', 'protection'];
const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'EN' }, { id: 'ru', label: 'РУС' }, { id: 'kk', label: 'ҚАЗ' }];
type ThemeMode = 'system' | 'light' | 'dark';
const PRIMARY_TABS: TabId[] = ['map', 'triggers', 'quakes', 'data'];
const MORE_TABS: TabId[] = ['exposure', 'community', 'learn'];
const THIS_YEAR = new Date().getFullYear();

async function loadFC(url: string): Promise<FC> {
  try { const r = await fetch(url); return r.ok ? ((await r.json()) as FC) : EMPTY_FC; } catch { return EMPTY_FC; }
}

export default function Atlas() {
  const [tab, setTab] = useState<TabId>('map');
  const [lang, setLang] = useState<Lang>('en');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [basemap, setBasemap] = useState<BasemapId>('map');
  const [focus, setFocus] = useState(true);
  const [layers, setLayers] = useState<Set<LayerId>>(new Set(DEFAULT_LAYERS));
  const [types, setTypes] = useState<Set<PlaceType>>(new Set(ALL_TYPES));
  const [filters, setFilters] = useState<Filters>({ q: '', region: '', verification: '', sort: 'newest' as SortId });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initialView, setInitialView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  const apiRef = useRef<MapApi | null>(null);

  const [geo, setGeo] = useState<Geo & { context: FC }>({ regions: EMPTY_FC, rivers: EMPTY_FC, lakes: EMPTY_FC, border: EMPTY_FC, mask: EMPTY_FC, faults: EMPTY_FC, cities: EMPTY_FC, context: EMPTY_FC });
  const [quakes, setQuakes] = useState<Quake[]>([]);
  const [qState, setQState] = useState<LoadState>('loading');
  const [qTrunc, setQTrunc] = useState(false);
  const [qf, setQf] = useState<QuakeFilter>({ minMag: 4, yFrom: 1990, yTo: THIS_YEAR });
  const [sites, setSites] = useState<SiteWatch[] | null>(null);
  const [sState, setSState] = useState<LoadState>('loading');
  const [reports, setReports] = useState<Report[]>([]);
  const [susc, setSusc] = useState<SuscParams>(DEFAULT_SUSC);
  const [terrain3d, setTerrain3d] = useState(false);
  const [tool, setTool] = useState<Tool>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [draft, setDraft] = useState<LL | null>(null);
  const [profilePath, setProfilePath] = useState<LL[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [printData, setPrintData] = useState<PrintData | null>(null);
  const [quakePanelOpen, setQuakePanelOpen] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [dataHelpOpen, setDataHelpOpen] = useState(false);
  const [weatherSite, setWeatherSite] = useState<SiteWatch | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherElevation, setWeatherElevation] = useState<number | null>(null);
  const [weatherSlope, setWeatherSlope] = useState<number | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);

  // ---- sun lighting & flyover & locate me ----
  const [sunAngle, setSunAngle] = useState(315);

  const [locating, setLocating] = useState(false);
  const [locateData, setLocateData] = useState<LocateData | null>(null);
  const [locateOpen, setLocateOpen] = useState(false);

  // ---- restore a shared view from the URL ----
  useEffect(() => {
    const u = decode(window.location.search);
    if (u.tab && TABS.some((t) => t.id === u.tab)) setTab(u.tab as TabId);
    if (u.basemap && BASEMAPS.some((b) => b.id === u.basemap)) setBasemap(u.basemap);
    if (u.focus === false) setFocus(false);
    if (u.layers) setLayers(new Set(u.layers));
    if (u.sel) setSelectedId(u.sel);
    if (u.terrain) setTerrain3d(true);
    if (u.minMag != null || u.yFrom != null || u.yTo != null) setQf((q) => ({ minMag: u.minMag ?? q.minMag, yFrom: u.yFrom ?? q.yFrom, yTo: u.yTo ?? q.yTo }));
    if (u.susc) { const p = u.susc.split('.').map(Number); if (p.length === 5 && p.every(Number.isFinite)) setSusc({ ws: p[0], wf: p[1], ww: p[2], buf: p[3], wet: p[4] }); }
    if (u.view) { setInitialView(u.view); viewRef.current = u.view; }
    try { const saved = localStorage.getItem('kz-landslide-language'); if (saved === 'en' || saved === 'ru' || saved === 'kk') setLang(saved); } catch { /* ignore */ }
    try { const savedTheme = localStorage.getItem('kz-landslide-theme'); if (savedTheme === 'system' || savedTheme === 'light' || savedTheme === 'dark') setThemeMode(savedTheme); } catch { /* ignore */ }
    try { if (!localStorage.getItem('kz-landslide-limits-ack')) setLimitsOpen(true); } catch { setLimitsOpen(true); }
    setReady(true);
  }, []);
  const closeLimits = useCallback(() => { setLimitsOpen(false); try { localStorage.setItem('kz-landslide-limits-ack', '1'); } catch { /* ignore */ } }, []);

  const writeUrl = useCallback(() => {
    if (!ready) return;
    const q = encode({ tab, basemap, focus, layers: [...layers], view: viewRef.current ?? undefined, sel: selectedId ?? undefined, terrain: terrain3d, minMag: qf.minMag !== 4 ? qf.minMag : undefined, yFrom: qf.yFrom !== 1990 ? qf.yFrom : undefined, yTo: qf.yTo !== THIS_YEAR ? qf.yTo : undefined, susc: layers.has('susc') ? [susc.ws, susc.wf, susc.ww, susc.buf, susc.wet].join('.') : undefined });
    window.history.replaceState(null, '', q ? `?${q}` : window.location.pathname);
  }, [ready, tab, basemap, focus, layers, selectedId, terrain3d, qf, susc]);
  useEffect(() => { writeUrl(); }, [writeUrl]);
  const onMove = useCallback((v: View) => { viewRef.current = v; writeUrl(); }, [writeUrl]);

  const dark = themeMode === 'dark' || (themeMode === 'system' && systemDark);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!layersOpen && !toolsOpen && !moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLayersOpen(false); setToolsOpen(false); setMoreOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [layersOpen, toolsOpen, moreOpen]);
  useEffect(() => { document.documentElement.lang = lang; try { localStorage.setItem('kz-landslide-language', lang); } catch { /* ignore */ } }, [lang]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(t); }, [notice]);

  // ---- data ----
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      const [regions, rivers, lakes, border, mask, faults, cities, context] = await Promise.all(
        ['kz-adm1', 'kz-rivers', 'kz-lakes', 'kz-border', 'kz-focus', 'kz-faults', 'kz-cities', 'kz-context'].map((n) => loadFC(`/data/${n}.geojson`)),
      );
      if (ac.signal.aborted) return;
      setGeo({ regions, rivers, lakes, border, mask, faults, cities, context });
      if (!border.features.length) setNotice(t(lang, 'Data files are missing from /public/data. Run "npm run data".'));
      try {
        const r = await fetchQuakes(border, context, regions, ac.signal);
        setQuakes(r.quakes); setQTrunc(r.truncated); setQState('ok');
      } catch (e) { if (!ac.signal.aborted) { console.warn(e); setQState('error'); setNotice(t(lang, 'Earthquakes could not be loaded from USGS.')); } }
    })();
    fetchSites(ac.signal).then((s) => { setSites(s); setSState('ok'); }).catch((e) => { if (!ac.signal.aborted) { console.warn(e); setSState('error'); } });
    try {
      const localR = JSON.parse(localStorage.getItem('kz-landslide-reports') || '[]');
      if (Array.isArray(localR) && localR.length) setReports(localR);
    } catch { /* ignore */ }
    // The published site is a static export with no report server, so shared reports are only requested when one is configured.
    if (process.env.NEXT_PUBLIC_REPORTS_API === '1') fetch('/api/reports').then((r) => (r.ok ? r.json() : { reports: [] })).then((j) => {
      if (Array.isArray(j.reports) && j.reports.length) setReports((prev) => [...prev, ...j.reports.filter((x: Report) => !prev.some((p) => p.id === x.id))]);
    }).catch(() => undefined);
    return () => ac.abort();
  }, []);

  const quakesShown = useMemo(() => quakes.filter((q) => { const y = new Date(q.time).getUTCFullYear(); return q.mag >= qf.minMag && y >= qf.yFrom && y <= qf.yTo; }), [quakes, qf]);
  const quakeFC = useMemo(() => quakesToGeoJSON(quakesShown), [quakesShown]);

  // ---- records list ----
  const base = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return PLACES.filter((p) => {
      if (filters.region && p.region !== filters.region) return false;
      if (filters.verification && p.verification !== filters.verification) return false;
      if (q && !`${p.name.en} ${p.name.ru} ${p.name.kk} ${p.region} ${localRegion(p.region, lang)} ${p.note ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filters, lang]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; base.forEach((p) => { c[p.type] = (c[p.type] ?? 0) + 1; }); return c; }, [base]);
  const shown = useMemo(() => sortPlaces(base.filter((p) => types.has(p.type)), filters.sort, lang), [base, types, filters.sort, lang]);

  const toggleLayer = (id: LayerId) => setLayers((s) => {
    const n = new Set(s);
    if (n.has(id)) {
      n.delete(id);
      if (id === 'quakes') setQuakePanelOpen(false);
    } else {
      n.add(id);
      if (id === 'quakes') setQuakePanelOpen(true);
    }
    return n;
  });
  const toggleType = (t: PlaceType) => setTypes((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const toggleTheme = () => {
    const next: ThemeMode = dark ? 'light' : 'dark';
    setThemeMode(next);
    try { localStorage.setItem('kz-landslide-theme', next); } catch { /* ignore */ }
  };
  const resetFilters = () => { setFilters({ q: '', region: '', verification: '', sort: 'newest' }); setTypes(new Set(ALL_TYPES)); };
  const activeFilters = (filters.region ? 1 : 0) + (filters.verification ? 1 : 0) + (types.size < ALL_TYPES.length ? 1 : 0);
  const downloadRecords = (format: 'csv' | 'geojson') => format === 'csv'
    ? download(`slopewatch-kz-records-${today()}.csv`, placesCsv(shown), 'text/csv;charset=utf-8')
    : download(`slopewatch-kz-records-${today()}.geojson`, placesGeoJson(shown), 'application/geo+json;charset=utf-8');

  // ---- tools ----
  const faultSegs = useMemo(() => segments(geo.faults, (p) => p.kind === 'fault'), [geo.faults]);
  const checkWeatherAt = useCallback(async (lng: number, lat: number, name?: string) => {
    setWeatherOpen(true);
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherSite(null);
    setTool(null);
    try {
      const [inspect, site] = await Promise.all([
        terrainInspect(lng, lat, 11).catch(() => null),
        fetchPointWeather(lat, lng, name),
      ]);
      setWeatherElevation(inspect?.elevation ?? null);
      setWeatherSlope(inspect?.slope ?? null);
      setWeatherSite(site);
    } catch {
      setWeatherError(t(lang, 'Weather could not be loaded.'));
    } finally {
      setWeatherLoading(false);
    }
  }, [lang]);

  const onMapClick = (lng: number, lat: number) => {
    if (tool === 'report') { setDraft([lng, lat]); setTool(null); }
    else if (tool === 'profile') setProfilePath((p) => [...p, [lng, lat]]);
    else if (tool === 'weather') checkWeatherAt(lng, lat);
  };
  useEffect(() => {
    if (profilePath.length < 2) { setProfile(null); return; }
    let alive = true;
    setProfileBusy(true);
    buildProfile(profilePath, faultSegs, 160, geo.faults.features.some((f) => f.properties?.kind === 'fault')).then((p) => { if (alive) setProfile(p); }).catch(() => { if (alive) setNotice(t(lang, 'Elevation could not be read.')); }).finally(() => alive && setProfileBusy(false));
    return () => { alive = false; };
  }, [profilePath, faultSegs, geo.faults, lang]);
  const startProfile = () => { setProfileOpen(true); setTool('profile'); setReportOpen(false); setWeatherOpen(false); };
  const closeProfile = () => { setProfileOpen(false); setTool(null); setProfilePath([]); };
  const startReport = () => { setTab('map'); setReportOpen(true); setProfileOpen(false); setProfilePath([]); setWeatherOpen(false); setTool('report'); };
  const startWeather = () => {
    if (tool === 'weather') {
      setTool(null);
    } else {
      setTool('weather');
      setReportOpen(false);
      setProfileOpen(false);
      setProfilePath([]);
    }
  };
  const closeWeather = () => {
    setWeatherOpen(false);
    setWeatherSite(null);
    if (tool === 'weather') setTool(null);
  };
  const selectLandmark = (l: Landmark) => {
    if (!terrain3d) setTerrain3d(true);
    apiRef.current?.flyToLandmark({ center: l.center, zoom: l.zoom, pitch: l.pitch, bearing: l.bearing });
  };

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setNotice(t(lang, 'Geolocation not supported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        apiRef.current?.flyTo(lon, lat, 12);
        const inside = fcContains(geo.border, lon, lat);
        const { km: faultKm, seg } = nearestSeg(faultSegs, lon, lat);
        const faultSlip = (seg?.props as any)?.slip || null;
        setLocateData({
          lon,
          lat,
          elevation: null,
          slope: null,
          faultKm: Number.isFinite(faultKm) ? faultKm : null,
          faultSlip,
          inside,
          siteWatch: null,
          weatherLoading: true,
          weatherError: null,
        });
        setLocateOpen(true);
        setLocating(false);
        try {
          const [ins, site] = await Promise.all([
            terrainInspect(lon, lat, 12).catch(() => null),
            fetchPointWeather(lat, lon, t(lang, 'Your location')),
          ]);
          setLocateData((p) =>
            p
              ? {
                  ...p,
                  elevation: ins?.elevation ?? null,
                  slope: ins?.slope ?? null,
                  siteWatch: site,
                  weatherLoading: false,
                }
              : null,
          );
        } catch {
          setLocateData((p) =>
            p ? { ...p, weatherLoading: false, weatherError: t(lang, 'Weather could not be loaded.') } : null,
          );
        }
      },
      () => {
        setNotice(t(lang, 'Could not get your location'));
        setLocating(false);
      },
      { timeout: 12000, enableHighAccuracy: true },
    );
  }, [geo.border, faultSegs, lang]);

  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) { await navigator.share({ title: t(lang, 'Kazakhstan Landslide and Earthquake Atlas'), url }); return; } } catch { /* fall through */ }
    try { await navigator.clipboard.writeText(url); setNotice(t(lang, 'Link copied. It reopens this exact view.')); } catch { setNotice(`${t(lang, 'Copy this link:')} ${url}`); }
  };
  const print = () => {
    const img = apiRef.current?.capture();
    if (!img) { setNotice(t(lang, 'The map image could not be captured. Use your browser print dialog instead.')); return; }
    setPrintData({ img, url: window.location.href, date: new Date().toISOString().slice(0, 10), layers: [...layers] });
    const clear = () => { setPrintData(null); window.removeEventListener('afterprint', clear); };
    window.addEventListener('afterprint', clear);
    setTimeout(() => window.print(), 150);
  };
  const downloadPng = () => {
    const img = apiRef.current?.capture();
    if (!img) return setNotice(t(lang, 'The map image could not be captured.'));
    const a = document.createElement('a'); a.href = img; a.download = 'kazakhstan-hazard-map.png'; a.click();
  };

  const limits = useMemo(() => {
    const f = geo.faults.features.filter((x) => (x.properties as any)?.kind === 'fault');
    const inside = f.filter((x) => (x.properties as any).inside).length;
    const countKnown = f.length > 0;
    return getLimits({ faultsInside: countKnown ? inside : null, faultsNear: countKnown ? f.length - inside : null, events: PLACES.length }, lang);
  }, [geo.faults, lang]);
  const activeLimits = limits.filter((l) => l.audience === 'everyone' && l.layers.some((id) => layers.has(id)));
  const selected = PLACES.find((p) => p.id === selectedId);
  const showDock = layers.has('susc') || reportOpen;
  const goTab = (id: TabId) => { setTab(id); setMoreOpen(false); };

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            <svg className="brand-mark" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
              <rect width="34" height="34" rx="5" fill="var(--accent)" />
              <path d="M5 25 13.5 9l4.5 8 3-4.5L29 25" fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M9 29h3m3 0h4m3 0h3" stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <h1><span className="wm">SlopeWatch<b>KZ</b></span><span className="wm-sub">{t(lang, 'Landslide and earthquake atlas')}</span></h1>
              <p>{t(lang, 'Faults, earthquakes, slopes, mudflows and rain triggers in Kazakhstan · screening information, not an official hazard map')}</p>
            </div>
          </div>
          <div className="top-tools">
            <div className="seg" role="group" aria-label={t(lang, 'Language')}>{LANGS.map((l) => <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}</div>
            <button className="icon-btn" onClick={share} aria-label={t(lang, 'Share link')} title={t(lang, 'Share link')}><Icon name="share" /></button>
            <button className="icon-btn" onClick={toggleTheme} aria-label={t(lang, 'Toggle dark mode')} title={t(lang, 'Toggle dark mode')}><Icon name={dark ? 'sun' : 'moon'} /></button>
          </div>
          <nav className="tabs" aria-label={t(lang, 'Sections')}>{TABS.map((item) => <button key={item.id} className={tab === item.id ? 'on' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => goTab(item.id)}>{t(lang, item.label)}</button>)}</nav>
        </header>

        <main className={tab === 'map' ? 'main-map' : 'main-page'}>
          <section className={`map-layout${mapExpanded ? ' map-expanded' : ''}`} hidden={tab !== 'map'}>
            <Sidebar filters={filters} setFilters={setFilters} types={types} toggleType={toggleType} counts={counts} shown={shown} lang={lang} selectedId={selectedId} onSelect={setSelectedId}
              inventoryNote={limits.find((l) => l.id === 'inventory')?.short ?? ''} onDataHelp={() => setDataHelpOpen(true)} onReset={resetFilters} activeFilters={activeFilters} onDownload={downloadRecords} />
            <div className="map-wrap">
              <StatusStrip sites={sites} sitesState={sState} quakes={quakes} quakeState={qState} lang={lang}
                onOpenTriggers={() => goTab('triggers')}
                onFlyToSite={(site) => { apiRef.current?.flyTo(site.lon, site.lat, 11); checkWeatherAt(site.lon, site.lat, localName(site.name, lang)); }}
                onFlyToQuake={(quake) => { setLayers((s) => new Set(s).add('quakes')); apiRef.current?.flyTo(quake.lon, quake.lat, 8); }} />
              <div className="map-stage">
                {ready && (
                  <MapView visible={tab === 'map'} resizeKey={mapExpanded} basemap={basemap} dark={dark} focus={focus} layers={layers} places={shown} lang={lang} selectedId={selectedId} onSelect={setSelectedId}
                    geo={geo} quakes={quakeFC} sites={sites} reports={reports} susc={susc} terrain3d={terrain3d} tool={tool} onMapClick={onMapClick}
                    profilePath={profilePath} draft={draft} initialView={initialView} onMove={onMove} onNotice={setNotice} apiRef={apiRef} sunAngle={sunAngle} />
                )}
                <div className={`map-actions${layersOpen || toolsOpen ? ' open' : ''}`}>
                  {!toolsOpen && <LayerBar open={layersOpen} setOpen={setLayersOpen} layers={layers} toggle={toggleLayer} basemap={basemap} setBasemap={setBasemap} lang={lang} />}
                  {!layersOpen && (
                    <ToolsMenu open={toolsOpen} setOpen={setToolsOpen} lang={lang}
                      focus={focus} onFocus={() => setFocus((f) => !f)} terrain3d={terrain3d} onTerrain={() => setTerrain3d((v) => !v)}
                      listHidden={mapExpanded} onToggleList={() => setMapExpanded((v) => !v)} sunAngle={sunAngle} onSun={setSunAngle} onLandmark={selectLandmark}
                      profileOn={profileOpen} onProfile={profileOpen ? closeProfile : startProfile} weatherOn={tool === 'weather' || weatherOpen} onWeather={startWeather}
                      locating={locating} onLocate={handleLocateMe} onReport={startReport} onShare={share} onPrint={print} onPng={downloadPng} onLimits={() => setLimitsOpen(true)} />
                  )}
                  {!layersOpen && !toolsOpen && layers.has('quakes') && !quakePanelOpen && qState === 'ok' && (
                    <button className="map-btn quake-chip" onClick={() => setQuakePanelOpen(true)} title={t(lang, 'Filter earthquakes by magnitude and year')}>
                      <Icon name="wave" /><span>M {qf.minMag.toFixed(1)}+ · {qf.yFrom}–{qf.yTo}</span>
                    </button>
                  )}
                </div>
                {layers.has('susc') && !geo.faults.features.some((f) => f.properties?.kind === 'fault') && <div className="data-banner" role="status"><b>{t(lang, 'No available data')}</b><span>{t(lang, 'Susceptibility cannot be shown because fault data is unavailable.')}</span><button className="text-button" onClick={() => setDataHelpOpen(true)}>{t(lang, 'How to contribute data')}</button></div>}
                {layers.has('triggers') && sState === 'error' && <div className="data-banner" role="status"><b>{t(lang, 'No available data')}</b><span>{t(lang, 'Open-Meteo weather feed is unavailable. No trigger levels are shown or estimated.')}</span><button className="text-button" onClick={() => setDataHelpOpen(true)}>{t(lang, 'How to contribute data')}</button></div>}
                {layers.has('quakes') && quakePanelOpen && (
                  <DraggablePanel placement="right" title={t(lang, 'Earthquakes')} onClose={() => setQuakePanelOpen(false)} lang={lang}>
                    <QuakePanel f={qf} setF={setQf} quakes={quakes} shown={quakesShown.length} state={qState} lang={lang} />
                  </DraggablePanel>
                )}
                {showDock && (
                  <div className="dock">
                    {layers.has('susc') && !reportOpen && <SuscPanel p={susc} setP={setSusc} lang={lang} />}
                    {reportOpen && <ReportDrawer draft={draft} picking={tool === 'report'} onPick={() => setTool('report')} onLocate={(lng, lat) => { setDraft([lng, lat]); setTool(null); apiRef.current?.flyTo(lng, lat, 11); }} lang={lang}
                      onClose={() => { setReportOpen(false); setTool(null); setDraft(null); }} onDone={(r) => { setReports((x) => [r, ...x]); setLayers((s) => new Set(s).add('reports')); setDraft(null); }} />}
                  </div>
                )}
                {profileOpen && (
                  <DraggablePanel placement="bottom" title={t(lang, 'Elevation profile')} onClose={closeProfile} lang={lang}>
                    <ProfilePanel points={profilePath.length} profile={profile} busy={profileBusy} onClear={closeProfile} onUndo={() => setProfilePath((p) => p.slice(0, -1))}
                      onFlyover={() => { if (profilePath.length >= 2) { if (!terrain3d) setTerrain3d(true); apiRef.current?.startFlyover(profilePath); } }} lang={lang} />
                  </DraggablePanel>
                )}
                {weatherOpen && (
                  <DraggablePanel placement="right" title={t(lang, 'Rain at a point')} onClose={closeWeather} lang={lang}>
                    <WeatherPanel site={weatherSite} loading={weatherLoading} error={weatherError} elevation={weatherElevation} slope={weatherSlope} onClose={closeWeather} lang={lang} />
                  </DraggablePanel>
                )}
                {locateOpen && locateData && (
                  <DraggablePanel placement="right" title={t(lang, 'Near me')} onClose={() => setLocateOpen(false)} lang={lang}>
                    <LocatePanel data={locateData} onClose={() => setLocateOpen(false)} lang={lang} />
                  </DraggablePanel>
                )}
                <Legend layers={layers} types={types} limits={activeLimits} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />
                {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice(null)} aria-label={t(lang, 'Dismiss')}><Icon name="close" /></button></div>}
                {tool && <div className="tool-hint">{t(lang, tool === 'report' ? 'Tap the map to place your report' : tool === 'weather' ? 'Tap anywhere on the map to read model rain there' : 'Tap points along the line you want to profile')}<button onClick={() => { if (tool === 'profile') closeProfile(); else setTool(null); }} aria-label={t(lang, 'Cancel')}><Icon name="close" /></button></div>}
                {selected && <span className="sr-only">{t(lang, 'Selected')}: {nameOf(selected, lang)}</span>}
              </div>
            </div>
          </section>

          {tab === 'triggers' && <TriggerWatch sites={sites} state={sState} quakes={quakes} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />}
          {tab === 'exposure' && <Exposure cities={geo.cities} faults={geo.faults} quakes={quakes} quakeState={qState} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />}
          {tab === 'quakes' && <QuakeStats quakes={quakes} state={qState} truncated={qTrunc} lang={lang} />}
          {tab === 'community' && <Community reports={reports} onReport={startReport} lang={lang} onShow={(r) => { setTab('map'); setLayers((s) => new Set(s).add('reports')); setTimeout(() => apiRef.current?.flyTo(r.lon, r.lat, 12), 200); }} />}
          {tab === 'learn' && <Learn lang={lang} />}
          {tab === 'data' && <DataSources limits={limits} lang={lang} onDataHelp={() => setDataHelpOpen(true)} onDownload={downloadRecords} recordCount={PLACES.length} />}
        </main>

        <nav className="bottom-nav" aria-label={t(lang, 'Sections')}>
          {PRIMARY_TABS.map((id) => {
            const item = TABS.find((x) => x.id === id)!;
            return <button key={id} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => goTab(id)}><Icon name={item.icon} size={22} /><span>{t(lang, item.short)}</span></button>;
          })}
          <button className={MORE_TABS.includes(tab) || moreOpen ? 'on' : ''} aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen((o) => !o)}><Icon name="more" size={22} /><span>{t(lang, 'More')}</span></button>
          {moreOpen && (
            <>
              <button className="more-backdrop" aria-label={t(lang, 'Close')} tabIndex={-1} onClick={() => setMoreOpen(false)} />
              <div className="more-menu" role="menu">
                {MORE_TABS.map((id) => {
                  const item = TABS.find((x) => x.id === id)!;
                  return <button key={id} role="menuitem" className={tab === id ? 'on' : ''} onClick={() => goTab(id)}><Icon name={item.icon} size={20} />{t(lang, item.label)}</button>;
                })}
                <button role="menuitem" onClick={() => { setMoreOpen(false); setLimitsOpen(true); }}><Icon name="alert" size={20} />{t(lang, 'Limits of this data')}</button>
              </div>
            </>
          )}
        </nav>
      </div>
      {limitsOpen && <LimitsDialog limits={limits} onClose={closeLimits} lang={lang} />}
      {dataHelpOpen && <DataHelpDialog lang={lang} onClose={() => setDataHelpOpen(false)} />}
      <PrintSheet data={printData} limits={limits} lang={lang} />
    </>
  );
}
