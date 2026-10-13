'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function MapControlDock({ children, lang }: { children: ReactNode; lang: Lang }) {
  const dock = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; pointerX: number; pointerY: number } | null>(null);
  const [position, setPosition] = useState({ x: 12, y: 114 });
  const [collapsed, setCollapsed] = useState(true);
  const [closed, setClosed] = useState(false);

  const clamp = useCallback((x: number, y: number) => {
    const el = dock.current, parent = el?.parentElement;
    if (!parent) return { x: Math.max(8, x), y: Math.max(8, y) };
    // A map tab is hidden while another atlas section is open. Keep the saved
    // position until the map has real dimensions; clamping against 0×0 sends
    // the dock to the upper-left corner when the user returns to the map.
    if (parent.clientWidth <= 0 || parent.clientHeight <= 0) return { x, y };
    const width = el?.offsetWidth ?? 0, height = el?.offsetHeight ?? 0;
    return {
      x: Math.max(8, Math.min(x, parent.clientWidth - width - 8)),
      y: Math.max(8, Math.min(y, parent.clientHeight - height - 8)),
    };
  }, []);

  useEffect(() => {
    const resize = () => setPosition((p) => clamp(p.x, p.y));
    const observer = typeof ResizeObserver === 'undefined' || !dock.current ? null : new ResizeObserver(resize);
    if (observer && dock.current) {
      observer.observe(dock.current);
      if (dock.current.parentElement) observer.observe(dock.current.parentElement);
    }
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, [clamp]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ...position, pointerX: e.clientX, pointerY: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start) setPosition(clamp(start.x + e.clientX - start.pointerX, start.y + e.clientY - start.pointerY));
  };
  const onPointerUp = () => { drag.current = null; };
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const step = e.shiftKey ? 40 : 12;
    setPosition(clamp(position.x + (e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0), position.y + (e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)));
  };

  if (closed) return (
    <button className="map-controls-reopen" style={{ left: position.x, top: position.y }} onClick={() => setClosed(false)} aria-label={t(lang, 'Open map controls')} title={t(lang, 'Open map controls')}>
      <span aria-hidden="true">☷</span> {t(lang, 'Map controls')}
    </button>
  );

  return (
    <section ref={dock} className={`map-control-dock ${collapsed ? 'collapsed' : ''}`} style={{ left: position.x, top: position.y }} aria-label={t(lang, 'Map controls')}>
      <div className="map-control-header" role="group" tabIndex={0} aria-label={t(lang, 'Map controls')} title={t(lang, 'Drag to move')} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onKeyDown={onKeyDown}>
        <span className="map-control-grip" aria-hidden="true" title={t(lang, 'Drag to move')}>⠿</span>
        <strong>{t(lang, 'Map controls')}</strong>
        <span className="map-control-spacer" />
        <button type="button" className="map-control-icon" onClick={() => setCollapsed((v) => !v)} aria-label={t(lang, collapsed ? 'Expand map controls' : 'Collapse map controls')} title={t(lang, collapsed ? 'Expand map controls' : 'Collapse map controls')}>{collapsed ? '⌄' : '⌃'}</button>
        <button type="button" className="map-control-icon" onClick={() => setClosed(true)} aria-label={t(lang, 'Close map controls')} title={t(lang, 'Close map controls')}>×</button>
      </div>
      {!collapsed && <div className="map-control-content">{children}</div>}
    </section>
  );
}
