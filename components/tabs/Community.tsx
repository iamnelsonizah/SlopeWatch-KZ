'use client';

import { CAT_LABEL } from '@/lib/labels';
import type { Report } from '@/lib/types';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import { download, today } from '@/lib/export';
import Icon from '../Icon';

export default function Community({ reports, onReport, onShow, lang }: { reports: Report[]; onReport: () => void; onShow: (r: Report) => void; lang: Lang }) {
  return (
    <section className="page">
      <h2>{t(lang, 'Community hub')}</h2>
      <p className="lede">{t(lang, 'Residents, hikers and field staff can note slope hazards on the map. For now a note is stored only in the browser it was written in: the atlas has no report server yet, so notes are not shared or moderated. You can email a note to the atlas team or download your notes as a file.')}</p>
      <button className="btn primary" onClick={onReport}>{t(lang, 'Report a slope hazard on the map')}</button>
      <p className="callout">{t(lang, 'Not for emergencies. If anyone is in danger, call 112. Nobody monitors these notes.')}</p>
      <h3>{t(lang, 'Notes on this device')} ({reports.length})</h3>
      {reports.length > 0 && <button className="btn" onClick={() => download(`slopewatch-kz-my-notes-${today()}.geojson`, JSON.stringify({ type: 'FeatureCollection', features: reports.map((r) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [r.lon, r.lat] }, properties: { category: r.category, description: r.description, createdAt: r.createdAt, verification: r.verification } })) }), 'application/geo+json;charset=utf-8')}><Icon name="download" />{t(lang, 'Download my notes (GeoJSON)')}</button>}
      {reports.length === 0 && <p className="muted">{t(lang, 'No notes on this device yet.')}</p>}
      <div className="report-grid">
        {reports.map((r) => (
          <article key={r.id} className="stat-card">
            {r.photo && <img className="report-img" src={r.photo.startsWith('data:') ? r.photo : `/api/uploads/${r.photo}`} alt={t(lang, 'Photo submitted with the report')} loading="lazy" />}
            <h3>{t(lang, CAT_LABEL[r.category])} <em className={`ver v${r.verification}`}>{r.verification}</em></h3>
            <p className="muted small">{r.createdAt.slice(0, 10)} · {r.lat.toFixed(3)}, {r.lon.toFixed(3)}</p>
            <p>{r.description}</p>
            <button className="btn" onClick={() => onShow(r)}>{t(lang, 'Show on map')}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
