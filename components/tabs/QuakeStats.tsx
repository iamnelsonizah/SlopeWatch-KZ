'use client';

import { useMemo, useState } from 'react';
import { Bars } from '../Charts';
import type { Lang, LoadState, Quake } from '@/lib/types';
import { formatNumber, localQuakePlace, localRegion, t } from '@/lib/i18n';

export default function QuakeStats({ quakes, state, truncated, lang }: { quakes: Quake[]; state: LoadState; truncated: boolean; lang: Lang }) {
  const [insideOnly, setInsideOnly] = useState(true);
  const [minMag, setMinMag] = useState(4);
  const list = useMemo(() => quakes.filter((q) => (!insideOnly || q.inside) && q.mag >= minMag), [quakes, insideOnly, minMag]);
  const years = useMemo(() => { const m = new Map<number, number>(); list.forEach((q) => { const y = new Date(q.time).getUTCFullYear(); m.set(y, (m.get(y) ?? 0) + 1); }); return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k: String(k).slice(2), v })); }, [list]);
  const mags = useMemo(() => { const bins = new Map<number, number>(); list.forEach((q) => { const b = Math.floor(q.mag * 2) / 2; bins.set(b, (bins.get(b) ?? 0) + 1); }); return [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k: k.toFixed(1), v })); }, [list]);
  const regions = useMemo(() => { const m = new Map<string, number>(); list.filter((q) => q.region).forEach((q) => m.set(q.region, (m.get(q.region) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); }, [list]);
  const top = useMemo(() => [...list].sort((a, b) => b.mag - a.mag).slice(0, 10), [list]);
  return (
    <section className="page">
      <h2>{t(lang, 'Earthquake statistics')}</h2>
      <p className="lede">{t(lang, 'Events from the USGS catalogue since 1990 in and around Kazakhstan. Earthquakes are the main non-weather trigger of large slope failures here.')}</p>
      {state === 'loading' && <p className="muted">{t(lang, 'Loading earthquakes…')}</p>}
      {state === 'error' && <p className="error">{t(lang, 'The earthquake catalogue could not be loaded. Check your connection and reload.')}</p>}
      {truncated && <p className="callout">{t(lang, 'The catalogue query hit its 20,000 event limit; older or smaller events may be missing.')}</p>}
      {state === 'ok' && (
        <>
          <div className="controls">
            <label className="inline"><input type="checkbox" checked={insideOnly} onChange={(e) => setInsideOnly(e.target.checked)} /> {t(lang, 'Only inside Kazakhstan')}</label>
            <label className="inline">{t(lang, 'Minimum magnitude')} <b>{minMag.toFixed(1)}</b><input type="range" min={3} max={6} step={0.1} value={minMag} onChange={(e) => setMinMag(+e.target.value)} /></label>
          </div>
          <p><b>{formatNumber(lang, list.length)}</b> {t(lang, 'events selected.')}</p>
          <div className="stat-grid">
            <div className="stat-card"><h3>{t(lang, 'Events per year')}</h3><Bars data={years} label={t(lang, 'Events per year')} /><p className="muted small">{t(lang, 'Catalogue completeness changes over time, so counts before about 2000 are not comparable.')}</p></div>
            <div className="stat-card"><h3>{t(lang, 'By magnitude')}</h3><Bars data={mags} label={t(lang, 'Earthquake statistics')} color="#d62f4b" /></div>
            <div className="stat-card"><h3>{t(lang, 'Regions with most events')}</h3>
              {regions.length === 0 ? <p className="muted">{t(lang, 'No events with a region in this selection.')}</p> : regions.map(([r, n]) => <div className="hbar" key={r}><span className="hbar-name">{localRegion(r, lang)}</span><span className="hbar-track"><span style={{ width: `${(n / regions[0][1]) * 100}%`, background: 'var(--accent)' }} /></span><span className="hbar-val">{formatNumber(lang, n)}</span></div>)}
            </div>
            <div className="stat-card"><h3>{t(lang, 'Ten largest')}</h3>
              <table><tbody>{top.map((q) => <tr key={q.id}><td><b>M {q.mag.toFixed(1)}</b></td><td>{new Date(q.time).toLocaleDateString(lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-CA')}</td><td>{localQuakePlace(q.place, lang)}</td></tr>)}</tbody></table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
