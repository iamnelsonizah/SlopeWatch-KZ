'use client';

import { useEffect, useRef } from 'react';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function DataHelpDialog({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const contact = process.env.NEXT_PUBLIC_DATA_CONTACT;

  useEffect(() => {
    closeButton.current?.focus();
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <section className="modal data-help" role="dialog" aria-modal="true" aria-labelledby="data-help-title" onClick={(event) => event.stopPropagation()}>
        <h2 id="data-help-title">{t(lang, 'Data contribution')}</h2>
        <p>{t(lang, 'The national landslide inventory is not connected. A small set of source-linked report points and curated landmarks appears around Almaty; an empty area does not mean no event occurred.')}</p>
        <p>{t(lang, 'If you have verified landslide, fault, rainfall or exposure data, the atlas can use it after its source, licence, dates, coverage and verification method are checked.')}</p>
        <p>{t(lang, 'Please share the data source and licence with the atlas team. Do not send sensitive personal information.')}</p>
        <ul>
          <li><a href="https://gpm.nasa.gov/applications/landslides/coolr" target="_blank" rel="noreferrer">{t(lang, 'NASA landslide data')}</a></li>
          <li><a href="https://datacatalog.worldbank.org/search/dataset/0064180/central-asia-landslide-inventory" target="_blank" rel="noreferrer">{t(lang, 'Central Asia landslide inventory')}</a></li>
          <li><a href="https://datacatalog.worldbank.org/search/dataset/0064175/central-asia-landslide-susceptibility-map" target="_blank" rel="noreferrer">{t(lang, 'World Bank Central Asia landslide susceptibility map')}</a></li>
          <li><a href="https://data.egov.kz/datasets/view?index=kazakstan_respublikasy_aumagyn5" target="_blank" rel="noreferrer">{t(lang, 'Kazakhstan emergency susceptibility dataset (eGov)')}</a></li>
        </ul>
        {contact ? <a className="btn primary data-contact" href={`mailto:${contact}?subject=${encodeURIComponent(t(lang, 'Data contribution'))}`}>{t(lang, 'Contact the atlas team')}</a> : <p className="muted small">{t(lang, 'The project contact is not configured yet. Ask the atlas owner to set NEXT_PUBLIC_DATA_CONTACT to enable direct contributions.')}</p>}
        <div className="panel-row"><span className="spacer" /><button ref={closeButton} className="btn" onClick={onClose}>{t(lang, 'Close')}</button></div>
      </section>
    </div>
  );
}
