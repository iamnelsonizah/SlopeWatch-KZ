'use client';

import { SOURCES } from '@/lib/sources';
import type { Limit } from '@/lib/limits';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function DataSources({ limits, lang, onDataHelp }: { limits: Limit[]; lang: Lang; onDataHelp: () => void }) {
  return (
    <section className="page">
      <h2>{t(lang, 'Data and sources')}</h2>
      <p className="lede">{t(lang, 'The limits of this data come first, then every layer, where it comes from and what is still needed.')}</p>
      <h3 id="limits">{t(lang, 'Known limits')}</h3>
      <div className="data-limit-list">
        {limits.map((l) => (
          <article key={l.id} className="data-limit-item">
            <div className="data-limit-heading">
              {l.audience === 'maintainers' && <span className="limit-audience">{t(lang, 'Maintainer note')}</span>}
              <h4>{l.title}</h4>
            </div>
            <p>{l.text}</p>
          </article>
        ))}
      </div>
      <h3>{t(lang, 'Sources')}</h3>
      <div className="callout data-gap">
        <b>{t(lang, 'Available data gaps')}</b>
        <p>{t(lang, 'The national landslide inventory is not connected. A small set of source-linked report points and curated landmarks appears around Almaty; an empty area does not mean no event occurred.')}</p>
        <p>{t(lang, 'The World Bank publishes a public Central Asia landslide polygon inventory under CC BY 4.0. It is not imported yet; its source lineage and overlap need review before individual polygons are presented as events.')}</p>
        <p>{t(lang, 'The World Bank also publishes a qualitative Central Asia susceptibility map that covers Kazakhstan. It is a regional reference, not an official forecast, and is not connected to the map yet.')}</p>
        <p>{t(lang, 'If you have verified landslide, fault, rainfall or exposure data, the atlas can use it after its source, licence, dates, coverage and verification method are checked.')}</p>
        <button className="btn ghost" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>{t(lang, 'Source')}</th><th>{t(lang, 'Used for')}</th><th>{t(lang, 'Status')}</th><th>{t(lang, 'How it is wired')}</th></tr></thead>
          <tbody>{SOURCES.map((s) => (
            <tr key={s.name}><td>{s.url === '#' ? t(lang, s.name) : <a href={s.url} target="_blank" rel="noreferrer">{t(lang, s.name)}</a>}</td><td>{t(lang, s.use)}</td><td><span className={`pill st-${s.status.replace(/\s/g, '-').toLowerCase()}`}>{t(lang, s.status)}</span></td><td>{t(lang, s.how)}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
