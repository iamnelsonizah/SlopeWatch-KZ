'use client';

import { REGIONS, SORTS, TYPE_META, TYPE_ORDER, detailText, nameOf, regionOf, typeLabel, triggerOf, type SortId } from '@/lib/events';
import type { Lang, Place, PlaceType } from '@/lib/types';
import { formatNumber, t } from '@/lib/i18n';

export interface Filters { q: string; region: string; verification: string; sort: SortId }
interface Props {
  filters: Filters; setFilters: (f: Filters) => void; types: Set<PlaceType>; toggleType: (t: PlaceType) => void;
  counts: Record<string, number>; shown: Place[]; lang: Lang; selectedId: string | null; onSelect: (id: string | null) => void; onReset: () => void; inventoryNote: string; onDataHelp: () => void;
}

export default function Sidebar({ filters, setFilters, types, toggleType, counts, shown, lang, selectedId, onSelect, onReset, inventoryNote, onDataHelp }: Props) {
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  return (
    <aside className="sidebar">
      <div className="side-head">
        <label className="search">
          <span className="sr-only">{t(lang, 'Search')}</span>
          <input type="search" value={filters.q} onChange={(e) => set({ q: e.target.value })} placeholder={t(lang, 'Search an event or place (Medeu, Kebin, Алматы)')} />
        </label>
        <h2 className="side-label">{t(lang, 'Show')}</h2>
        <div className="chips">
          {TYPE_ORDER.map((t) => (
            <button key={t} className={`chip ${types.has(t) ? 'on' : ''}`} onClick={() => toggleType(t)} aria-pressed={types.has(t)}>
              <i style={{ background: TYPE_META[t].color }} />{typeLabel(t, lang, true)}<span>{formatNumber(lang, counts[t] ?? 0)}</span>
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
          <label>{t(lang, 'Sort')}
            <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortId })}>{SORTS.map((s) => <option key={s.id} value={s.id}>{t(lang, s.label)}</option>)}</select>
          </label>
        </div>
      </div>
      <div className="count-row"><span>{formatNumber(lang, shown.length)} {t(lang, 'records shown')}</span><button onClick={onReset}>{t(lang, 'Reset filters')}</button></div>
      <ul className="list">
        {shown.length === 0 && <li className="empty">{t(lang, 'Nothing matches. Clear a filter or search for a different name.')}</li>}
        {shown.map((p) => (
          <li key={p.id}>
            <button className={`item ${selectedId === p.id ? 'sel' : ''}`} onClick={() => onSelect(p.id)}>
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
      </ul>
      {inventoryNote && <p className="side-limit"><b>{t(lang, 'Limit:')}</b> {inventoryNote}<button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></p>}
    </aside>
  );
}
