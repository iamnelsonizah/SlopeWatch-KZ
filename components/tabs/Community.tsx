'use client';

import { CAT_LABEL } from '@/lib/labels';
import type { Report } from '@/lib/types';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function Community({ reports, onReport, onShow, lang }: { reports: Report[]; onReport: () => void; onShow: (r: Report) => void; lang: Lang }) {
  return (
    <section className="page">
      <h2>{t(lang, 'Community hub')}</h2>
      <p className="lede">{t(lang, 'Residents, hikers and field staff can report slope hazards. Reports appear on the map as unverified pins (level C). Moderators can raise a report to B or A after checking it, or hide it.')}</p>
      <button className="btn primary" onClick={onReport}>{t(lang, 'Report a slope hazard on the map')}</button>
      <p className="callout">{t(lang, 'Not for emergencies. If anyone is in danger, call 112. Reports are public and are not monitored in real time.')}</p>
      <h3>{t(lang, 'Recent reports')} ({reports.length})</h3>
      {reports.length === 0 && <p className="muted">{t(lang, 'No reports yet.')}</p>}
      <div className="report-grid">
        {reports.map((r) => (
          <article key={r.id} className="stat-card">
            {r.photo && <img className="report-img" src={r.photo.startsWith('data:') ? r.photo : `/api/uploads/${r.photo}`} alt={t(lang, 'Photo submitted with the report')} loading="lazy" />}
            <h3>{t(lang, CAT_LABEL[r.category])} <em className={`ver v${r.verification}`}>{r.verification}</em></h3>
            <p className="muted small">{r.createdAt.slice(0, 10)} · {r.lat.toFixed(3)}, {r.lon.toFixed(3)}</p>
            <p>{r.description}</p>
            <button className="btn ghost" onClick={() => onShow(r)}>{t(lang, 'Show on map')}</button>
          </article>
        ))}
      </div>
    </section>
  );
}
