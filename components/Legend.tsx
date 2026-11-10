'use client';

import { useState } from 'react';
import { LAYERS, type LayerId } from '@/lib/layers';
import { PLACES, TYPE_META, TYPE_ORDER } from '@/lib/events';
import type { Lang, PlaceType } from '@/lib/types';
import type { Limit } from '@/lib/limits';
import { t } from '@/lib/i18n';
import Icon from './Icon';

export default function Legend({ layers, types, limits, lang, onDataHelp }: { layers: Set<LayerId>; types: Set<PlaceType>; limits: Limit[]; lang: Lang; onDataHelp: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`legend ${open ? 'open' : ''}`}>
      <button className="legend-head" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t(lang, 'On the map')} <Icon name={open ? 'minus' : 'plus'} size={14} /></button>
      {open && (
        <div className="legend-body">
          <div className="lg"><i className="sw line border" />{t(lang, 'Kazakhstan national border')}</div>
          {TYPE_ORDER.filter((type) => types.has(type) && PLACES.some((p) => p.type === type)).map((type) => <div className="lg" key={type}><i className="sw dot" style={{ background: TYPE_META[type].color }} />{t(lang, TYPE_META[type].plural)}</div>)}
          {LAYERS.filter((l) => layers.has(l.id)).flatMap((l) => l.legend.map((it) => (
            <div className="lg" key={`${l.id}-${it.label}`}><i className={`sw ${it.kind ?? 'swatch'}`} style={{ background: it.color }} />{t(lang, it.label)}</div>
          )))}
          {limits.map((x) => <p className="lg-limit" key={x.id}><b>{t(lang, 'Limit:')}</b> {x.short}{x.id === 'inventory' && <> <button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></>}</p>)}
          <p className="lg-note">{t(lang, 'Dashed faults lie outside the border. Faded dots: location approximate. Layers are for screening, not an official hazard map.')}</p>
        </div>
      )}
    </div>
  );
}
