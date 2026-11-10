'use client';

import type { Lang, LoadState, Quake, SiteWatch } from '@/lib/types';
import { formatNumber, localName, t } from '@/lib/i18n';
import Icon from './Icon';

interface Props {
  sites: SiteWatch[] | null; sitesState: LoadState; quakes: Quake[]; quakeState: LoadState; lang: Lang;
  onOpenTriggers: () => void; onFlyToSite: (site: SiteWatch) => void; onFlyToQuake: (quake: Quake) => void;
}

/**
 * One line of what the live feeds say right now. Every figure names what it is:
 * rain values are model estimates at reference points, and earthquake figures are for the current calendar year only.
 */
export default function StatusStrip({ sites, sitesState, quakes, quakeState, lang, onOpenTriggers, onFlyToSite, onFlyToQuake }: Props) {
  const withData = (sites ?? []).filter((s) => s.level !== 'nodata');
  const elevated = withData.filter((s) => s.level === 'elevated').length;
  const watch = withData.filter((s) => s.level === 'watch').length;
  const wettest = withData.reduce<SiteWatch | null>((best, s) => (s.rainPast3 != null && (!best || s.rainPast3 > (best.rainPast3 ?? 0)) ? s : best), null);
  const year = new Date().getUTCFullYear();
  const thisYear = quakes.filter((q) => q.mag >= 4 && new Date(q.time).getUTCFullYear() === year);
  const largest = thisYear.reduce<Quake | null>((best, q) => (!best || q.mag > best.mag ? q : best), null);
  const level = elevated ? 'elevated' : watch ? 'watch' : 'low';

  return (
    <div className="status-strip" role="region" aria-label={t(lang, 'Current conditions')}>
      <span className="status-tag">{t(lang, 'Now')}</span>
      {sitesState === 'loading' && <span className="status-item muted">{t(lang, 'Loading forecast…')}</span>}
      {sitesState === 'error' && <span className="status-item muted">{t(lang, 'Rain model unavailable')}</span>}
      {sitesState === 'ok' && withData.length > 0 && (
        <button type="button" className="status-item" onClick={onOpenTriggers} title={t(lang, 'Open Trigger watch')}>
          <i className={`status-dot lv-${level}`} aria-hidden="true" />
          <span>{t(lang, 'Rain screening')}: <b>{elevated || watch
            ? [elevated ? `${elevated} ${t(lang, 'elevated')}` : '', watch ? `${watch} ${t(lang, 'watch')}` : ''].filter(Boolean).join(', ')
            : t(lang, 'all low')}</b> <span className="muted">{t(lang, 'of {n} points', { n: withData.length })}</span></span>
        </button>
      )}
      {wettest && wettest.rainPast3 != null && (
        <button type="button" className="status-item" onClick={() => onFlyToSite(wettest)} title={t(lang, 'Show on map')}>
          <Icon name="rain" size={14} />
          <span>{t(lang, 'Wettest, last 3 days')}: <b>{localName(wettest.name, lang)} {formatNumber(lang, wettest.rainPast3, { maximumFractionDigits: 0 })} mm</b> <span className="muted">{t(lang, 'model')}</span></span>
        </button>
      )}
      {quakeState === 'loading' && <span className="status-item muted">{t(lang, 'Loading earthquakes…')}</span>}
      {quakeState === 'error' && <span className="status-item muted">{t(lang, 'USGS catalogue unavailable')}</span>}
      {quakeState === 'ok' && (largest ? (
        <button type="button" className="status-item" onClick={() => onFlyToQuake(largest)} title={t(lang, 'Show on map')}>
          <Icon name="wave" size={14} />
          <span>{t(lang, 'Largest in {year}', { year })}: <b>M {largest.mag.toFixed(1)}</b> <span className="muted">{new Date(largest.time).toISOString().slice(0, 10)} · {t(lang, '{n} events M4+', { n: thisYear.length })}</span></span>
        </button>
      ) : (
        <span className="status-item"><Icon name="wave" size={14} /><span>{t(lang, 'No M4+ earthquakes in {year} so far', { year })}</span></span>
      ))}
    </div>
  );
}
