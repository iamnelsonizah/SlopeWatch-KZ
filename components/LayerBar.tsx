'use client';

import { BASEMAPS, type BasemapId } from '@/lib/basemaps';
import { LAYERS, LAYER_GROUPS, type LayerId } from '@/lib/layers';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import Icon from './Icon';

interface Props { open: boolean; setOpen: (open: boolean) => void; layers: Set<LayerId>; toggle: (id: LayerId) => void; basemap: BasemapId; setBasemap: (id: BasemapId) => void; lang: Lang }

export default function LayerBar({ open, setOpen, layers, toggle, basemap, setBasemap, lang }: Props) {
  if (!open) {
    return (
      <button className="map-btn" onClick={() => setOpen(true)} aria-expanded={false}>
        <Icon name="layers" /><b>{t(lang, 'Layers')}</b><span className="count">{layers.size}</span>
      </button>
    );
  }
  return (
    <section className="map-panel layer-panel" aria-label={t(lang, 'Map layers')}>
      <header className="map-panel-head">
        <span><Icon name="layers" />{t(lang, 'Map layers')}</span>
        <button className="icon-btn plain" onClick={() => setOpen(false)} aria-label={t(lang, 'Close')}><Icon name="close" size={18} /></button>
      </header>
      <div className="map-panel-body">
        <span className="group-name">{t(lang, 'Basemap')}</span>
        <div className="seg wide" role="group" aria-label={t(lang, 'Basemap')}>
          {BASEMAPS.map((b) => <button key={b.id} className={basemap === b.id ? 'on' : ''} aria-pressed={basemap === b.id} onClick={() => setBasemap(b.id)}>{t(lang, b.label)}</button>)}
        </div>
        {LAYER_GROUPS.map((g) => (
          <div className="lgroup" key={g}>
            <span className="group-name">{t(lang, g)}</span>
            {LAYERS.filter((l) => l.group === g).map((l) => (
              <button key={l.id} className={`ltoggle ${layers.has(l.id) ? 'on' : ''}`} role="switch" aria-checked={layers.has(l.id)} onClick={() => toggle(l.id)}>
                <span className="ltoggle-main"><span>{t(lang, l.label)}</span><small>{t(lang, l.source)}</small></span>
                <i className="switch" aria-hidden="true" />
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
