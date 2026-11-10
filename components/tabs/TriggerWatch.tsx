'use client';

import { haversineKm } from '@/lib/geo';
import { THRESHOLDS } from '@/lib/triggers';
import type { Lang, LoadState, Quake, SiteWatch } from '@/lib/types';
import { formatNumber, localName, t } from '@/lib/i18n';

const LEVEL_LABEL = { low: 'Low', watch: 'Watch', elevated: 'Elevated', nodata: 'No data' } as const;
const ORDER = { elevated: 0, watch: 1, low: 2, nodata: 3 } as const;

/** Ten daily bars: seven past days, today (outlined), two forecast days (hatched colour). */
function RainBars({ site, label }: { site: SiteWatch; label: string }) {
  const W = 250, H = 62, n = site.days.length || 10, bw = W / n;
  const max = Math.max(10, ...site.days.map((d) => d.rain));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="rain-bars">
      <line x1="0" x2={W} y1={H - 14} y2={H - 14} stroke="var(--line)" />
      {site.days.map((d, i) => {
        const h = (d.rain / max) * (H - 24);
        return (
          <g key={d.date}>
            <rect x={i * bw + 2} y={H - 14 - Math.max(h, d.rain > 0 ? 1.5 : 0)} width={bw - 4} height={Math.max(h, d.rain > 0 ? 1.5 : 0)} className={i === 7 ? 'today' : i > 7 ? 'future' : 'past'}><title>{`${d.date}: ${d.rain.toFixed(1)} mm`}</title></rect>
            <text x={i * bw + bw / 2} y={H - 3} textAnchor="middle" className={`chart-tick${i === 7 ? ' strong' : ''}`}>{d.date.slice(8)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TriggerWatch({ sites, state, quakes, lang, onDataHelp }: { sites: SiteWatch[] | null; state: LoadState; quakes: Quake[]; lang: Lang; onDataHelp: () => void }) {
  const month = Date.now() - 30 * 86400_000;
  const near = (s: SiteWatch) => quakes.filter((q) => q.time >= month && q.mag >= 4 && haversineKm([s.lon, s.lat], [q.lon, q.lat]) <= 100).length;
  const mm = (v: number | null) => (v == null ? '–' : formatNumber(lang, v, { maximumFractionDigits: 0 }));
  return (
    <section className="page page-wide">
      <h2>{t(lang, 'Trigger watch')}</h2>
      <p className="lede">{t(lang, 'Rain, melt and earthquakes are the usual triggers of slope failures and mudflows in the mountains of southeast and east Kazakhstan. This page screens 11 sites using the Open-Meteo forecast and the USGS earthquake catalogue.')}</p>
      <div className="callout">
        <b>{t(lang, 'Screening rule:')}</b> {t(lang, 'Watch at {watch3} mm in 3 days or {watch7} mm in 7 days; Elevated at {elevated3} mm in 3 days or {elevated7} mm in 7 days.', { watch3: THRESHOLDS.watch3, watch7: THRESHOLDS.watch7, elevated3: THRESHOLDS.elevated3, elevated7: THRESHOLDS.elevated7 })} {t(lang, 'These are generic starting values, not calibrated to local slopes or soils. Open-Meteo provides model-based estimates for reference points, not mountain rain-gauge observations; local conditions can differ. This is not an official warning: follow the national hydrometeorological and emergency services.')}
      </div>
      {state === 'loading' && <p className="muted">{t(lang, 'Loading forecast…')}</p>}
      {state === 'error' && <div className="callout data-gap" role="status"><b>{t(lang, 'No available data')}</b><p>{t(lang, 'Open-Meteo weather feed is unavailable. No trigger levels are shown or estimated.')}</p><button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></div>}
      {sites && (
        <>
          <p className="chart-key"><span><i className="key-past" />{t(lang, 'Past days')}</span><span><i className="key-today" />{t(lang, 'Today')}</span><span><i className="key-future" />{t(lang, 'Forecast')}</span><span className="muted">{t(lang, 'Daily rain in mm; bar heights are scaled per site')}</span></p>
          <ul className="watch-cards">
            {[...sites].sort((a, b) => ORDER[a.level] - ORDER[b.level] || (b.rainNext3 ?? -1) - (a.rainNext3 ?? -1)).map((s) => (
              <li key={s.name} className={`watch-card lv-${s.level}`}>
                <div className="watch-head"><strong>{localName(s.name, lang)}</strong><span className={`pill lv-${s.level}`}>{t(lang, LEVEL_LABEL[s.level])}</span></div>
                {s.days.length > 0 && <RainBars site={s} label={t(lang, '10-day precipitation history & forecast (mm)')} />}
                <dl>
                  <div><dt>{t(lang, 'Last 3 days')}</dt><dd>{mm(s.rainPast3)}<small>mm</small></dd></div>
                  <div><dt>{t(lang, 'Last 7 days')}</dt><dd>{mm(s.rainPast7)}<small>mm</small></dd></div>
                  <div><dt>{t(lang, 'Next 3 days')}</dt><dd>{mm(s.rainNext3)}<small>mm</small></dd></div>
                </dl>
                <p className="watch-note">
                  {t(lang, 'Snow, 7 days')}: <b>{mm(s.snowPast7)} cm</b>
                  {s.melt && <> · <span className="pill lv-watch">{t(lang, 'Warm after snow')}</span></>}
                  {quakes.length > 0 && <> · {t(lang, 'M4+ within 100 km, 30 days')}: <b>{formatNumber(lang, near(s))}</b></>}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
