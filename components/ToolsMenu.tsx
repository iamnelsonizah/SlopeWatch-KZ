'use client';

import { useState } from 'react';
import { LANDMARKS, landmarkBadge, landmarkDesc, landmarkName, type Landmark } from '@/lib/landmarks';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';
import Icon, { type IconName } from './Icon';

export const LIGHT_PRESETS = [
  { angle: 315, label: 'NW (standard)' }, { angle: 225, label: 'SW' }, { angle: 135, label: 'SE' }, { angle: 45, label: 'NE' },
] as const;

interface Props {
  open: boolean; setOpen: (open: boolean) => void; lang: Lang;
  focus: boolean; onFocus: () => void; terrain3d: boolean; onTerrain: () => void; listHidden: boolean; onToggleList: () => void;
  sunAngle: number; onSun: (angle: number) => void; onLandmark: (l: Landmark) => void;
  profileOn: boolean; onProfile: () => void; weatherOn: boolean; onWeather: () => void; locating: boolean; onLocate: () => void;
  onReport: () => void; onShare: () => void; onPrint: () => void; onPng: () => void; onLimits: () => void;
}

export default function ToolsMenu(p: Props) {
  const [landmarks, setLandmarks] = useState(false);
  const { lang } = p;
  if (!p.open) {
    return <button className="map-btn" onClick={() => p.setOpen(true)} aria-expanded={false}><Icon name="tools" /><b>{t(lang, 'Tools')}</b></button>;
  }
  const act = (fn: () => void) => () => { fn(); p.setOpen(false); };
  const row = (icon: IconName, label: string, hint: string, onClick: () => void, on = false) => (
    <button className={`tool ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on || undefined}>
      <Icon name={icon} size={18} />
      <span className="tool-main"><span>{t(lang, label)}</span><small>{t(lang, hint)}</small></span>
    </button>
  );
  const toggle = (label: string, hint: string, on: boolean, onClick: () => void) => (
    <button className={`ltoggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={onClick}>
      <span className="ltoggle-main"><span>{t(lang, label)}</span><small>{t(lang, hint)}</small></span>
      <i className="switch" aria-hidden="true" />
    </button>
  );
  return (
    <section className="map-panel tools-panel" aria-label={t(lang, 'Tools')}>
      <header className="map-panel-head">
        <span><Icon name="tools" />{t(lang, 'Tools')}</span>
        <button className="icon-btn plain" onClick={() => p.setOpen(false)} aria-label={t(lang, 'Close')}><Icon name="close" size={18} /></button>
      </header>
      <div className="map-panel-body">
        <span className="group-name">{t(lang, 'Measure and inspect')}</span>
        {row('profile', 'Elevation profile', 'Draw a line; get climb, slope and the mapped faults it crosses', act(p.onProfile), p.profileOn)}
        {row('rain', 'Rain at a point', 'Model rain for the last 7 and next 3 days anywhere on the map', act(p.onWeather), p.weatherOn)}
        {row('locate', p.locating ? 'Locating…' : 'Near me', 'Elevation, slope, nearest mapped fault and rain where you are', act(p.onLocate))}
        {row('flag', 'Report a hazard', 'Note a slope hazard you have seen', act(p.onReport))}

        <span className="group-name">{t(lang, 'View')}</span>
        {toggle('Focus on Kazakhstan', 'Dim the map outside Kazakhstan', p.focus, p.onFocus)}
        {toggle('3D terrain', 'Tilt the map and show the mountains in 3D', p.terrain3d, p.onTerrain)}
        <div className="desktop-only">{toggle('Wide map', 'Hide the record list to give the map the full width', p.listHidden, p.onToggleList)}</div>
        <div className="tool-inline">
          <span className="tool-inline-label"><Icon name="sun" size={16} />{t(lang, 'Hillshade light from')}</span>
          <div className="seg wide" role="group" aria-label={t(lang, 'Hillshade light from')}>
            {LIGHT_PRESETS.map((l) => <button key={l.angle} className={p.sunAngle === l.angle ? 'on' : ''} aria-pressed={p.sunAngle === l.angle} onClick={() => p.onSun(l.angle)}>{t(lang, l.label)}</button>)}
          </div>
        </div>
        <button className="tool" onClick={() => setLandmarks((o) => !o)} aria-expanded={landmarks}>
          <Icon name="mountain" size={18} />
          <span className="tool-main"><span>{t(lang, 'Fly to a place in 3D')}</span><small>{t(lang, '{n} sites in the Tien Shan', { n: LANDMARKS.length })}</small></span>
          <Icon name={landmarks ? 'chevronUp' : 'chevronDown'} />
        </button>
        {landmarks && (
          <div className="landmark-list">
            {LANDMARKS.map((lm) => (
              <button key={lm.id} className="landmark-item" onClick={act(() => p.onLandmark(lm))}>
                <span className="landmark-top"><b>{landmarkName(lm, lang)}</b><small>{landmarkBadge(lm, lang)}</small></span>
                <span className="landmark-desc">{landmarkDesc(lm, lang)}</span>
              </button>
            ))}
          </div>
        )}

        <span className="group-name">{t(lang, 'Take it with you')}</span>
        <div className="tool-grid">
          <button className="btn" onClick={act(p.onShare)}><Icon name="share" />{t(lang, 'Share link')}</button>
          <button className="btn" onClick={act(p.onPrint)}><Icon name="print" />{t(lang, 'Print')}</button>
          <button className="btn" onClick={act(p.onPng)}><Icon name="image" />{t(lang, 'PNG')}</button>
        </div>
        <button className="tool warn" onClick={act(p.onLimits)}>
          <Icon name="alert" size={18} />
          <span className="tool-main"><span>{t(lang, 'Limits of this data')}</span><small>{t(lang, 'Read before relying on anything shown here')}</small></span>
        </button>
      </div>
    </section>
  );
}
