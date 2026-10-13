'use client';

import { LAYERS, LAYER_GROUPS, type LayerId } from '@/lib/layers';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function LayerBar({ layers, toggle, lang }: { layers: Set<LayerId>; toggle: (id: LayerId) => void; lang: Lang }) {
  return (
    <div className="layerbar" role="group" aria-label={t(lang, 'Map layers')}>
      {LAYER_GROUPS.map((g) => (
        <div className="lgroup" key={g}>
          <span className="lgroup-name">{t(lang, g)}</span>
          {LAYERS.filter((l) => l.group === g).map((l) => (
            <button key={l.id} className={`ltoggle ${layers.has(l.id) ? 'on' : ''}`} aria-pressed={layers.has(l.id)} title={t(lang, l.source)} onClick={() => toggle(l.id)}>{t(lang, l.label)}</button>
          ))}
        </div>
      ))}
    </div>
  );
}
