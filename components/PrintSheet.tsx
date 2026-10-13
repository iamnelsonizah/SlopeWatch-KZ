'use client';

import { LAYERS, type LayerId } from '@/lib/layers';
import type { Limit } from '@/lib/limits';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export interface PrintData { img: string; url: string; date: string; layers: LayerId[] }

export default function PrintSheet({ data, limits, lang }: { data: PrintData | null; limits: Limit[]; lang: Lang }) {
  if (!data) return null;
  return (
    <div className="print-sheet">
      <h1>{t(lang, 'Kazakhstan Landslide and Earthquake Atlas')}</h1>
      <p className="print-meta">{t(lang, 'Map view printed')} {data.date}</p>
      <img src={data.img} alt={t(lang, 'Map as shown on screen')} />
      <div className="print-legend">
        {LAYERS.filter((l) => data.layers.includes(l.id)).map((l) => (
          <div key={l.id}><b>{t(lang, l.label)}</b>: {l.legend.map((i) => t(lang, i.label)).join('; ') || t(lang, l.source)}</div>
        ))}
      </div>
      <div className="print-limits"><b>{t(lang, 'Limits of this data:')}</b><ul>{limits.filter((l) => l.audience === 'everyone').map((l) => <li key={l.id}>{l.short}</li>)}</ul></div>
      <p className="print-note">{t(lang, 'Screening information only; not an official hazard map. Faults: GEM Global Active Faults database. Earthquakes: USGS. Elevation: Terrarium tiles. Rain: Open-Meteo. Basemap and boundaries: see Data and sources in the atlas.')}</p>
      <p className="print-note">{t(lang, 'Reopen this view:')} {data.url}</p>
    </div>
  );
}
