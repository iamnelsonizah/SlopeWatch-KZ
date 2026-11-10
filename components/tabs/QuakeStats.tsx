'use client';

import { useMemo, useState } from 'react';
import { Bars, FmdChart } from '../Charts';
import Icon from '../Icon';
import { download, quakesCsv, quakesGeoJson, today } from '@/lib/export';
import { DEPTH_CLASSES, frequencyMagnitude, magTypeGroup } from '@/lib/seismo';
import type { Lang, LoadState, Quake } from '@/lib/types';
import { formatNumber, localQuakePlace, localRegion, t } from '@/lib/i18n';

const HBar = ({ name, n, max, color = 'var(--accent)', lang }: { name: string; n: number; max: number; color?: string; lang: Lang }) => (
  <div className="hbar"><span className="hbar-name">{name}</span><span className="hbar-track"><span style={{ width: `${(n / Math.max(1, max)) * 100}%`, background: color }} /></span><span className="hbar-val">{formatNumber(lang, n)}</span></div>
);

export default function QuakeStats({ quakes, state, truncated, lang }: { quakes: Quake[]; state: LoadState; truncated: boolean; lang: Lang }) {
  const [insideOnly, setInsideOnly] = useState(true);
  const [minMag, setMinMag] = useState(4);
  const area = useMemo(() => quakes.filter((q) => !insideOnly || q.inside), [quakes, insideOnly]);
  const list = useMemo(() => area.filter((q) => q.mag >= minMag), [area, minMag]);
  const fmd = useMemo(() => frequencyMagnitude(area), [area]);
  const years = useMemo(() => { const m = new Map<number, number>(); list.forEach((q) => { const y = new Date(q.time).getUTCFullYear(); m.set(y, (m.get(y) ?? 0) + 1); }); return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ k: String(k).slice(2), v })); }, [list]);
  const regions = useMemo(() => { const m = new Map<string, number>(); list.filter((q) => q.region).forEach((q) => m.set(q.region, (m.get(q.region) ?? 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8); }, [list]);
  const depths = useMemo(() => DEPTH_CLASSES.map((c) => ({ ...c, n: list.filter((q) => q.depth != null && q.depth >= c.from && q.depth < c.to).length })), [list]);
  const noDepth = list.filter((q) => q.depth == null).length;
  const scales = useMemo(() => { const m = new Map<string, number>(); list.forEach((q) => { const g = magTypeGroup(q.magType); m.set(g, (m.get(g) ?? 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [list]);
  const top = useMemo(() => [...list].sort((a, b) => b.mag - a.mag).slice(0, 10), [list]);
  const selection = `${insideOnly ? 'inside Kazakhstan' : 'Kazakhstan and about 100 km around it'}, M>=${minMag.toFixed(1)}, 1990-01-01 to ${today()}`;
  const dateLocale = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : 'en-CA';

  return (
    <section className="page page-wide">
      <h2>{t(lang, 'Earthquake statistics')}</h2>
      <p className="lede">{t(lang, 'Events from the USGS catalogue since 1990 in and around Kazakhstan. Earthquakes are the main non-weather trigger of large slope failures here.')}</p>
      {state === 'loading' && <p className="muted">{t(lang, 'Loading earthquakes…')}</p>}
      {state === 'error' && <p className="error">{t(lang, 'The earthquake catalogue could not be loaded. Check your connection and reload.')}</p>}
      {truncated && <p className="callout">{t(lang, 'The catalogue query hit its 20,000 event limit; older or smaller events may be missing.')}</p>}
      {state === 'ok' && (
        <>
          <div className="controls">
            <div className="seg" role="group" aria-label={t(lang, 'Area')}>
              <button className={insideOnly ? 'on' : ''} aria-pressed={insideOnly} onClick={() => setInsideOnly(true)}>{t(lang, 'Inside Kazakhstan')}</button>
              <button className={!insideOnly ? 'on' : ''} aria-pressed={!insideOnly} onClick={() => setInsideOnly(false)}>{t(lang, 'Plus 100 km around')}</button>
            </div>
            <label className="inline">{t(lang, 'Minimum magnitude')} <b>{minMag.toFixed(1)}</b><input type="range" min={3} max={6} step={0.1} value={minMag} onChange={(e) => setMinMag(+e.target.value)} /></label>
            <span className="spacer" />
            <button className="btn" onClick={() => download(`slopewatch-kz-earthquakes-${today()}.csv`, quakesCsv(list, selection), 'text/csv;charset=utf-8')}><Icon name="download" />CSV</button>
            <button className="btn" onClick={() => download(`slopewatch-kz-earthquakes-${today()}.geojson`, quakesGeoJson(list, selection), 'application/geo+json;charset=utf-8')}><Icon name="download" />GeoJSON</button>
          </div>

          <dl className="figures">
            <div><dt>{t(lang, 'Events selected')}</dt><dd>{formatNumber(lang, list.length)}</dd></div>
            <div><dt>{t(lang, 'Largest')}</dt><dd>{top[0] ? `M ${top[0].mag.toFixed(1)}` : '–'}<small>{top[0] ? new Date(top[0].time).getUTCFullYear() : ''}</small></dd></div>
            <div><dt>{t(lang, 'Completeness, Mc')}</dt><dd>{fmd.mc != null ? fmd.mc.toFixed(1) : '–'}<small>{t(lang, 'estimated')}</small></dd></div>
            <div><dt>{t(lang, 'b-value')}</dt><dd>{fmd.b != null ? fmd.b.toFixed(2) : '–'}<small>{fmd.b != null && fmd.bErr != null ? `± ${fmd.bErr.toFixed(2)} · n ${formatNumber(lang, fmd.nAbove)}` : t(lang, 'too few events')}</small></dd></div>
          </dl>

          <div className="stat-grid">
            <div className="stat-card span-2">
              <h3>{t(lang, 'Frequency and magnitude')}</h3>
              <FmdChart fmd={fmd} label={t(lang, 'Frequency and magnitude')} labels={{ cumulative: t(lang, 'Events at or above each magnitude'), perBin: t(lang, 'Events in each 0.1 bin'), fit: t(lang, 'Gutenberg-Richter fit above Mc'), magnitude: t(lang, 'Magnitude (as catalogued)'), count: t(lang, 'Number of events (log scale)') }} />
              <p className="muted small">{t(lang, 'This plot uses every catalogued event in the chosen area (M3 and above), not the magnitude slider. Mc is the maximum-curvature estimate plus 0.2; b is the Aki-Utsu maximum-likelihood value with the Shi and Bolt standard error. Below Mc the catalogue is incomplete, so counts of small events must not be read as real rates.')}</p>
              <p className="muted small">{t(lang, 'USGS magnitudes mix scales: most events here are body-wave magnitudes (mb), larger ones are moment magnitudes (Mw). The b-value therefore describes this catalogue as published and is not a substitute for a homogenised regional catalogue.')}</p>
            </div>
            <div className="stat-card"><h3>{t(lang, 'Events per year')}</h3><Bars data={years} label={t(lang, 'Events per year')} /><p className="muted small">{t(lang, 'Catalogue completeness changes over time, so counts before about 2000 are not comparable.')}</p></div>
            <div className="stat-card"><h3>{t(lang, 'Depth')}</h3>
              {depths.map((d) => <HBar key={d.label} name={t(lang, d.label)} n={d.n} max={Math.max(...depths.map((x) => x.n))} color={d.color} lang={lang} />)}
              <p className="muted small">{noDepth > 0 ? t(lang, '{n} events have no depth. ', { n: noDepth }) : ''}{t(lang, 'Many catalogue depths are fixed by the analyst (often at 10 or 33 km) and are not measured values.')}</p>
            </div>
            <div className="stat-card"><h3>{t(lang, 'Magnitude scale')}</h3>
              {scales.map(([s, n]) => <HBar key={s} name={s === 'other' ? t(lang, 'Other') : s} n={n} max={scales[0][1]} color="var(--muted)" lang={lang} />)}
              <p className="muted small">{t(lang, 'mb saturates above about M 6, so it understates the largest events.')}</p>
            </div>
            <div className="stat-card"><h3>{t(lang, 'Regions with most events')}</h3>
              {regions.length === 0 ? <p className="muted">{t(lang, 'No events with a region in this selection.')}</p> : regions.map(([r, n]) => <HBar key={r} name={localRegion(r, lang)} n={n} max={regions[0][1]} lang={lang} />)}
            </div>
            <div className="stat-card span-2"><h3>{t(lang, 'Ten largest')}</h3>
              <div className="table-wrap flush"><table className="compact">
                <thead><tr><th>M</th><th>{t(lang, 'Scale')}</th><th>{t(lang, 'Date')}</th><th>{t(lang, 'Depth')}</th><th>{t(lang, 'Place')}</th><th><span className="sr-only">USGS</span></th></tr></thead>
                <tbody>{top.map((q) => <tr key={q.id}><td><b>{q.mag.toFixed(1)}</b></td><td>{q.magType || '–'}</td><td>{new Date(q.time).toLocaleDateString(dateLocale, { timeZone: 'UTC' })}</td><td>{q.depth == null ? '–' : `${q.depth.toFixed(0)} km`}</td><td>{localQuakePlace(q.place, lang)}</td><td>{q.url && <a href={q.url} target="_blank" rel="noreferrer" aria-label={t(lang, 'Open the USGS event page')}><Icon name="external" size={14} /></a>}</td></tr>)}</tbody>
              </table></div>
            </div>
          </div>
          <p className="callout">{t(lang, 'USGS ComCat is a global catalogue. For research on Kazakhstan, compare it with the national networks (Institute of Seismology; Kazakhstan National Data Centre) and the ISC Bulletin, which record many more small events.')}</p>
        </>
      )}
    </section>
  );
}
