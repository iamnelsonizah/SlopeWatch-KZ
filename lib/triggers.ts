import type { Level, SiteWatch } from './types';

export const SITES: { name: string; lat: number; lon: number }[] = [
  { name: 'Almaty', lat: 43.24, lon: 76.89 },
  { name: 'Talgar', lat: 43.3, lon: 77.24 },
  { name: 'Esik', lat: 43.36, lon: 77.46 },
  { name: 'Kapchagay', lat: 43.87, lon: 77.07 },
  { name: 'Taldykorgan', lat: 45.02, lon: 78.37 },
  { name: 'Zharkent', lat: 44.17, lon: 80.0 },
  { name: 'Oskemen', lat: 49.95, lon: 82.61 },
  { name: 'Ridder', lat: 50.35, lon: 83.51 },
  { name: 'Taraz', lat: 42.9, lon: 71.37 },
  { name: 'Shymkent', lat: 42.32, lon: 69.59 },
  { name: 'Kentau', lat: 43.52, lon: 68.5 },
];

/** Screening thresholds (mm of rain). Heuristic, not calibrated to local slopes; adjust with local data. */
export const THRESHOLDS = { watch3: 25, elevated3: 50, watch7: 50, elevated7: 90 };

export function classify(past3: number, next3: number, past7: number): Level {
  const m3 = Math.max(past3, next3);
  if (m3 >= THRESHOLDS.elevated3 || past7 >= THRESHOLDS.elevated7) return 'elevated';
  if (m3 >= THRESHOLDS.watch3 || past7 >= THRESHOLDS.watch7) return 'watch';
  return 'low';
}

export async function fetchSites(signal?: AbortSignal): Promise<SiteWatch[]> {
  const lat = SITES.map((s) => s.lat).join(','), lon = SITES.map((s) => s.lon).join(',');
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,snowfall_sum,temperature_2m_max&past_days=7&forecast_days=3&timezone=auto`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const raw = await r.json();
  const arr: any[] = Array.isArray(raw) ? raw : [raw];
  const sum = (a: (number | null)[], i: number, j: number) => a.slice(i, j).every((v) => typeof v === 'number' && Number.isFinite(v))
    ? a.slice(i, j).reduce<number>((s, v) => s + (v as number), 0)
    : null;
  return arr.map((d, i) => {
    const p: (number | null)[] = d.daily?.precipitation_sum ?? [];
    const sn: (number | null)[] = d.daily?.snowfall_sum ?? [];
    const tm: (number | null)[] = d.daily?.temperature_2m_max ?? [];
    const t: string[] = d.daily?.time ?? [];
    // indices 0-6 are the past 7 days, 7 is today, 8-9 are the next two days
    const rainPast3 = sum(p, 4, 7), rainPast7 = sum(p, 0, 7), rainNext3 = sum(p, 7, 10), snowPast7 = sum(sn, 0, 7);
    const tmax = tm[7] ?? null;
    const nodata = p.length < 10 || rainPast3 == null || rainPast7 == null || rainNext3 == null || snowPast7 == null;
    return {
      ...SITES[i], rainPast3, rainPast7, rainNext3, snowPast7, tmax,
      level: nodata ? 'nodata' : classify(rainPast3!, rainNext3!, rainPast7!),
      melt: !nodata && tmax != null && tmax >= 10 && snowPast7 >= 3,
      days: t.flatMap((date, k) => p[k] == null ? [] : [{ date, rain: p[k]! }]),
    } as SiteWatch;
  });
}

export async function fetchPointWeather(lat: number, lon: number, name?: string, signal?: AbortSignal): Promise<SiteWatch> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&daily=precipitation_sum,snowfall_sum,temperature_2m_max&past_days=7&forecast_days=3&timezone=auto`;
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error(`Open-Meteo ${r.status}`);
  const d = await r.json();
  const sum = (a: (number | null)[], i: number, j: number) => a.slice(i, j).every((v) => typeof v === 'number' && Number.isFinite(v))
    ? a.slice(i, j).reduce<number>((s, v) => s + (v as number), 0)
    : null;
  const p: (number | null)[] = d.daily?.precipitation_sum ?? [];
  const sn: (number | null)[] = d.daily?.snowfall_sum ?? [];
  const tm: (number | null)[] = d.daily?.temperature_2m_max ?? [];
  const t: string[] = d.daily?.time ?? [];
  const rainPast3 = sum(p, 4, 7), rainPast7 = sum(p, 0, 7), rainNext3 = sum(p, 7, 10), snowPast7 = sum(sn, 0, 7);
  const tmax = tm[7] ?? null;
  const nodata = p.length < 10 || rainPast3 == null || rainPast7 == null || rainNext3 == null || snowPast7 == null;
  return {
    name: name ?? `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,
    lat,
    lon,
    rainPast3,
    rainPast7,
    rainNext3,
    snowPast7,
    tmax,
    level: nodata ? 'nodata' : classify(rainPast3!, rainNext3!, rainPast7!),
    melt: !nodata && tmax != null && tmax >= 10 && snowPast7 >= 3,
    days: t.flatMap((date, k) => p[k] == null ? [] : [{ date, rain: p[k]! }]),
  } as SiteWatch;
}

