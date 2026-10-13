'use client';

import { useState } from 'react';
import type { Lang, Quake, Report, SiteWatch } from '@/lib/types';
import { formatNumber, localName, t } from '@/lib/i18n';

interface Props {
  sites: SiteWatch[] | null;
  quakes: Quake[];
  reports: Report[];
  lang: Lang;
  onFlyToSite: (site: SiteWatch) => void;
  onFlyToQuake: (quake: Quake) => void;
  onOpenCommunity: () => void;
}

const AlertIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m13 2-8.5 12h7l-1 8L19 10h-7l1-8z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const RainIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <path d="M16 14v6" /><path d="M8 14v6" /><path d="M12 16v6" />
  </svg>
);

const QuakeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12h4l2.5-7 4 14 3.5-9 2 4H22" />
  </svg>
);

const ReportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
  </svg>
);

export default function HazardPulse({
  sites,
  quakes,
  reports,
  lang,
  onFlyToSite,
  onFlyToQuake,
  onOpenCommunity,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Active rain/melt alerts across weather watch sites
  const alerts = (sites ?? []).filter((s) => s.level === 'elevated' || s.level === 'watch');
  
  // Peak 72h rainfall across monitored sites
  const peakRainSite = (sites ?? []).reduce<SiteWatch | null>((max, s) => {
    if (s.rainPast3 != null && (!max || (max.rainPast3 ?? 0) < s.rainPast3)) return s;
    return max;
  }, null);

  // Year to date earthquakes (M4+)
  const thisYear = new Date().getFullYear();
  const ytdQuakes = quakes.filter((q) => q.mag >= 4 && new Date(q.time).getFullYear() === thisYear);
  const maxQuake = ytdQuakes.reduce<Quake | null>((max, q) => (!max || q.mag > max.mag ? q : max), null)
    || quakes.reduce<Quake | null>((max, q) => (!max || q.mag > max.mag ? q : max), null);

  return (
    <div className={`hazard-pulse-ribbon ${collapsed ? 'collapsed' : ''}`} role="region" aria-label={t(lang, 'National Hazard Pulse')}>
      <div className="pulse-track">
        <div className="pulse-title">
          <span className="pulse-live-dot" aria-hidden="true" />
          <span className="pulse-label">{t(lang, 'National Hazard Pulse')}</span>
        </div>

        {!collapsed && (
          <div className="pulse-cards">
            {/* 1. Rain Alerts */}
            {alerts.length > 0 ? (
              <button
                type="button"
                className="pulse-card alert-active"
                onClick={() => onFlyToSite(alerts[0])}
                title={t(lang, 'Click to fly')}
              >
                <span className="pulse-icon pulse-icon-alert"><AlertIcon /></span>
                <span className="pulse-metric-group">
                  <span className="pulse-val">{alerts.length} {alerts.length === 1 ? t(lang, 'Alert') : t(lang, 'Alerts')}</span>
                  <span className="pulse-sub">{localName(alerts[0].name, lang)}</span>
                </span>
              </button>
            ) : (
              <div className="pulse-card ok">
                <span className="pulse-icon pulse-icon-ok"><CheckIcon /></span>
                <span className="pulse-metric-group">
                  <span className="pulse-val">{t(lang, 'All Clear')}</span>
                  <span className="pulse-sub">{t(lang, 'Rain screening')}</span>
                </span>
              </div>
            )}

            {/* 2. Peak 72h Rain */}
            {peakRainSite && peakRainSite.rainPast3 != null && (
              <button
                type="button"
                className="pulse-card"
                onClick={() => onFlyToSite(peakRainSite)}
                title={t(lang, 'Click to fly')}
              >
                <span className="pulse-icon pulse-icon-rain"><RainIcon /></span>
                <span className="pulse-metric-group">
                  <span className="pulse-val">{peakRainSite.rainPast3.toFixed(0)} mm</span>
                  <span className="pulse-sub">{t(lang, 'Peak Rain (72h)')} · {localName(peakRainSite.name, lang)}</span>
                </span>
              </button>
            )}

            {/* 3. YTD Earthquakes */}
            {maxQuake && (
              <button
                type="button"
                className="pulse-card"
                onClick={() => onFlyToQuake(maxQuake)}
                title={t(lang, 'Click to fly')}
              >
                <span className="pulse-icon pulse-icon-quake"><QuakeIcon /></span>
                <span className="pulse-metric-group">
                  <span className="pulse-val">M {maxQuake.mag.toFixed(1)} {ytdQuakes.length > 0 ? `(${ytdQuakes.length})` : ''}</span>
                  <span className="pulse-sub">{t(lang, 'YTD Quakes (M4+)')}</span>
                </span>
              </button>
            )}

            {/* 4. Community Reports */}
            <button
              type="button"
              className="pulse-card"
              onClick={onOpenCommunity}
              title={t(lang, 'Community reports')}
            >
              <span className="pulse-icon pulse-icon-report"><ReportIcon /></span>
              <span className="pulse-metric-group">
                <span className="pulse-val">{reports.length}</span>
                <span className="pulse-sub">{t(lang, 'Reports')}</span>
              </span>
            </button>
          </div>
        )}

        <button
          type="button"
          className="pulse-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? t(lang, 'Expand map controls') : t(lang, 'Collapse map controls')}
          title={collapsed ? t(lang, 'Expand map controls') : t(lang, 'Collapse map controls')}
        >
          {collapsed ? '▾' : '▴'}
        </button>
      </div>
    </div>
  );
}
