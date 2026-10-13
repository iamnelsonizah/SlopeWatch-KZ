export type LL = [number, number];
const R = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LL, b: LL): number {
  const dLat = rad(b[1] - a[1]), dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inRing(x: number, y: number, ring: number[][]) {
  let r = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) r = !r;
  }
  return r;
}
/** point in Polygon / MultiPolygon geometry */
export function geomContains(g: GeoJSON.Geometry | null | undefined, x: number, y: number): boolean {
  if (!g) return false;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  return polys.some((p) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h)));
}
export function fcContains(fc: GeoJSON.FeatureCollection, x: number, y: number): boolean {
  return fc.features.some((f) => geomContains(f.geometry, x, y));
}

export interface Seg { a: LL; b: LL; props: Record<string, any> }
/** flatten line features into segments */
export function segments(fc: GeoJSON.FeatureCollection, keep?: (p: Record<string, any>) => boolean): Seg[] {
  const out: Seg[] = [];
  for (const f of fc.features) {
    const props = (f.properties ?? {}) as Record<string, any>;
    if (keep && !keep(props)) continue;
    const g = f.geometry;
    const lines = g?.type === 'LineString' ? [g.coordinates] : g?.type === 'MultiLineString' ? g.coordinates : [];
    for (const ln of lines) for (let i = 0; i < ln.length - 1; i++) out.push({ a: ln[i] as LL, b: ln[i + 1] as LL, props });
  }
  return out;
}

/** distance in km from a point to the nearest segment (local equirectangular projection) */
export function nearestSeg(segs: Seg[], lon: number, lat: number): { km: number; seg: Seg | null } {
  const k = Math.cos(rad(lat)) * 111.32, m = 110.57;
  let best = Infinity, bs: Seg | null = null;
  for (const s of segs) {
    const ax = (s.a[0] - lon) * k, ay = (s.a[1] - lat) * m, bx = (s.b[0] - lon) * k, by = (s.b[1] - lat) * m;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best) { best = d; bs = s; }
  }
  return { km: best, seg: bs };
}

/** planar intersection of segments p1-p2 and p3-p4; returns t along p1-p2 or null */
export function intersectT(p1: LL, p2: LL, p3: LL, p4: LL): number | null {
  const d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0]);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d;
  const u = ((p3[0] - p1[0]) * (p2[1] - p1[1]) - (p3[1] - p1[1]) * (p2[0] - p1[0])) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}
