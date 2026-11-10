'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { PLACES, REGIONS, SORTS, TYPE_META, TYPE_ORDER, detailText, nameOf, regionOf, typeLabel, triggerOf, type SortId } from '@/lib/events';
import type { Lang, Place, PlaceType } from '@/lib/types';
import { formatNumber, t } from '@/lib/i18n';
import Icon from './Icon';

export interface Filters { q: string; region: string; verification: string; sort: SortId }
interface Props {
  filters: Filters; setFilters: (f: Filters) => void; types: Set<PlaceType>; toggleType: (t: PlaceType) => void;
  counts: Record<string, number>; shown: Place[]; lang: Lang; selectedId: string | null; onSelect: (id: string | null) => void; onReset: () => void;
  activeFilters: number; inventoryNote: string; onDataHelp: () => void; onDownload: (format: 'csv' | 'geojson') => void;
}

/** a category with no records at all is not offered as a filter */
const TYPE_TOTALS = Object.fromEntries(TYPE_ORDER.map((type) => [type, PLACES.filter((p) => p.type === type).length])) as Record<PlaceType, number>;

type Snap = 'peek' | 'half' | 'full';
const NEXT_SNAP: Record<Snap, Snap> = { peek: 'half', half: 'full', full: 'peek' };

function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return compact;
}

/** Desktop: a fixed column. Phone: a bottom sheet with three resting heights that can be dragged or tapped. */
export default function Sidebar({ filters, setFilters, types, toggleType, counts, shown, lang, selectedId, onSelect, onReset, activeFilters, inventoryNote, onDataHelp, onDownload }: Props) {
  const compact = useCompact();
  const [snap, setSnap] = useState<Snap>('peek');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; h: number; t: number; moved: boolean } | null>(null);

  const snapHeights = () => {
    const parent = sheet.current?.parentElement?.clientHeight ?? window.innerHeight;
    const peek = parseFloat(getComputedStyle(sheet.current!).getPropertyValue('--peek')) || 128;
    return { peek, half: Math.round(parent * 0.52), full: parent - 8 };
  };
  const onHandleDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!sheet.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, h: sheet.current.getBoundingClientRect().height, t: performance.now(), moved: false };
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > 6) d.moved = true;
    if (!d.moved) return;
    const { peek, full } = snapHeights();
    setDragHeight(Math.min(full, Math.max(peek, d.h - dy)));
  };
  const onHandleUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) { setSnap((s) => NEXT_SNAP[s]); return; }
    const h = sheet.current?.getBoundingClientRect().height ?? d.h;
    const velocity = (e.clientY - d.y) / Math.max(1, performance.now() - d.t); // px per ms, positive is downward
    const heights = snapHeights();
    let target: Snap = (Object.keys(heights) as Snap[]).reduce((best, k) => (Math.abs(heights[k] - h) < Math.abs(heights[best] - h) ? k : best), 'peek');
    if (velocity > 0.6) target = h > heights.half ? 'half' : 'peek';
    else if (velocity < -0.6) target = h < heights.half ? 'half' : 'full';
    setDragHeight(null);
    setSnap(target);
    if (target === 'peek') setFiltersOpen(false);
  };

  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const select = (id: string) => { onSelect(id); if (compact) setSnap('peek'); };

  return (
    <aside ref={sheet} className={`sidebar ${filtersOpen ? 'filters-open' : ''} ${dragHeight != null ? 'dragging' : ''}`} data-sheet={snap}
      style={compact && dragHeight != null ? { height: dragHeight } : undefined} aria-label={t(lang, 'Records')}>
      <button type="button" className="sheet-handle" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp}
        onPointerCancel={() => { drag.current = null; setDragHeight(null); }} aria-label={t(lang, snap === 'full' ? 'Collapse list' : 'Expand list')}><span /></button>
      <div className="side-head">
        <label className="search">
          <span className="sr-only">{t(lang, 'Search')}</span>
          <input type="search" value={filters.q} onChange={(e) => set({ q: e.target.value })} onFocus={() => { if (compact && snap === 'peek') setSnap('half'); }} placeholder={t(lang, 'Search an event or place (Medeu, Kebin, Алматы)')} />
        </label>
        <div className="filter-panel">
          <div className="filter-panel-head"><h2>{t(lang, 'Filters')}</h2><button type="button" onClick={onReset}>{t(lang, 'Reset filters')}</button></div>
          <h2 className="side-label">{t(lang, 'Show')}</h2>
          <div className="chips">
            {TYPE_ORDER.filter((type) => TYPE_TOTALS[type] > 0).map((type) => (
              <button key={type} className={`chip ${types.has(type) ? 'on' : ''}`} onClick={() => toggleType(type)} aria-pressed={types.has(type)}>
                <i style={{ background: TYPE_META[type].color }} />{typeLabel(type, lang, true)}<span>{formatNumber(lang, counts[type] ?? 0)}</span>
              </button>
            ))}
          </div>
          <div className="filters">
            <label>{t(lang, 'Region')}
              <select value={filters.region} onChange={(e) => set({ region: e.target.value })}>
                <option value="">{t(lang, 'All regions')}</option>{REGIONS.map((r) => <option key={r} value={r}>{regionOf(r, lang)}</option>)}
              </select>
            </label>
            <label>{t(lang, 'Verification')}
              <select value={filters.verification} onChange={(e) => set({ verification: e.target.value })}>
                <option value="">{t(lang, 'All levels')}</option>
                <option value="A">{t(lang, 'A · well documented')}</option><option value="B">{t(lang, 'B · details approximate')}</option><option value="C">{t(lang, 'C · confirm before use')}</option>
              </select>
            </label>
            <label className="span-2">{t(lang, 'Sort')}
              <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortId })}>{SORTS.map((s) => <option key={s.id} value={s.id}>{t(lang, s.label)}</option>)}</select>
            </label>
          </div>
          <button type="button" className="filter-done" onClick={() => { setFiltersOpen(false); setSnap('half'); }}>{t(lang, 'Show {count} records', { count: shown.length })}</button>
        </div>
      </div>
      <div className="count-row">
        <span>{formatNumber(lang, shown.length)} {t(lang, 'records shown')}</span>
        <button className="reset-btn" onClick={onReset}>{t(lang, 'Reset filters')}</button>
        <button className={`filters-btn ${activeFilters ? 'has' : ''}`} onClick={() => { if (filtersOpen) { setFiltersOpen(false); setSnap('half'); } else { setFiltersOpen(true); setSnap('full'); } }} aria-expanded={filtersOpen}>
          <Icon name="filter" />{t(lang, 'Filters')}{activeFilters > 0 && <b>{activeFilters}</b>}
        </button>
      </div>
      <ul className="list">
        {shown.length === 0 && <li className="empty">{t(lang, 'Nothing matches. Clear a filter or search for a different name.')}</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <button className={`item ${selectedId === p.id ? 'sel' : ''}`} onClick={() => select(p.id)}>
              <i className="dot" style={{ background: TYPE_META[p.type].color }} />
              <span className="item-main">
                <span className="item-title">{nameOf(p, lang)} <em className={`ver v${p.verification}`} title={t(lang, 'Verification level')}>{p.verification}</em></span>
                <span className="item-sub">{typeLabel(p.type, lang)} · {regionOf(p.region, lang)}</span>
                {p.trigger && <span className="item-alt">{t(lang, 'Trigger: ')}{triggerOf(p.trigger, lang)}</span>}
              </span>
              <span className="item-metric">{detailText(p)}</span>
            </button>
          </li>
        ))}
        <li className="list-foot">
          {inventoryNote && <p><b>{t(lang, 'Limit:')}</b> {inventoryNote} <button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></p>}
          <div className="list-foot-actions">
            <span>{t(lang, 'Download these records')}</span>
            <button className="btn small" onClick={() => onDownload('csv')} disabled={!shown.length}><Icon name="download" size={14} />CSV</button>
            <button className="btn small" onClick={() => onDownload('geojson')} disabled={!shown.length}><Icon name="download" size={14} />GeoJSON</button>
          </div>
        </li>
      </ul>
    </aside>
  );
}
