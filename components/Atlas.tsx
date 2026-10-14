'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BASEMAPS, getBasemapProvider, type BasemapId } from '@/lib/basemaps';
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
import MapControlDock from './MapControlDock';
import Legend from './Legend';
import LimitsDialog from './LimitsDialog';
import { getLimits } from '@/lib/limits';
import { localName, localRegion, t } from '@/lib/i18n';
import PrintSheet, { type PrintData } from './PrintSheet';
import ReportDrawer from './ReportDrawer';
import { LANDMARKS, landmarkName, landmarkBadge, landmarkDesc, type Landmark } from '@/lib/landmarks';
import HazardPulse from './HazardPulse';
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
  { id: 'map', label: 'Map' }, { id: 'triggers', label: 'Trigger watch' }, { id: 'exposure', label: 'Exposure' },
  { id: 'quakes', label: 'Earthquake statistics' }, { id: 'community', label: 'Community' }, { id: 'learn', label: 'Understand the hazards' }, { id: 'data', label: 'Data and sources' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const ALL_TYPES: PlaceType[] = ['landslide', 'mudflow', 'glacial', 'quake', 'protection'];
const LANGS: { id: Lang; label: string }[] = [{ id: 'en', label: 'EN' }, { id: 'ru', label: 'РУС' }, { id: 'kk', label: 'ҚАЗ' }];
type ThemeMode = 'system' | 'light' | 'dark';
const THEMES: { id: ThemeMode; label: string }[] = [{ id: 'system', label: 'System' }, { id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }];
const THIS_YEAR = new Date().getFullYear();

async function loadFC(url: string): Promise<FC> {
  try { const r = await fetch(url); return r.ok ? ((await r.json()) as FC) : EMPTY_FC; } catch { return EMPTY_FC; }
}

export default function Atlas() {
  const [tab, setTab] = useState<TabId>('map');
  const [lang, setLang] = useState<Lang>('en');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [systemDark, setSystemDark] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const themeMenu = useRef<HTMLDivElement>(null);
  const themeButton = useRef<HTMLButtonElement>(null);
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
  const [landmarkMenuOpen, setLandmarkMenuOpen] = useState(false);
  const landmarkMenuRef = useRef<HTMLDivElement>(null);
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
  const [sunMenuOpen, setSunMenuOpen] = useState(false);
  const sunMenuRef = useRef<HTMLDivElement>(null);

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
  useEffect(() => { document.documentElement.dataset.theme = themeMode; }, [themeMode]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!themeMenuOpen) return;
    const closeOutside = (e: PointerEvent) => { if (!themeMenu.current?.contains(e.target as Node)) setThemeMenuOpen(false); };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setThemeMenuOpen(false); themeButton.current?.focus(); } };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [themeMenuOpen]);
  useEffect(() => {
    if (!landmarkMenuOpen) return;
    const closeOutside = (e: PointerEvent) => { if (!landmarkMenuRef.current?.contains(e.target as Node)) setLandmarkMenuOpen(false); };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setLandmarkMenuOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [landmarkMenuOpen]);
  useEffect(() => {
    if (!sunMenuOpen) return;
    const closeOutside = (e: PointerEvent) => { if (!sunMenuRef.current?.contains(e.target as Node)) setSunMenuOpen(false); };
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') setSunMenuOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [sunMenuOpen]);
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
    fetch('/api/reports').then((r) => (r.ok ? r.json() : { reports: [] })).then((j) => {
      if (Array.isArray(j.reports) && j.reports.length) {
        setReports((prev) => [...prev, ...j.reports.filter((x: Report) => !prev.some((p) => p.id === x.id))]);
      }
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
  const chooseTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeMenuOpen(false);
    try { localStorage.setItem('kz-landslide-theme', mode); } catch { /* ignore */ }
  };

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
    setLandmarkMenuOpen(false);
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

  return (
    <>
      <div className="app">
        <header className="top">
          <div className="brand">
            <svg width="36" height="34" viewBox="0 0 36 34" aria-hidden="true"><path d="M2 30 L14 6 L20 17 L25 10 L34 30 Z" fill="var(--accent)" /><path d="M14 6 L17 12 L12 12 Z" fill="#fff" /><path d="M5 31 L33 31" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3" /></svg>
            <div><h1>{t(lang, 'Kazakhstan Landslide and Earthquake Atlas')}</h1><p>{t(lang, 'Active faults, earthquakes, slopes, mudflows and rain triggers · screening information, not an official hazard map')}</p></div>
          </div>
          <div className="top-tools">
            <div className="seg" role="group" aria-label={t(lang, 'Language')}>{LANGS.map((l) => <button key={l.id} className={lang === l.id ? 'on' : ''} aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>)}</div>
            <div ref={themeMenu} className="theme-menu-wrap">
              <button ref={themeButton} className="icon-btn" onClick={() => setThemeMenuOpen((open) => !open)} aria-label={`${t(lang, 'Color theme')}: ${t(lang, THEMES.find((theme) => theme.id === themeMode)?.label ?? 'System')}`} title={`${t(lang, 'Color theme')}: ${t(lang, THEMES.find((theme) => theme.id === themeMode)?.label ?? 'System')}`} aria-haspopup="true" aria-expanded={themeMenuOpen} aria-controls="theme-menu">{dark ? '☀' : '☾'}</button>
              {themeMenuOpen && <div id="theme-menu" className="theme-menu" role="group" aria-label={t(lang, 'Color theme')}>
                {THEMES.map((theme) => <button key={theme.id} type="button" className="theme-option" aria-pressed={themeMode === theme.id} onClick={() => chooseTheme(theme.id)}>{t(lang, theme.label)}<span aria-hidden="true">{themeMode === theme.id ? '✓' : ''}</span></button>)}
              </div>}
            </div>
          </div>
          <nav className="tabs" aria-label={t(lang, 'Sections')}>{TABS.map((item) => <button key={item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>{t(lang, item.label)}</button>)}</nav>
        </header>

        <main className={`${tab === 'map' ? 'main-map' : 'main-page'}${tab === 'map' && mapExpanded ? ' map-expanded-main' : ''}`}>
          <section className={`map-layout${mapExpanded ? ' map-expanded' : ''}`} hidden={tab !== 'map'}>
            <Sidebar filters={filters} setFilters={setFilters} types={types} toggleType={toggleType} counts={counts} shown={shown} lang={lang} selectedId={selectedId} onSelect={setSelectedId} inventoryNote={limits.find((l) => l.id === 'inventory')?.short ?? ''} onDataHelp={() => setDataHelpOpen(true)}
              onReset={() => { setFilters({ q: '', region: '', verification: '', sort: 'newest' }); setTypes(new Set(ALL_TYPES)); }} />
            <div className="map-wrap">
              <button className="map-expand-toggle" type="button" onClick={() => setMapExpanded((expanded) => !expanded)} aria-label={t(lang, mapExpanded ? 'Restore map' : 'Expand map')} title={t(lang, mapExpanded ? 'Restore map' : 'Expand map')}>{mapExpanded ? '⤢' : '⛶'}</button>
              <HazardPulse
                sites={sites}
                quakes={quakes}
                reports={reports}
                lang={lang}
                onFlyToSite={(site) => {
                  apiRef.current?.flyTo(site.lon, site.lat, 12);
                  checkWeatherAt(site.lon, site.lat, localName(site.name, lang));
                }}
                onFlyToQuake={(quake) => {
                  apiRef.current?.flyTo(quake.lon, quake.lat, 11);
                  setQuakePanelOpen(true);
                }}
                onOpenCommunity={() => {
                  setTab('community');
                }}
              />
              {ready && (
                <MapView visible={tab === 'map'} resizeKey={mapExpanded} basemap={basemap} dark={dark} focus={focus} layers={layers} places={shown} lang={lang} selectedId={selectedId} onSelect={setSelectedId}
                  geo={geo} quakes={quakeFC} sites={sites} reports={reports} susc={susc} terrain3d={terrain3d} tool={tool} onMapClick={onMapClick}
                  profilePath={profilePath} draft={draft} initialView={initialView} onMove={onMove} onNotice={setNotice} apiRef={apiRef} sunAngle={sunAngle} />
              )}
              <MapControlDock lang={lang}>
              <div className="map-tools">
                <div className="tool-row">
                  <button className={`focus-toggle ${focus ? 'on' : ''}`} aria-pressed={focus} onClick={() => setFocus((f) => !f)} title={t(lang, 'Dim the map outside Kazakhstan')}>{t(lang, 'Focus on Kazakhstan')}</button>
                  <button className={`focus-toggle ${terrain3d ? 'on' : ''}`} aria-pressed={terrain3d} onClick={() => setTerrain3d((t) => !t)} title={t(lang, 'Tilt the map and show the mountains in 3D')}>{t(lang, '3D terrain')}</button>
                  <div ref={landmarkMenuRef} className="landmark-menu-wrap">
                    <button
                      className={`focus-toggle landmark-btn ${landmarkMenuOpen ? 'on' : ''}`}
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={landmarkMenuOpen}
                      onClick={() => setLandmarkMenuOpen((o) => !o)}
                      title={t(lang, 'Click to fly and view in 3D')}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><path d="m8 3 4 8 5-5 5 15H2L8 3z" /></svg>
                      {t(lang, '3D landmarks')} ▾
                    </button>
                    {landmarkMenuOpen && (
                      <div className="landmark-dropdown" role="menu" aria-label={t(lang, '3D hazard landmarks')}>
                        <div className="landmark-dropdown-header">
                          <span>{t(lang, '3D hazard landmarks')}</span>
                        </div>
                        <div className="landmark-list">
                          {LANDMARKS.map((lm) => (
                            <button
                              key={lm.id}
                              type="button"
                              className="landmark-item"
                              role="menuitem"
                              onClick={() => selectLandmark(lm)}
                            >
                              <div className="landmark-item-top">
                                <span className="landmark-name">{landmarkName(lm, lang)}</span>
                                <span className="landmark-badge">{landmarkBadge(lm, lang)}</span>
                              </div>
                              <div className="landmark-desc">{landmarkDesc(lm, lang)}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={sunMenuRef} className="sun-menu-wrap">
                    <button
                      className={`focus-toggle sun-btn ${sunMenuOpen ? 'on' : ''}`}
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={sunMenuOpen}
                      onClick={() => setSunMenuOpen((o) => !o)}
                      title={t(lang, 'Sun & lighting')}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
                      {t(lang, 'Sun angle')} ({sunAngle}°) ▾
                    </button>
                    {sunMenuOpen && (
                      <div className="sun-dropdown" role="menu" aria-label={t(lang, 'Sun & lighting')}>
                        <div className="sun-presets">
                          <button type="button" className={`sun-preset-btn ${sunAngle === 90 ? 'active' : ''}`} onClick={() => setSunAngle(90)}>{t(lang, 'Dawn')}</button>
                          <button type="button" className={`sun-preset-btn ${sunAngle === 180 ? 'active' : ''}`} onClick={() => setSunAngle(180)}>{t(lang, 'Noon')}</button>
                          <button type="button" className={`sun-preset-btn ${sunAngle === 225 ? 'active' : ''}`} onClick={() => setSunAngle(225)}>{t(lang, 'Afternoon')}</button>
                          <button type="button" className={`sun-preset-btn ${sunAngle === 315 ? 'active' : ''}`} onClick={() => setSunAngle(315)}>{t(lang, 'Sunset')}</button>
                        </div>
                        <div className="sun-slider-wrap">
                          <label>
                            <span>{t(lang, 'Sun angle')}: <b>{sunAngle}°</b></span>
                            <input
                              type="range"
                              min={0}
                              max={359}
                              step={5}
                              value={sunAngle}
                              onChange={(e) => setSunAngle(+e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    className={`focus-toggle ${locating || locateOpen ? 'on' : ''}`}
                    onClick={handleLocateMe}
                    disabled={locating}
                    title={t(lang, 'Your Location Hazard Screening')}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><circle cx="12" cy="12" r="3" /><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /></svg>
                    {locating ? t(lang, 'Locating…') : t(lang, 'Locate me')}
                  </button>
                  <button className={`focus-toggle ${profileOpen ? 'on' : ''}`} onClick={profileOpen ? closeProfile : startProfile} title={t(lang, 'Draw a line to get an elevation profile and the faults it crosses')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><path d="M3 19 9 12l4 4 8-10" /></svg>
                    {t(lang, 'Profile')}
                  </button>
                  <button className={`focus-toggle ${tool === 'weather' || weatherOpen ? 'on' : ''}`} onClick={startWeather} title={t(lang, 'Inspect live weather & rainfall at any point')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>
                    {t(lang, 'Check weather')}
                  </button>
                  <button className="focus-toggle" onClick={startReport}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 5, verticalAlign: '-1px' }}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    {t(lang, 'Report a hazard')}
                  </button>
                </div>
                <div className="tool-row">
                  <div className="basemaps" role="group" aria-label={t(lang, 'Basemap')}>{BASEMAPS.map((b) => <button key={b.id} className={basemap === b.id ? 'on' : ''} onClick={() => setBasemap(b.id)}>{t(lang, b.label)}</button>)}</div>
                  <button className="focus-toggle" onClick={share}>{t(lang, 'Share')}</button>
                  <button className="focus-toggle" onClick={print} title={t(lang, 'Print, or save as PDF from the print dialog')}>{t(lang, 'Print')}</button>
                  <button className="focus-toggle" onClick={downloadPng}>{t(lang, 'PNG')}</button>
                  <button className="focus-toggle warn" onClick={() => setLimitsOpen(true)} title={t(lang, 'Read the limits of this data')}>{t(lang, 'Limits')}</button>
                </div>
              </div>
              <LayerBar layers={layers} toggle={toggleLayer} lang={lang} />
              </MapControlDock>
              {layers.has('susc') && !geo.faults.features.some((f) => f.properties?.kind === 'fault') && <div className="data-banner" role="status"><b>{t(lang, 'No available data')}</b><span>{t(lang, 'Susceptibility cannot be shown because fault data is unavailable.')}</span><button className="text-button" onClick={() => setDataHelpOpen(true)}>{t(lang, 'How to contribute data')}</button></div>}
              {layers.has('triggers') && sState === 'error' && <div className="data-banner" role="status"><b>{t(lang, 'No available data')}</b><span>{t(lang, 'Open-Meteo weather feed is unavailable. No trigger levels are shown or estimated.')}</span><button className="text-button" onClick={() => setDataHelpOpen(true)}>{t(lang, 'How to contribute data')}</button></div>}
              {layers.has('quakes') && quakePanelOpen && (
                <DraggablePanel placement="right" title={t(lang, 'Earthquakes')} onClose={() => setQuakePanelOpen(false)} lang={lang}>
                  <QuakePanel f={qf} setF={setQf} quakes={quakes} shown={quakesShown.length} state={qState} lang={lang} />
                </DraggablePanel>
              )}
              {showDock && (
                <div className="dock" style={{ top: layers.has('quakes') ? 470 : undefined }}>
                  {layers.has('susc') && <SuscPanel p={susc} setP={setSusc} lang={lang} />}
                  {reportOpen && <ReportDrawer draft={draft} picking={tool === 'report'} onPick={() => setTool('report')} onLocate={(lng, lat) => { setDraft([lng, lat]); setTool(null); apiRef.current?.flyTo(lng, lat, 11); }} lang={lang}
                    onClose={() => { setReportOpen(false); setTool(null); setDraft(null); }} onDone={(r) => { setReports((x) => [r, ...x]); setLayers((s) => new Set(s).add('reports')); setDraft(null); }} />}
                </div>
              )}
              {profileOpen && (
                <DraggablePanel placement="bottom" title={t(lang, 'Elevation profile')} onClose={closeProfile} lang={lang}>
                  <ProfilePanel
                    points={profilePath.length}
                    profile={profile}
                    busy={profileBusy}
                    onClear={closeProfile}
                    onUndo={() => setProfilePath((p) => p.slice(0, -1))}
                    onFlyover={() => {
                      if (profilePath.length >= 2) {
                        if (!terrain3d) setTerrain3d(true);
                        apiRef.current?.startFlyover(profilePath);
                      }
                    }}
                    lang={lang}
                  />
                </DraggablePanel>
              )}
              {weatherOpen && (
                <DraggablePanel placement="right" title={t(lang, 'Weather & rain triggers')} onClose={closeWeather} lang={lang}>
                  <WeatherPanel site={weatherSite} loading={weatherLoading} error={weatherError} elevation={weatherElevation} slope={weatherSlope} onClose={closeWeather} lang={lang} />
                </DraggablePanel>
              )}
              {locateOpen && locateData && (
                <DraggablePanel placement="right" title={t(lang, 'Your Location Hazard Screening')} onClose={() => setLocateOpen(false)} lang={lang}>
                  <LocatePanel data={locateData} onClose={() => setLocateOpen(false)} lang={lang} />
                </DraggablePanel>
              )}
              <Legend layers={layers} types={types} limits={activeLimits} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />
              {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice(null)} aria-label={t(lang, 'Dismiss')}>×</button></div>}
              {tool && <div className="tool-hint">{t(lang, tool === 'report' ? 'Click the map to place your report' : tool === 'weather' ? 'Click anywhere on the map to inspect live weather & rain triggers' : 'Click points along the line you want to profile')}</div>}
              <div className="provider">{t(lang, 'Basemap')}: {t(lang, getBasemapProvider(dark))}</div>
              {selected && <span className="sr-only">{t(lang, 'Selected')}: {nameOf(selected, lang)}</span>}
            </div>
          </section>

          {tab === 'triggers' && <TriggerWatch sites={sites} state={sState} quakes={quakes} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />}
          {tab === 'exposure' && <Exposure cities={geo.cities} faults={geo.faults} quakes={quakes} quakeState={qState} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />}
          {tab === 'quakes' && <QuakeStats quakes={quakes} state={qState} truncated={qTrunc} lang={lang} />}
          {tab === 'community' && <Community reports={reports} onReport={startReport} lang={lang} onShow={(r) => { setTab('map'); setLayers((s) => new Set(s).add('reports')); setTimeout(() => apiRef.current?.flyTo(r.lon, r.lat, 12), 200); }} />}
          {tab === 'learn' && <Learn lang={lang} />}
          {tab === 'data' && <DataSources limits={limits} lang={lang} onDataHelp={() => setDataHelpOpen(true)} />}
        </main>
      </div>
      {limitsOpen && <LimitsDialog limits={limits} onClose={closeLimits} lang={lang} />}
      {dataHelpOpen && <DataHelpDialog lang={lang} onClose={() => setDataHelpOpen(false)} />}
      <PrintSheet data={printData} limits={limits} lang={lang} />
    </>
  );
}
