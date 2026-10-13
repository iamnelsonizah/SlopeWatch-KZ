'use client';

import { useState } from 'react';
import type { LL } from '@/lib/geo';
import type { Report, ReportCategory } from '@/lib/types';
import type { Lang } from '@/lib/types';
import { t } from '@/lib/i18n';

const CATS: { id: ReportCategory; label: string }[] = [
  { id: 'landslide', label: 'Landslide or slope failure' }, { id: 'mudflow', label: 'Mudflow or debris flow' },
  { id: 'rockfall', label: 'Rockfall' }, { id: 'cracks', label: 'New cracks in ground or buildings' },
  { id: 'drainage', label: 'Blocked or changed stream or drain' }, { id: 'other', label: 'Other slope hazard' },
];

/** re-encode in the browser: caps size and drops EXIF (including GPS) from the photo */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read the photo.'))), 'image/jpeg', 0.85));
}

interface Props { draft: LL | null; picking: boolean; onPick: () => void; onLocate: (lng: number, lat: number) => void; onClose: () => void; onDone: (r: Report) => void; lang: Lang }

export default function ReportDrawer({ draft, picking, onPick, onLocate, onClose, onDone, lang }: Props) {
  const [category, setCategory] = useState<ReportCategory>('landslide');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!draft) return setError(t(lang, 'Pick the location on the map first.'));
    if (description.trim().length < 10) return setError(t(lang, 'Describe what you saw in at least 10 characters.'));
    setBusy(true);
    try {
      let photoDataUrl: string | undefined;
      if (photo) {
        const sh = await shrink(photo);
        photoDataUrl = await new Promise<string>((res, rej) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(sh);
        });
      }
      const report: Report = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rep-${Date.now()}`,
        category,
        description: description.trim(),
        lat: +draft[1].toFixed(5),
        lon: +draft[0].toFixed(5),
        createdAt: new Date().toISOString(),
        photo: photoDataUrl,
        verification: 'C',
        status: 'published',
      };
      try {
        const existing: Report[] = JSON.parse(localStorage.getItem('kz-landslide-reports') || '[]');
        localStorage.setItem('kz-landslide-reports', JSON.stringify([report, ...existing]));
      } catch {
        /* storage full or unavailable */
      }
      setSent(true);
      onDone(report);
    } catch (err) {
      setError(err instanceof Error ? t(lang, err.message) : t(lang, 'Could not send the report.'));
    } finally { setBusy(false); }
  }

  if (sent) return (
    <section className="panel">
      <h3>{t(lang, 'Thank you')}</h3>
      <p>{t(lang, 'Your report is on the map as an unverified pin (level C). A moderator may upgrade or remove it.')}</p>
      <p className="callout">{t(lang, 'If anyone is in danger right now, call your national emergency number (112). This map is not monitored in real time.')}</p>
      <button className="btn" onClick={onClose}>{t(lang, 'Close')}</button>
    </section>
  );
  return (
    <section className="panel">
      <div className="panel-row"><h3>{t(lang, 'Report a slope hazard')}</h3><span className="spacer" /><button className="btn ghost" onClick={onClose}>{t(lang, 'Close')}</button></div>
      <p className="callout">{t(lang, 'Not for emergencies. If anyone is in danger, call 112. Do not go near an active slope to take photos.')}</p>
      <form onSubmit={submit} className="form">
        <label>{t(lang, 'What did you see?')}
          <select value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>{CATS.map((c) => <option key={c.id} value={c.id}>{t(lang, c.label)}</option>)}</select>
        </label>
        <label>{t(lang, 'Details (10 to 600 characters)')}
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} rows={4} placeholder={t(lang, 'When, where exactly, how big, what is at risk. Avoid names and phone numbers.')} />
        </label>
        <div className="loc">
          <button type="button" className={`btn ${picking ? 'on' : ''}`} onClick={onPick}>{t(lang, picking ? 'Click the map…' : draft ? 'Change location' : 'Pick location on the map')}</button>
          <button type="button" className="btn ghost" onClick={() => navigator.geolocation?.getCurrentPosition((p) => onLocate(p.coords.longitude, p.coords.latitude), () => setError(t(lang, 'Could not read your location.')))}>{t(lang, 'Use my location')}</button>
          {draft && <span className="muted">{draft[1].toFixed(4)}, {draft[0].toFixed(4)}</span>}
        </div>
        <label>{t(lang, 'Photo (optional, JPEG, PNG or WebP)')}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>
        <p className="muted small">{t(lang, 'Photos are resized in your browser and their metadata (including GPS) is removed before upload. Reports are public. No name or contact details are collected.')}</p>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" disabled={busy}>{t(lang, busy ? 'Sending…' : 'Send report')}</button>
      </form>
    </section>
  );
}
