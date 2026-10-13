'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { LAYERS, type LayerId } from '@/lib/layers';
import { TYPE_META, TYPE_ORDER } from '@/lib/events';
import type { PlaceType } from '@/lib/types';
import type { Limit } from '@/lib/limits';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function Legend({ layers, types, limits, lang, onDataHelp }: { layers: Set<LayerId>; types: Set<PlaceType>; limits: Limit[]; lang: Lang; onDataHelp: () => void }) {
  const legend = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const clamp = useCallback((x: number, y: number) => {
    const el = legend.current, parent = el?.parentElement;
    if (!el || !parent) return { x, y };
    return {
      x: Math.max(8, Math.min(x, parent.clientWidth - el.offsetWidth - 8)),
      y: Math.max(8, Math.min(y, parent.clientHeight - el.offsetHeight - 8)),
    };
  }, []);
  useEffect(() => {
    const resize = () => setPosition((p) => p ? clamp(p.x, p.y) : p);
    const observer = typeof ResizeObserver === 'undefined' || !legend.current ? null : new ResizeObserver(resize);
    if (observer && legend.current) {
      observer.observe(legend.current);
      if (legend.current.parentElement) observer.observe(legend.current.parentElement);
    }
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [clamp]);
  const currentPosition = () => {
    if (position) return position;
    const el = legend.current, parent = el?.parentElement;
    if (!el || !parent) return { x: 12, y: 12 };
    const rect = el.getBoundingClientRect(), parentRect = parent.getBoundingClientRect();
    return { x: rect.left - parentRect.left, y: rect.top - parentRect.top };
  };
  const onDragStart = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ...currentPosition(), pointerX: e.clientX, pointerY: e.clientY };
  };
  const onDragMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const start = drag.current;
    if (start) setPosition(clamp(start.x + e.clientX - start.pointerX, start.y + e.clientY - start.pointerY));
  };
  const onDragEnd = () => { drag.current = null; };
  const onDragKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const current = currentPosition(), step = e.shiftKey ? 40 : 12;
    setPosition(clamp(current.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), current.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)));
  };
  return (
    <div ref={legend} className="legend" style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : undefined}>
      <div className="legend-head">
        <button className="legend-drag-grip" type="button" aria-label={t(lang, 'Drag to move')} title={t(lang, 'Drag to move')} onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} onKeyDown={onDragKeyDown}>⠿</button>
        <button className="legend-toggle" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{t(lang, 'On the map')} <span>{open ? '–' : '+'}</span></button>
      </div>
      {open && (
        <div className="legend-body">
          {TYPE_ORDER.filter((type) => types.has(type)).map((type) => <div className="lg" key={type}><i className="sw dot" style={{ background: TYPE_META[type].color }} />{t(lang, TYPE_META[type].plural)}</div>)}
          {LAYERS.filter((l) => layers.has(l.id)).flatMap((l) => l.legend.map((it) => (
            <div className="lg" key={`${l.id}-${it.label}`}><i className={`sw ${it.kind ?? 'swatch'}`} style={{ background: it.color }} />{t(lang, it.label)}</div>
          )))}
          {limits.map((x) => <p className="lg-limit" key={x.id}><b>{t(lang, 'Limit:')}</b> {x.short}{x.id === 'inventory' && <><br /><button className="text-button" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button></>}</p>)}
          <p className="lg-note">{t(lang, 'Dashed faults lie outside the border. Faded dots: location approximate. Layers are for screening, not an official hazard map.')}</p>
        </div>
      )}
    </div>
  );
}
