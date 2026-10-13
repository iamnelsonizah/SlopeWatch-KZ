import { haversineKm, intersectT, type LL, type Seg } from './geo';
import { elevationAt } from './terrain';

export interface Crossing { km: number; label: string; props: Record<string, any> }
export interface Profile {
  km: number[]; elev: (number | null)[]; pts: LL[]; totalKm: number; gain: number; loss: number; max: number; min: number;
  steepest: number; crossings: Crossing[]; availableSamples: number; faultDataAvailable: boolean;
}

/** elevation profile along a drawn line, plus every mapped fault the line crosses */
export async function buildProfile(path: LL[], faults: Seg[], samples = 160, faultDataAvailable = faults.length > 0): Promise<Profile | null> {
  const legs: number[] = [];
  for (let i = 0; i < path.length - 1; i++) legs.push(haversineKm(path[i], path[i + 1]));
  const totalKm = legs.reduce((a, b) => a + b, 0);
  const pts: LL[] = [], km: number[] = [];
  for (let s = 0; s <= samples; s++) {
    let d = (s / samples) * totalKm, i = 0;
    while (i < legs.length - 1 && d > legs[i]) { d -= legs[i]; i++; }
    const t = legs[i] ? Math.min(1, d / legs[i]) : 0;
    pts.push([path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]);
    km.push((s / samples) * totalKm);
  }
  const elev = await Promise.all(pts.map((p) => elevationAt(p[0], p[1])));
  const available = elev.filter((e): e is number => e != null);
  let gain = 0, loss = 0, steepest = 0, validSteps = 0;
  for (let i = 1; i < elev.length; i++) {
    if (elev[i] == null || elev[i - 1] == null) continue;
    validSteps++;
    const dz = elev[i]! - elev[i - 1]!;
    if (dz > 0) gain += dz; else loss -= dz;
    const run = (km[i] - km[i - 1]) * 1000;
    if (run > 0) steepest = Math.max(steepest, (Math.atan(Math.abs(dz) / run) * 180) / Math.PI);
  }
  const crossings: Crossing[] = [];
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    for (const f of faults) {
      const t = intersectT(path[i], path[i + 1], f.a, f.b);
      if (t != null) crossings.push({ km: acc + t * legs[i], label: String(f.props.slipLabel ?? 'Fault'), props: f.props });
    }
    acc += legs[i];
  }
  crossings.sort((a, b) => a.km - b.km);
  // collapse duplicates from adjacent segments of the same trace
  const uniq = crossings.filter((c, i) => i === 0 || Math.abs(c.km - crossings[i - 1].km) > 0.4 || c.props.id !== crossings[i - 1].props.id);
  if (available.length < 2 || !validSteps) return null;
  return { km, elev, pts, totalKm, gain, loss, max: Math.max(...available), min: Math.min(...available), steepest, crossings: uniq, availableSamples: available.length, faultDataAvailable };
}

export function profileToCsv(profile: Profile): string {
  const rows: string[] = ['distance_km,elevation_m,slope_deg,longitude,latitude,fault_crossing'];
  for (let i = 0; i < profile.km.length; i++) {
    const k = profile.km[i];
    const e = profile.elev[i];
    const pt = profile.pts[i];
    let slope = '';
    if (i > 0 && e != null && profile.elev[i - 1] != null) {
      const dz = Math.abs(e - profile.elev[i - 1]!);
      const run = (k - profile.km[i - 1]) * 1000;
      if (run > 0) slope = ((Math.atan(dz / run) * 180) / Math.PI).toFixed(1);
    }
    const stepKm = profile.km[1] ? profile.km[1] - profile.km[0] : 0.2;
    const matchCrossing = profile.crossings.find((c) => Math.abs(c.km - k) <= stepKm / 2);
    const faultLabel = matchCrossing ? `"${matchCrossing.label.replace(/"/g, '""')}"` : '';
    rows.push([
      k.toFixed(3),
      e != null ? e.toFixed(1) : '',
      slope,
      pt ? pt[0].toFixed(5) : '',
      pt ? pt[1].toFixed(5) : '',
      faultLabel,
    ].join(','));
  }
  return rows.join('\n');
}

export function profileToGeoJson(profile: Profile): string {
  const lineCoords = profile.pts.map((pt, i) => [
    Number(pt[0].toFixed(5)),
    Number(pt[1].toFixed(5)),
    profile.elev[i] != null ? Math.round(profile.elev[i]!) : 0,
  ]);
  const features: any[] = [
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: lineCoords,
      },
      properties: {
        totalKm: Number(profile.totalKm.toFixed(2)),
        minElevationM: Math.round(profile.min),
        maxElevationM: Math.round(profile.max),
        climbGainM: Math.round(profile.gain),
        descentLossM: Math.round(profile.loss),
        steepestStepDeg: Number(profile.steepest.toFixed(1)),
        faultCrossingsCount: profile.crossings.length,
      },
    },
    ...profile.crossings.map((c) => {
      let closestPt = profile.pts[0];
      let minDiff = Infinity;
      profile.km.forEach((k, idx) => {
        const diff = Math.abs(k - c.km);
        if (diff < minDiff && profile.pts[idx]) {
          minDiff = diff;
          closestPt = profile.pts[idx];
        }
      });
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(closestPt[0].toFixed(5)), Number(closestPt[1].toFixed(5))],
        },
        properties: {
          km: Number(c.km.toFixed(2)),
          label: c.label,
          rate: c.props?.rate ?? null,
        },
      };
    }),
  ];
  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}
