'use client';

import { useEffect, useRef } from 'react';
import type { Limit } from '@/lib/limits';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

export default function LimitsDialog({ limits, onClose, lang }: { limits: Limit[]; onClose: () => void; lang: Lang }) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btn.current?.focus();
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="limits-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="limits-title">{t(lang, 'Before you use this map')}</h2>
        <p>{t(lang, 'This atlas is screening information, not an official hazard map. Please keep these limits in mind.')}</p>
        <ul className="limit-list">
          {limits.filter((l) => l.audience === 'everyone').map((l) => (
            <li key={l.id}><b>{l.title}.</b> {l.publicText}</li>
          ))}
        </ul>
        <p className="muted small">{t(lang, 'The same list, with notes for maintainers, is on the Data and sources tab. For land-use, engineering or insurance decisions, use official hazard maps and site-specific studies.')}</p>
        <button ref={btn} className="btn primary" onClick={onClose}>{t(lang, 'I understand')}</button>
      </div>
    </div>
  );
}
