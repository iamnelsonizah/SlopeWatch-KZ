'use client';

import { useState } from 'react';
import Icon from '../Icon';
import { citation } from '@/lib/export';
import { SOURCES } from '@/lib/sources';
import { DEFAULT_SUSC, SUSC_CLASSES } from '@/lib/terrain';
import { THRESHOLDS } from '@/lib/triggers';
import type { Limit } from '@/lib/limits';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

const REFERENCES: { text: string; url?: string }[] = [
  { text: 'Styron, R. & Pagani, M. (2020). The GEM Global Active Faults Database. Earthquake Spectra 36(1_suppl), 160–180.', url: 'https://doi.org/10.1177/8755293020944182' },
  { text: 'U.S. Geological Survey. ANSS Comprehensive Earthquake Catalog (ComCat).', url: 'https://doi.org/10.5066/F7MS3QZH' },
  { text: 'Kirschbaum, D., Stanley, T. & Zhou, Y. (2015). Spatial and temporal analysis of a global landslide catalog. Geomorphology 249, 4–15.', url: 'https://doi.org/10.1016/j.geomorph.2015.03.016' },
  { text: 'Juang, C. S. et al. (2019). Using citizen science to expand the global map of landslides: introducing the Cooperative Open Online Landslide Repository (COOLR). PLoS ONE 14(7), e0218657.', url: 'https://doi.org/10.1371/journal.pone.0218657' },
  { text: 'Krüger, F., Kulikova, G. & Landgraf, A. (2018). Magnitudes for the historical 1885 (Belovodskoe), the 1887 (Verny) and the 1889 (Chilik) earthquakes in Central Asia determined from magnetogram recordings. Geophys. J. Int. 215, 1824–1840.', url: 'https://doi.org/10.1093/gji/ggy377' },
  { text: 'Kulikova, G. & Krüger, F. (2015). Source process of the 1911 M8.0 Chon-Kemin earthquake: investigation results by analogue seismic records. Geophys. J. Int. 201, 1891–1911.', url: 'https://doi.org/10.1093/gji/ggv091' },
  { text: 'Aki, K. (1965). Maximum likelihood estimate of b in the formula log N = a − bM and its confidence limits. Bull. Earthq. Res. Inst. Univ. Tokyo 43, 237–239.' },
  { text: 'Wiemer, S. & Wyss, M. (2000). Minimum magnitude of completeness in earthquake catalogs: examples from Alaska, the western United States, and Japan. Bull. Seismol. Soc. Am. 90(4), 859–869.', url: 'https://doi.org/10.1785/0119990114' },
  { text: 'Zippenfenig, P. (2023). Open-Meteo.com Weather API.', url: 'https://doi.org/10.5281/zenodo.7970649' },
];

export default function DataSources({ limits, lang, onDataHelp, onDownload, recordCount }: { limits: Limit[]; lang: Lang; onDataHelp: () => void; onDownload: (format: 'csv' | 'geojson') => void; recordCount: number }) {
  const [copied, setCopied] = useState(false);
  const cite = citation();
  const copy = async () => { try { await navigator.clipboard.writeText(cite); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* the text stays selectable */ } };
  const s = DEFAULT_SUSC;
  return (
    <section className="page">
      <h2>{t(lang, 'Data and sources')}</h2>
      <p className="lede">{t(lang, 'The limits of this data come first, then how to cite and download it, how each number is computed, and where every layer comes from.')}</p>

      <h3 id="limits">{t(lang, 'Known limits')}</h3>
      <div className="data-limit-list">
        {limits.map((l) => (
          <article key={l.id} className="data-limit-item">
            <div className="data-limit-heading">
              <h4>{l.title}</h4>
              {l.audience === 'maintainers' && <span className="pill">{t(lang, 'Maintainer note')}</span>}
            </div>
            <p>{l.text}</p>
          </article>
        ))}
      </div>

      <h3>{t(lang, 'Cite and download')}</h3>
      <div className="cite-box">
        <p className="cite-text">{cite}</p>
        <button className="btn" onClick={copy}><Icon name={copied ? 'check' : 'quote'} />{t(lang, copied ? 'Copied' : 'Copy citation')}</button>
      </div>
      <p className="muted">{t(lang, 'The atlas compiles other people’s data. In published work, cite the original source of each layer (listed under References) and use the atlas citation only for the compilation, the curated records and the screening methods.')}</p>
      <div className="download-list">
        <div><b>{t(lang, 'Curated and reported records')}</b><span className="muted">{t(lang, '{n} records with coordinates, verification level, accuracy flag and references', { n: recordCount })}</span></div>
        <div className="download-actions"><button className="btn" onClick={() => onDownload('csv')}><Icon name="download" />CSV</button><button className="btn" onClick={() => onDownload('geojson')}><Icon name="download" />GeoJSON</button></div>
        <div><b>{t(lang, 'Earthquakes')}</b><span className="muted">{t(lang, 'Filter and download from the Earthquake statistics page; files carry the retrieval time and selection')}</span></div>
        <div className="download-actions"><span className="muted small">CSV · GeoJSON</span></div>
        <div><b>{t(lang, 'Active faults, border, regions, rivers, lakes, cities')}</b><span className="muted">{t(lang, 'The GeoJSON files the map itself loads')}</span></div>
        <div className="download-actions">{['kz-faults', 'kz-border', 'kz-adm1', 'kz-cities'].map((n) => <a key={n} className="btn" href={`/data/${n}.geojson`} download><Icon name="download" />{n.replace('kz-', '')}</a>)}</div>
        <div><b>{t(lang, 'Elevation profiles')}</b><span className="muted">{t(lang, 'Draw a profile on the map (Tools), then export it as CSV or GeoJSON')}</span></div>
        <div className="download-actions"><span className="muted small">CSV · GeoJSON</span></div>
      </div>

      <h3>{t(lang, 'Methods')}</h3>
      <div className="methods">
        <article>
          <h4>{t(lang, 'Slope angle')}</h4>
          <p>{t(lang, 'Computed in the browser from Terrarium elevation tiles with a 3 × 3 finite-difference (Horn) gradient. The source DEMs are about 30 m (SRTM) at best and coarser at low zoom, so short steep faces are smoothed out and true local slopes are steeper than shown.')}</p>
        </article>
        <article>
          <h4>{t(lang, 'Susceptibility screening index')}</h4>
          <p className="formula">I = (w<sub>s</sub>·S + w<sub>f</sub>·F + w<sub>w</sub>·W·S) / (w<sub>s</sub> + w<sub>f</sub> + w<sub>w</sub>)</p>
          <p>{t(lang, 'S is a slope score from 0 to 0.9 (0 below 5°, rising to 0.25 at 15°, 0.75 at 30° and 0.9 from 45°). F falls from 1 on a mapped active fault to 0 at the chosen influence distance. W is the wet-conditions scenario from 0 to 1. Default weights are {ws} / {wf} / {ww}, the distance {buf} km and the scenario {wet}%.', { ws: s.ws, wf: s.wf, ww: s.ww, buf: s.buf, wet: s.wet })}</p>
          <p>{t(lang, 'Classes: {classes}. The index has no lithology, soil, land-cover or rainfall-climate term and has not been validated against an inventory (no ROC or success-rate curve exists for it). It ranks terrain for a first look; it is not a probability.', { classes: SUSC_CLASSES.map((c) => `${t(lang, c.label)} ≥ ${c.min}`).join(', ') })}</p>
        </article>
        <article>
          <h4>{t(lang, 'Rain screening')}</h4>
          <p>{t(lang, 'Daily precipitation from the Open-Meteo forecast model at 11 reference points: the last 7 days, today and the next 2 days. Watch at {watch3} mm in 3 days or {watch7} mm in 7 days; Elevated at {elevated3} mm in 3 days or {elevated7} mm in 7 days.', { watch3: THRESHOLDS.watch3, watch7: THRESHOLDS.watch7, elevated3: THRESHOLDS.elevated3, elevated7: THRESHOLDS.elevated7 })} {t(lang, 'These thresholds are round reference values chosen for this atlas. They are not derived from Kazakhstan landslide records and are not intensity-duration thresholds. Model grid cells are several kilometres wide and smooth out mountain convective storms.')}</p>
        </article>
        <article>
          <h4>{t(lang, 'Earthquake statistics')}</h4>
          <p>{t(lang, 'USGS ComCat, M3 and above since 1990, within 39–57° N and 45–89° E, then clipped to Kazakhstan plus about 100 km. Completeness magnitude by maximum curvature plus 0.2; b-value by Aki-Utsu maximum likelihood on 0.1 bins. Magnitudes are used as catalogued, without conversion to a single scale.')}</p>
        </article>
        <article>
          <h4>{t(lang, 'Verification levels')}</h4>
          <p>{t(lang, 'A: well documented, with a surveyed or published location. B: the event is documented but its position or figures are approximate. C: unverified, or substantially approximate; confirm against the cited reference before use. Historical epicentres and all NASA report points are level C.')}</p>
        </article>
      </div>

      <h3>{t(lang, 'Sources')}</h3>
      <div className="callout data-gap">
        <b>{t(lang, 'Available data gaps')}</b>
        <p>{t(lang, 'The national landslide inventory is not connected. A small set of source-linked report points and curated landmarks appears around Almaty; an empty area does not mean no event occurred.')}</p>
        <p>{t(lang, 'The World Bank publishes a public Central Asia landslide polygon inventory under CC BY 4.0. It is not imported yet; its source lineage and overlap need review before individual polygons are presented as events.')}</p>
        <p>{t(lang, 'If you have verified landslide, fault, rainfall or exposure data, the atlas can use it after its source, licence, dates, coverage and verification method are checked.')}</p>
        <button className="btn" onClick={onDataHelp}>{t(lang, 'How to contribute data')}</button>
      </div>
      <ul className="source-list">
        {SOURCES.map((src) => (
          <li key={src.name}>
            <div className="source-head">
              <b>{src.url === '#' ? t(lang, src.name) : <a href={src.url} target="_blank" rel="noreferrer">{t(lang, src.name)} <Icon name="external" size={13} /></a>}</b>
              <span className={`pill st-${src.status.replace(/\s/g, '-').toLowerCase()}`}>{t(lang, src.status)}</span>
            </div>
            <p className="source-use">{t(lang, src.use)}</p>
            <p>{t(lang, src.how)}</p>
          </li>
        ))}
      </ul>

      <h3>{t(lang, 'References')}</h3>
      <ol className="references">
        {REFERENCES.map((r) => <li key={r.text}>{r.text}{r.url && <> <a href={r.url} target="_blank" rel="noreferrer">{r.url.replace('https://', '')}</a></>}</li>)}
      </ol>
    </section>
  );
}
