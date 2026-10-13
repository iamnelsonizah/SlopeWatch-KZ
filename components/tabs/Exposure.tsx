'use client';

import { useMemo, useState } from 'react';
import { segments, haversineKm } from '@/lib/geo';
import type { FC, Lang, LoadState, Quake } from '@/lib/types';
import { formatNumber, localCity, localName, localRegion, t } from '@/lib/i18n';

export default function Exposure({ cities, faults, quakes, quakeState, lang, onDataHelp }: { cities: FC; faults: FC; quakes: Quake[]; quakeState: LoadState; lang: Lang; onDataHelp: () => void }) {
  const [maxKm, setMaxKm] = useState(60);
  const segs = useMemo(() => segments(faults, (p) => p.kind === 'fault'), [faults]);
  const rows = useMemo(() => cities.features.map((f) => {
    const p = f.properties as any; const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates;
    const q = quakes.filter((x) => x.mag >= 4 && haversineKm([lon, lat], [x.lon, x.lat]) <= 50).length;
    return { name: p.name as string, pop: p.pop as number, region: p.region as string, km: p.faultKm as number, q4: q };
  }).filter((r) => r.km <= maxKm).sort((a, b) => a.km - b.km), [cities, quakes, maxKm]);
  const exposed = rows.reduce((s, r) => s + r.pop, 0);
  const faultDataAvailable = segs.length > 0;
  return (
    <section className="page">
      <h2>{t(lang, 'Exposure')}</h2>
      <p className="lede">{t(lang, 'Which cities lie close to a mapped active fault?')}</p>
      <p className="muted">{t(lang, 'Distances use the GEM Global Active Faults database, whose coverage in Kazakhstan is incomplete, so a long distance never means "safe".')}</p>
      {faultDataAvailable && cities.features.length > 0 && <label className="inline">{t(lang, 'Show cities within')} <b>{maxKm} km</b> {t(lang, 'of a mapped fault')}
        <input type="range" min={5} max={300} step={5} value={maxKm} onChange={(e) => setMaxKm(+e.target.value)} />
      </label>}
      {!faultDataAvailable && <p className="callout">{t(lang, 'Mapped fault data is unavailable, so distances are not shown.')}</p>}
      {cities.features.length === 0 && <p className="callout">{t(lang, 'City data is unavailable.')}</p>}
      {quakeState === 'loading' && <p className="muted">{t(lang, 'Earthquake data is loading; counts are not shown yet.')}</p>}
      {quakeState === 'error' && <p className="callout">{t(lang, 'Earthquake data is unavailable; earthquake counts are not shown.')}</p>}
      {faultDataAvailable && cities.features.length > 0 && <p><b>{formatNumber(lang, rows.length)}</b> {t(lang, 'cities, about')} <b>{formatNumber(lang, exposed)}</b> {t(lang, 'people (Natural Earth populations; older figures).')}</p>}
      {faultDataAvailable && cities.features.length > 0 && <>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t(lang, 'City')}</th><th>{t(lang, 'Region')}</th><th>{t(lang, 'Population')}</th><th>{t(lang, 'Nearest mapped fault (km)')}</th><th>{t(lang, 'M4+ quakes within 50 km since 1990')}</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><td>{localCity(r.name, lang)}</td><td>{localRegion(r.region, lang)}</td><td>{formatNumber(lang, r.pop)}</td><td>{formatNumber(lang, r.km, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td><td>{quakeState === 'ok' ? formatNumber(lang, r.q4) : '–'}</td></tr>)}</tbody>
        </table>
      </div>
      </>}
      <h3>{t(lang, 'Dams and reservoirs')}</h3>
      <div className="callout data-gap"><p>{t(lang, 'No verified national infrastructure inventory is connected, so dam and reservoir exposure is not calculated.')}</p><button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></div>
    </section>
  );
}
