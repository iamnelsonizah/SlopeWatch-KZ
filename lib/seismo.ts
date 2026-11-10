import type { Quake } from './types';

/**
 * Frequency-magnitude statistics for a catalogue subset.
 *
 * Mc (magnitude of completeness) uses the maximum-curvature method: the most populated 0.1 bin, plus the
 * customary +0.2 correction (Wiemer & Wyss 2000; Woessner & Wiemer 2005).
 * b uses the Aki (1965) maximum-likelihood estimator with Utsu's binning correction;
 * its standard error is the Shi & Bolt (1982) formula.
 *
 * The USGS catalogue mixes magnitude scales (mostly mb, with Mw for larger events), so these values
 * describe the catalogue as published. They are not a homogenised-Mw hazard input.
 */
export interface FmdBin { m: number; n: number; cum: number }
export interface Fmd {
  bins: FmdBin[];
  mc: number | null;
  b: number | null;
  bErr: number | null;
  a: number | null;
  nAbove: number;
}
const BIN = 0.1;
const MIN_EVENTS = 50;
const r1 = (x: number) => Math.round(x * 10) / 10;

export function frequencyMagnitude(quakes: Quake[]): Fmd {
  const counts = new Map<number, number>();
  for (const q of quakes) { const m = r1(q.mag); counts.set(m, (counts.get(m) ?? 0) + 1); }
  const mags = [...counts.keys()].sort((x, y) => x - y);
  if (!mags.length) return { bins: [], mc: null, b: null, bErr: null, a: null, nAbove: 0 };
  const bins: FmdBin[] = [];
  let cum = quakes.length;
  for (let m = mags[0]; m <= mags[mags.length - 1] + 1e-9; m = r1(m + BIN)) {
    const n = counts.get(m) ?? 0;
    bins.push({ m, n, cum });
    cum -= n;
  }
  const peak = bins.reduce((best, x) => (x.n > best.n ? x : best), bins[0]);
  const mc = r1(peak.m + 0.2);
  const above = quakes.filter((q) => r1(q.mag) >= mc - 1e-9);
  if (above.length < MIN_EVENTS) return { bins, mc, b: null, bErr: null, a: null, nAbove: above.length };
  const mean = above.reduce((s, q) => s + q.mag, 0) / above.length;
  const b = Math.LOG10E / (mean - (mc - BIN / 2));
  const variance = above.reduce((s, q) => s + (q.mag - mean) ** 2, 0) / (above.length * (above.length - 1));
  const bErr = 2.3 * b * b * Math.sqrt(variance);
  const a = Math.log10(above.length) + b * mc;
  return { bins, mc, b, bErr, a, nAbove: above.length };
}

/** magnitude-scale groups as reported by the catalogue */
export function magTypeGroup(magType: string): 'mb' | 'Mw' | 'Ms' | 'ML' | 'other' {
  const m = magType.toLowerCase();
  if (m.startsWith('mw')) return 'Mw';
  if (m === 'mb' || m === 'mblg' || m === 'mb_lg') return 'mb';
  if (m.startsWith('ms')) return 'Ms';
  if (m === 'ml') return 'ML';
  return 'other';
}

export const DEPTH_CLASSES = [
  { label: 'Under 20 km', from: 0, to: 20, color: '#c2452d' },
  { label: '20 to 70 km', from: 20, to: 70, color: '#d98a2b' },
  { label: '70 to 150 km', from: 70, to: 150, color: '#b9a23a' },
  { label: 'Deeper than 150 km', from: 150, to: Infinity, color: '#3f73a8' },
] as const;
