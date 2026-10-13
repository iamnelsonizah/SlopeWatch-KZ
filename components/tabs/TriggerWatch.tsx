'use client';

import { haversineKm } from '@/lib/geo';
import { THRESHOLDS } from '@/lib/triggers';
import type { LoadState, Quake, SiteWatch } from '@/lib/types';
import type { Lang } from '@/lib/types';
import { formatNumber, localName, t } from '@/lib/i18n';

const LEVEL_LABEL = { low: 'Low', watch: 'Watch', elevated: 'Elevated', nodata: 'No data' } as const;

export default function TriggerWatch({ sites, state, quakes, lang, onDataHelp }: { sites: SiteWatch[] | null; state: LoadState; quakes: Quake[]; lang: Lang; onDataHelp: () => void }) {
  const month = Date.now() - 30 * 86400_000;
  const near = (s: SiteWatch) => quakes.filter((q) => q.time >= month && q.mag >= 4 && haversineKm([s.lon, s.lat], [q.lon, q.lat]) <= 100).length;
  const order = { elevated: 0, watch: 1, low: 2, nodata: 3 } as const;
  return (
    <section className="page">
      <h2>{t(lang, 'Trigger watch')}</h2>
      <p className="lede">{t(lang, 'Rain, melt and earthquakes are the usual triggers of slope failures and mudflows in the mountains of southeast and east Kazakhstan. This page screens 11 sites using the Open-Meteo forecast and the USGS earthquake catalogue.')}</p>
      <div className="callout">
        {t(lang, 'Screening rule:')} {t(lang, 'Watch at {watch3} mm in 3 days or {watch7} mm in 7 days; Elevated at {elevated3} mm in 3 days or {elevated7} mm in 7 days.', { watch3: THRESHOLDS.watch3, watch7: THRESHOLDS.watch7, elevated3: THRESHOLDS.elevated3, elevated7: THRESHOLDS.elevated7 })} {t(lang, 'These are generic starting values, not calibrated to local slopes or soils. Open-Meteo provides model-based estimates for reference points, not mountain rain-gauge observations; local conditions can differ. This is not an official warning: follow the national hydrometeorological and emergency services.')}
      </div>
      {state === 'loading' && <p className="muted">{t(lang, 'Loading forecast…')}</p>}
      {state === 'error' && <div className="callout data-gap" role="status"><b>{t(lang, 'No available data')}</b><p>{t(lang, 'Open-Meteo weather feed is unavailable. No trigger levels are shown or estimated.')}</p><button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></div>}
      {sites && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t(lang, 'Site')}</th><th>{t(lang, 'Rain screening')}</th><th>{t(lang, 'Last 3 days (mm)')}</th><th>{t(lang, 'Last 7 days (mm)')}</th><th>{t(lang, 'Next 3 days (mm)')}</th><th>{t(lang, 'Snow, 7 days (cm)')}</th><th>{t(lang, 'Melt flag')}</th><th>{t(lang, 'M4+ within 100 km, 30 days')}</th></tr></thead>
            <tbody>
              {[...sites].sort((a, b) => order[a.level] - order[b.level] || (b.rainNext3 ?? -1) - (a.rainNext3 ?? -1)).map((s) => (
                <tr key={s.name}>
                  <td>{localName(s.name, lang)}</td><td><span className={`pill lv-${s.level}`}>{t(lang, LEVEL_LABEL[s.level])}</span></td>
                  <td>{s.rainPast3 == null ? '–' : formatNumber(lang, s.rainPast3, { maximumFractionDigits: 0 })}</td><td>{s.rainPast7 == null ? '–' : formatNumber(lang, s.rainPast7, { maximumFractionDigits: 0 })}</td><td>{s.rainNext3 == null ? '–' : formatNumber(lang, s.rainNext3, { maximumFractionDigits: 0 })}</td><td>{s.snowPast7 == null ? '–' : formatNumber(lang, s.snowPast7, { maximumFractionDigits: 0 })}</td>
                  <td>{s.tmax == null ? t(lang, 'No data') : s.melt ? t(lang, 'Warm after snow') : '–'}</td><td>{quakes.length ? formatNumber(lang, near(s)) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
