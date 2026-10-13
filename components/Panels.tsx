'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { DEFAULT_SUSC, SUSC_CLASSES, type SuscParams } from '@/lib/terrain';
import { profileToCsv, profileToGeoJson, type Profile } from '@/lib/profile';
import type { Lang, LoadState, Quake, SiteWatch } from '@/lib/types';
import { formatNumber, t } from '@/lib/i18n';

export interface QuakeFilter { minMag: number; yFrom: number; yTo: number }

export function DraggablePanel({
  children,
  placement,
  title,
  onClose,
  lang,
}: {
  children: ReactNode;
  placement: 'right' | 'bottom';
  title?: string;
  onClose?: () => void;
  lang?: Lang;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const clamp = useCallback((x: number, y: number) => {
    const el = panel.current, parent = el?.parentElement;
    if (!el || !parent) return { x, y };
    if (parent.clientWidth <= 0 || parent.clientHeight <= 0) return { x, y };
    return { x: Math.max(8, Math.min(x, parent.clientWidth - el.offsetWidth - 8)), y: Math.max(8, Math.min(y, parent.clientHeight - el.offsetHeight - 8)) };
  }, []);
  useEffect(() => {
    const initial = () => {
      const el = panel.current, parent = el?.parentElement;
      if (!el || !parent || parent.clientWidth <= 0 || parent.clientHeight <= 0) return null;
      const x = placement === 'right' ? parent.clientWidth - el.offsetWidth - 12 : (parent.clientWidth - el.offsetWidth) / 2;
      const y = placement === 'right' ? 68 : parent.clientHeight - el.offsetHeight - 12;
      return clamp(x, y);
    };
    const resize = () => {
      const el = panel.current, parent = el?.parentElement;
      if (!el || !parent || parent.clientWidth <= 0 || parent.clientHeight <= 0) return;
      setPosition((p) => p ? clamp(p.x, p.y) : initial());
    };
    resize();
    const observer = typeof ResizeObserver === 'undefined' || !panel.current ? null : new ResizeObserver(resize);
    if (observer && panel.current) {
      observer.observe(panel.current);
      if (panel.current.parentElement) observer.observe(panel.current.parentElement);
    }
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [placement, clamp]);
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const el = panel.current;
    if (!el || !position) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ...position, pointerX: e.clientX, pointerY: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start) setPosition(clamp(start.x + e.clientX - start.pointerX, start.y + e.clientY - start.pointerY));
  };
  const onPointerUp = () => { drag.current = null; };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!position || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const step = e.shiftKey ? 40 : 12;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    setPosition(clamp(position.x + dx, position.y + dy));
  };
  return (
    <div
      ref={panel}
      className={`floating-panel ${placement === 'bottom' ? 'floating-profile' : ''}`}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {title && (
        <div
          className="panel-drag-handle"
          role="button"
          tabIndex={0}
          aria-label={title}
          title={lang ? t(lang, 'Drag to move') : 'Drag to reposition'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          <div className="panel-drag-left">
            <span className="panel-drag-grip" aria-hidden="true">⠿</span>
            <span className="panel-drag-title">{title}</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="panel-drag-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label={lang ? t(lang, 'Close') : 'Close'}
              title={lang ? t(lang, 'Close') : 'Close'}
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="floating-panel-body">{children}</div>
    </div>
  );
}

export function QuakePanel({ f, setF, quakes, shown, state, lang }: { f: QuakeFilter; setF: (f: QuakeFilter) => void; quakes: Quake[]; shown: number; state: LoadState; lang: Lang }) {
  const [playing, setPlaying] = useState(false);
  const now = new Date().getFullYear();
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setF({ ...f, yTo: f.yTo >= now ? f.yFrom : f.yTo + 1 }), 900);
    return () => clearTimeout(t);
  }, [playing, f, now, setF]);
  return (
    <section className="panel">
      <p className="muted small" style={{ margin: '0 0 10px', fontSize: '11px' }}>{t(lang, 'Earthquakes · USGS, M3 and above since 1990')}</p>
      {state === 'loading' && <p className="muted">{t(lang, 'Loading earthquake data…')}</p>}
      {state === 'error' && <p className="error">{t(lang, 'Earthquake data is unavailable. The USGS catalogue did not load.')}</p>}
      {state === 'ok' && <>
      <label>{t(lang, 'Minimum magnitude:')} <b>{f.minMag.toFixed(1)}</b>
        <input type="range" min={3} max={7} step={0.1} value={f.minMag} onChange={(e) => setF({ ...f, minMag: +e.target.value })} />
      </label>
      <label>{t(lang, 'From year:')} <b>{f.yFrom}</b>
        <input type="range" min={1990} max={now} value={f.yFrom} onChange={(e) => setF({ ...f, yFrom: Math.min(+e.target.value, f.yTo) })} />
      </label>
      <label>{t(lang, 'To year:')} <b>{f.yTo}</b>
        <input type="range" min={1990} max={now} value={f.yTo} onChange={(e) => setF({ ...f, yTo: Math.max(+e.target.value, f.yFrom) })} />
      </label>
      <div className="panel-row">
        <button className="btn" onClick={() => setPlaying((p) => !p)}>{t(lang, playing ? 'Pause' : 'Play through the years')}</button>
        <span className="muted">{formatNumber(lang, shown)} / {formatNumber(lang, quakes.length)} {t(lang, 'shown')}</span>
      </div>
      </>}
    </section>
  );
}

export function SuscPanel({ p, setP, lang }: { p: SuscParams; setP: (p: SuscParams) => void; lang: Lang }) {
  const row = (label: string, key: keyof SuscParams, min: number, max: number, unit = '') => (
    <label>{t(lang, label)}: <b>{p[key]}{unit}</b>
      <input type="range" min={min} max={max} value={p[key]} onChange={(e) => setP({ ...p, [key]: +e.target.value })} />
    </label>
  );
  return (
    <section className="panel">
      <h3>{t(lang, 'Susceptibility screening')} <small>{t(lang, 'transparent, adjustable, heuristic')}</small></h3>
      <p className="muted">{t(lang, 'Index = weighted slope, closeness to a mapped active fault, and a wet-conditions scenario applied on slopes. It highlights where to look first. It is not validated against landslide records and is not a hazard map.')}</p>
      {row('Weight: slope angle', 'ws', 0, 100)}
      {row('Weight: fault proximity', 'wf', 0, 100)}
      {row('Weight: wet conditions', 'ww', 0, 100)}
      {row('Fault influence distance', 'buf', 2, 30, ' km')}
      {row('Wet-conditions scenario', 'wet', 0, 100, '%')}
      <div className="susc-key">{SUSC_CLASSES.map((c) => <span key={c.label}><i style={{ background: c.color }} />{t(lang, c.label)}</span>)}</div>
      <button className="btn ghost" onClick={() => setP(DEFAULT_SUSC)}>{t(lang, 'Reset weights')}</button>
    </section>
  );
}

export function ProfilePanel({ points, profile, busy, onClear, onUndo, onFlyover, lang }: { points: number; profile: Profile | null; busy: boolean; onClear: () => void; onUndo: () => void; onFlyover?: () => void; lang: Lang }) {
  const W = 560, H = 150, pad = 34;
  let chart = null;
  if (profile) {
    const lo = Math.floor(profile.min / 100) * 100, hi = Math.ceil(profile.max / 100) * 100 || lo + 100;
    const x = (km: number) => pad + (km / (profile.totalKm || 1)) * (W - pad - 8);
    const y = (e: number) => 8 + (1 - (e - lo) / (hi - lo || 1)) * (H - 28);
    const d = profile.km.map((k, i) => profile.elev[i] == null ? '' : `${i === 0 || profile.elev[i - 1] == null ? 'M' : 'L'}${x(k).toFixed(1)},${y(profile.elev[i]!).toFixed(1)}`).filter(Boolean).join(' ');
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(lang, 'Elevation profile')} className="profile-svg">
        <path d={d} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
        {[lo, (lo + hi) / 2, hi].map((e) => <g key={e}><line x1={pad} x2={W - 8} y1={y(e)} y2={y(e)} stroke="var(--line)" /><text x={pad - 4} y={y(e) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(e)}</text></g>)}
        {profile.crossings.map((c, i) => <g key={i}><line x1={x(c.km)} x2={x(c.km)} y1="8" y2={H - 20} stroke="#d62f4b" strokeWidth="2" strokeDasharray="3 2" /><circle cx={x(c.km)} cy="8" r="3.5" fill="#d62f4b" /></g>)}
        <text x={pad} y={H - 6} fontSize="10" fill="var(--muted)">0 km</text>
        <text x={W - 8} y={H - 6} textAnchor="end" fontSize="10" fill="var(--muted)">{profile.totalKm.toFixed(1)} km</text>
      </svg>
    );
  }
  const downloadCsv = () => {
    if (!profile) return;
    const csv = profileToCsv(profile);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elevation-profile-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadGeoJson = () => {
    if (!profile) return;
    const geo = profileToGeoJson(profile);
    const blob = new Blob([geo], { type: 'application/geo+json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elevation-profile-${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel profile">
      <div className="panel-row" style={{ marginBottom: 6 }}>
        <span className="muted small">{t(lang, 'click points on the map to draw a line')}</span>
        <span className="spacer" />
        {profile && (
          <>
            <button className="btn ghost flyover-btn" onClick={onFlyover} title={t(lang, 'Start 3D tour')}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}><polygon points="12 2 19 21 12 17 5 21 12 2" /></svg>
              {t(lang, '3D Flyover')}
            </button>
            <button className="btn ghost" onClick={downloadCsv} title={t(lang, 'Download elevation profile as CSV')}>CSV</button>
            <button className="btn ghost" onClick={downloadGeoJson} title={t(lang, 'Download elevation profile as GeoJSON')}>GeoJSON</button>
          </>
        )}
        <button className="btn ghost" onClick={onUndo} disabled={!points}>{t(lang, 'Undo point')}</button>
      </div>
      {points < 2 && <p className="muted">{t(lang, 'Click at least two points. Elevation comes from open elevation tiles and is approximate (about 50 to 100 m resolution).')}</p>}
      {busy && <p className="muted">{t(lang, 'Reading elevation…')}</p>}
      {points > 1 && !busy && !profile && <p className="error">{t(lang, 'Elevation data is unavailable for this line. No profile values have been estimated.')}</p>}
      {profile && (
        <>
          <div className="stats">
            <span><b>{profile.totalKm.toFixed(1)} km</b> {t(lang, 'length')}</span><span><b>{Math.round(profile.min)}–{Math.round(profile.max)} m</b> {t(lang, 'elevation')}</span>
            <span><b>{Math.round(profile.gain)} m</b> {t(lang, 'climb')}</span><span><b>{Math.round(profile.loss)} m</b> {t(lang, 'descent')}</span>
            <span><b>{profile.steepest.toFixed(0)}°</b> {t(lang, 'steepest step*')}</span>
          {profile.faultDataAvailable && <span><b>{profile.crossings.length}</b> {t(lang, profile.crossings.length === 1 ? 'mapped fault crossed' : 'mapped faults crossed')}</span>}
          </div>
          {profile.availableSamples < profile.elev.length && <p className="muted small">{t(lang, 'Some elevation samples are unavailable; gaps are left blank and summary values use available samples only.')}</p>}
          {chart}
          {profile.crossings.length > 0 && <ul className="crossings">{profile.crossings.map((c, i) => <li key={i}><b>{c.km.toFixed(1)} km</b>: {t(lang, c.label)}{c.props.rate != null ? `, ${c.props.rate} mm/yr` : ''}</li>)}</ul>}
          {!profile.faultDataAvailable && <p className="muted small">{t(lang, 'No mapped fault data is available, so fault crossings cannot be assessed.')}</p>}
          <p className="muted small">{t(lang, '*Between neighbouring samples, so it understates local slope.')}{profile.faultDataAvailable ? ` ${t(lang, 'Fault crossings come from an incomplete fault map.')}` : ''}</p>
        </>
      )}
    </section>
  );
}

export function WeatherPanel({
  site,
  loading,
  error,
  elevation,
  slope,
  onClose,
  lang,
}: {
  site: SiteWatch | null;
  loading: boolean;
  error: string | null;
  elevation: number | null;
  slope: number | null;
  onClose: () => void;
  lang: Lang;
}) {
  const maxRain = site?.days && site.days.length ? Math.max(5, ...site.days.map((d) => d.rain)) : 10;
  const W = 320, H = 80, barW = 20, gap = 8, padX = 14;

  return (
    <section className="panel weather-panel">
      {loading && <p className="muted">{t(lang, 'Loading live weather…')}</p>}
      {error && <p className="error">{error || t(lang, 'Weather could not be loaded.')}</p>}

      {!loading && !error && site && (
        <>
          <div className="weather-site-header">
            <div className="weather-site-name">{site.name}</div>
            {(elevation != null || slope != null) && (
              <div className="weather-site-topo">
                {elevation != null && <span><b>{formatNumber(lang, elevation)}</b> {t(lang, 'm')}</span>}
                {elevation != null && slope != null && <span className="hud-sep"> · </span>}
                {slope != null && <span><b>{slope}°</b> {t(lang, 'slope')}</span>}
              </div>
            )}
          </div>

          <div className="weather-badges">
            <span className={`pill lv-${site.level}`}>
              {t(lang, site.level === 'nodata' ? 'No data' : site.level === 'elevated' ? 'Elevated' : site.level === 'watch' ? 'Watch' : 'Low')}
            </span>
            {site.melt && <span className="pill lv-elevated">⚠ {t(lang, 'Warm after snow')}</span>}
          </div>

          <div className="weather-stats-grid">
            <div className="weather-stat-card">
              <span className="stat-label">{t(lang, 'Past 3 days')}</span>
              <span className="stat-val">{site.rainPast3 != null ? `${site.rainPast3.toFixed(0)} mm` : '–'}</span>
            </div>
            <div className="weather-stat-card">
              <span className="stat-label">{t(lang, 'Past 7 days')}</span>
              <span className="stat-val">{site.rainPast7 != null ? `${site.rainPast7.toFixed(0)} mm` : '–'}</span>
            </div>
            <div className="weather-stat-card">
              <span className="stat-label">{t(lang, 'Next 3 days')}</span>
              <span className="stat-val">{site.rainNext3 != null ? `${site.rainNext3.toFixed(0)} mm` : '–'}</span>
            </div>
            <div className="weather-stat-card">
              <span className="stat-label">{t(lang, 'Snow 7d')}</span>
              <span className="stat-val">{site.snowPast7 != null ? `${site.snowPast7.toFixed(0)} cm` : '–'}</span>
            </div>
            <div className="weather-stat-card">
              <span className="stat-label">{t(lang, 'Max temp')}</span>
              <span className="stat-val">{site.tmax != null ? `${site.tmax > 0 ? '+' : ''}${site.tmax.toFixed(0)}°C` : '–'}</span>
            </div>
          </div>

          {site.days && site.days.length > 0 && (
            <div className="weather-chart-wrap">
              <div className="weather-chart-label">{t(lang, '10-day precipitation history & forecast (mm)')}</div>
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t(lang, '10-day precipitation history & forecast (mm)')} className="weather-svg">
                {site.days.map((d, i) => {
                  const x = padX + i * (barW + gap);
                  const barH = Math.max(3, (d.rain / maxRain) * (H - 28));
                  const y = H - 18 - barH;
                  const isFuture = i >= 7;
                  const isToday = i === 6;
                  const dayNum = d.date.slice(8);
                  return (
                    <g key={d.date}>
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx="3"
                        fill={isToday ? 'var(--accent)' : isFuture ? '#4fa3e3' : 'var(--muted)'}
                        opacity={isToday ? 1 : isFuture ? 0.9 : 0.65}
                      />
                      {d.rain > 0 && (
                        <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--ink)">
                          {d.rain.toFixed(0)}
                        </text>
                      )}
                      <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9.5" fill="var(--muted)">
                        {dayNum}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}

          <p className="muted small">{t(lang, 'Heuristic screening from Open-Meteo. Not an official warning.')}</p>
        </>
      )}
    </section>
  );
}

export interface LocateData {
  lon: number;
  lat: number;
  elevation: number | null;
  slope: number | null;
  faultKm: number | null;
  faultSlip: string | null;
  inside: boolean;
  siteWatch: SiteWatch | null;
  weatherLoading: boolean;
  weatherError: string | null;
}

export function LocatePanel({
  data,
  onClose,
  lang,
}: {
  data: LocateData;
  onClose: () => void;
  lang: Lang;
}) {
  const { lon, lat, elevation, slope, faultKm, faultSlip, inside, siteWatch, weatherLoading, weatherError } = data;
  const ns = lat >= 0 ? `${lat.toFixed(3)}° N` : `${Math.abs(lat).toFixed(3)}° S`;
  const ew = lon >= 0 ? `${lon.toFixed(3)}° E` : `${Math.abs(lon).toFixed(3)}° W`;

  let slopeCategory = { label: 'Gentle slope', badgeClass: 'pill normal' };
  if (slope != null) {
    if (slope >= 45) slopeCategory = { label: 'Very steep cliff', badgeClass: 'pill warning' };
    else if (slope >= 25) slopeCategory = { label: 'Critical slope', badgeClass: 'pill warning' };
    else if (slope >= 15) slopeCategory = { label: 'Moderate slope', badgeClass: 'pill watch' };
  }

  return (
    <section className="panel locate-panel">
      <div className="locate-coords">
        <span><b>{ns}, {ew}</b></span>
        <span className={`pill ${inside ? 'normal' : 'watch'}`}>
          {t(lang, inside ? 'Inside Kazakhstan' : 'Outside Kazakhstan')}
        </span>
      </div>

      <div className="locate-stats-grid">
        <div className="locate-stat-card">
          <span className="stat-label">{t(lang, 'elevation')}</span>
          <span className="stat-val">
            {elevation != null ? `${formatNumber(lang, elevation)} m` : '–'}
          </span>
        </div>
        <div className="locate-stat-card">
          <span className="stat-label">{t(lang, 'Slope angle')}</span>
          <span className="stat-val">
            {slope != null ? `${slope}°` : '–'}
          </span>
          <span className={slopeCategory.badgeClass} style={{ fontSize: '10px', marginTop: '2px' }}>
            {t(lang, slopeCategory.label)}
          </span>
        </div>
        <div className="locate-stat-card">
          <span className="stat-label">{t(lang, 'Active faults')}</span>
          <span className="stat-val">
            {faultKm != null ? `${faultKm.toFixed(1)} km` : '–'}
          </span>
          {faultSlip && <span className="stat-sub">{faultSlip}</span>}
        </div>
      </div>

      {weatherLoading && <p className="muted small">{t(lang, 'Loading live weather…')}</p>}
      {weatherError && <p className="error small">{weatherError}</p>}
      {siteWatch && (
        <div className="locate-weather-section">
          <div className="locate-weather-header">
            <span className="stat-label">{t(lang, 'Rain screening')}</span>
            <span className={`pill lv-${siteWatch.level}`}>
              {t(lang, siteWatch.level === 'nodata' ? 'No data' : siteWatch.level === 'elevated' ? 'Elevated' : siteWatch.level === 'watch' ? 'Watch' : 'Low')}
            </span>
          </div>
          <div className="locate-rain-row">
            <span>{t(lang, 'Past 3 days')}: <b>{siteWatch.rainPast3 != null ? `${siteWatch.rainPast3.toFixed(0)} mm` : '–'}</b></span>
            <span>{t(lang, 'Past 7 days')}: <b>{siteWatch.rainPast7 != null ? `${siteWatch.rainPast7.toFixed(0)} mm` : '–'}</b></span>
            <span>{t(lang, 'Next 3 days')}: <b>{siteWatch.rainNext3 != null ? `${siteWatch.rainNext3.toFixed(0)} mm` : '–'}</b></span>
          </div>
          {siteWatch.melt && <div className="melt-warning" style={{ fontSize: '11px', marginTop: '4px' }}>⚠ {t(lang, 'Warm after snow')}</div>}
        </div>
      )}

      <p className="muted small" style={{ marginTop: '8px' }}>
        {t(lang, 'Heuristic screening from Open-Meteo. Not an official warning.')}
      </p>
    </section>
  );
}
