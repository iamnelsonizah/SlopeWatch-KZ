/**
 * Terrain engine. Everything here runs in the browser from AWS Terrarium elevation tiles.
 * Tilezen documents the underlying sources as a zoom-dependent mix, including SRTM and GMTED.
 *
 *  slope://z/x/y   slope-angle shading
 *  susc://z/x/y    transparent screening index: weighted slope, fault proximity and a wet-conditions scenario
 *  elevationAt()   point elevation for the profile tool
 */
import maplibregl from 'maplibre-gl';
import type { Seg } from './geo';

export const DEM_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'];
const demUrl = (z: number, x: number, y: number) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

type Canvas = OffscreenCanvas | HTMLCanvasElement;
const makeCanvas = (w: number, h: number): Canvas => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));
async function toPng(c: Canvas): Promise<ArrayBuffer> {
  if ('convertToBlob' in c) return (await c.convertToBlob({ type: 'image/png' })).arrayBuffer();
  return new Promise((res, rej) => (c as HTMLCanvasElement).toBlob((b) => (b ? b.arrayBuffer().then(res) : rej(new Error('toBlob failed'))), 'image/png'));
}
const ctx2d = (c: Canvas) => c.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;

// ---------- DEM tiles ----------
const cache = new Map<string, Float32Array | null>();
const demFailureListeners = new Set<() => void>();
export function onDemUnavailable(listener: () => void) {
  demFailureListeners.add(listener);
  return () => demFailureListeners.delete(listener);
}
function reportDemUnavailable() { for (const listener of demFailureListeners) listener(); }

export async function loadDem(z: number, x: number, y: number, signal?: AbortSignal): Promise<Float32Array | null> {
  const key = `${z}/${x}/${y}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const r = await fetch(demUrl(z, x, y), { signal });
    if (!r.ok) { if (r.status === 404 || r.status === 204) cache.set(key, null); reportDemUnavailable(); return null; }
    const bmp = await createImageBitmap(await r.blob());
    const c = makeCanvas(256, 256);
    const g = ctx2d(c);
    g.drawImage(bmp, 0, 0);
    const d = g.getImageData(0, 0, 256, 256).data;
    const out = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) out[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    cache.set(key, out);
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return out;
  } catch (e) {
    if (signal?.aborted) throw e;
    reportDemUnavailable();
    return null;
  }
}

const n2 = (z: number) => 2 ** z;
const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n2(z)))) * 180) / Math.PI;
const tileLon = (x: number, z: number) => (x / n2(z)) * 360 - 180;
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const cellMeters = (z: number, y: number) => (40075016.686 * Math.cos((tileLat(y + 0.5, z) * Math.PI) / 180)) / (256 * n2(z));

export function slopeDegrees(dem: Float32Array, cell: number): Float32Array {
  const out = new Float32Array(65536);
  const at = (i: number, j: number) => dem[Math.min(255, Math.max(0, j)) * 256 + Math.min(255, Math.max(0, i))];
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
    const dzdx = (at(i + 1, j - 1) + 2 * at(i + 1, j) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i - 1, j) - at(i - 1, j + 1)) / (8 * cell);
    const dzdy = (at(i - 1, j + 1) + 2 * at(i, j + 1) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i, j - 1) - at(i + 1, j - 1)) / (8 * cell);
    out[j * 256 + i] = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;
  }
  return out;
}

export const SLOPE_CLASSES: { min: number; color: [number, number, number, number]; label: string }[] = [
  { min: 10, color: [255, 241, 150, 120], label: '10–20°' },
  { min: 20, color: [253, 186, 70, 150], label: '20–30°' },
  { min: 30, color: [242, 107, 33, 170], label: '30–40°' },
  { min: 40, color: [196, 24, 43, 185], label: '40–50°' },
  { min: 50, color: [122, 26, 138, 200], label: 'over 50°' },
];

// ---------- faults, for the screening index ----------
let faultLines: { pts: number[][]; box: [number, number, number, number] }[] = [];
let faultDataAvailable = false;
export function setFaultLines(segs: Seg[], available = true) {
  // rebuild polylines from segments (consecutive segments of one feature share endpoints)
  const lines: { pts: number[][]; box: [number, number, number, number] }[] = [];
  let cur: number[][] = [];
  const flush = () => {
    if (cur.length > 1) {
      const xs = cur.map((p) => p[0]), ys = cur.map((p) => p[1]);
      lines.push({ pts: cur, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
    cur = [];
  };
  for (const s of segs) {
    const last = cur[cur.length - 1];
    if (!last || last[0] !== s.a[0] || last[1] !== s.a[1]) { flush(); cur = [s.a]; }
    cur.push(s.b);
  }
  flush();
  faultLines = lines;
  faultDataAvailable = available;
}

export interface SuscParams { ws: number; wf: number; ww: number; buf: number; wet: number }
export const DEFAULT_SUSC: SuscParams = { ws: 55, wf: 25, ww: 20, buf: 10, wet: 50 };
export const SUSC_CLASSES: { min: number; label: string; color: string; rgba: [number, number, number, number] }[] = [
  { min: 0.2, label: 'Low', color: '#ffe9a8', rgba: [255, 233, 168, 110] },
  { min: 0.35, label: 'Moderate', color: '#f9b348', rgba: [249, 179, 72, 150] },
  { min: 0.5, label: 'High', color: '#e5552d', rgba: [229, 85, 45, 175] },
  { min: 0.65, label: 'Very high', color: '#9e1a3a', rgba: [158, 26, 58, 200] },
];

/** slope contribution, 0 to 1: peaks on steep but not vertical slopes */
export function slopeScore(d: number): number {
  if (d < 5) return 0;
  if (d < 15) return ((d - 5) / 10) * 0.25;
  if (d < 30) return 0.25 + ((d - 15) / 15) * 0.5;
  if (d < 45) return 0.75 + ((d - 30) / 15) * 0.25;
  return 0.9;
}

function faultProximity(z: number, x: number, y: number, bufKm: number, cell: number): Uint8ClampedArray | null {
  const lon0 = tileLon(x, z), lon1 = tileLon(x + 1, z), lat0 = tileLat(y, z), lat1 = tileLat(y + 1, z);
  const padDeg = bufKm / 90;
  const hit = faultLines.filter((l) => l.box[2] >= lon0 - padDeg && l.box[0] <= lon1 + padDeg && l.box[3] >= lat1 - padDeg && l.box[1] <= lat0 + padDeg);
  if (!hit.length) return null;
  const c = makeCanvas(256, 256);
  const g = ctx2d(c);
  const my0 = mercY(lat0), my1 = mercY(lat1);
  const px = (lon: number) => ((lon - lon0) / (lon1 - lon0)) * 256;
  const py = (lat: number) => ((my0 - mercY(lat)) / (my0 - my1)) * 256;
  const bufPx = (bufKm * 1000) / cell;
  g.lineJoin = 'round'; g.lineCap = 'round';
  const draw = (w: number, style: string) => {
    g.lineWidth = Math.max(1.5, Math.min(w, 300)); g.strokeStyle = style;
    for (const l of hit) { g.beginPath(); l.pts.forEach((p, i) => (i ? g.lineTo(px(p[0]), py(p[1])) : g.moveTo(px(p[0]), py(p[1])))); g.stroke(); }
  };
  draw(bufPx * 2, 'rgba(0,0,0,0.5)');
  draw(bufPx * 0.8, 'rgba(0,0,0,1)');
  const d = g.getImageData(0, 0, 256, 256).data;
  const out = new Uint8ClampedArray(65536);
  for (let i = 0; i < 65536; i++) out[i] = d[i * 4 + 3];
  return out;
}

async function emptyTile(): Promise<ArrayBuffer> {
  const c = makeCanvas(256, 256);
  return toPng(c);
}
function paint(rgba: Uint8ClampedArray): Canvas {
  const c = makeCanvas(256, 256);
  const g = ctx2d(c);
  const img = g.createImageData(256, 256);
  img.data.set(rgba);
  g.putImageData(img, 0, 0);
  return c;
}

export function renderContours(dem: Float32Array, z: number, dark = false): Uint8ClampedArray {
  let step = 100;
  let indexStep = 500;
  if (z <= 6) { step = 500; indexStep = 1000; }
  else if (z <= 9) { step = 250; indexStep = 1000; }
  else if (z <= 11) { step = 100; indexStep = 500; }
  else { step = 50; indexStep = 250; }

  const indexColor = dark ? [225, 185, 125, 235] : [85, 55, 30, 230];
  const regularColor = dark ? [180, 145, 95, 165] : [130, 95, 60, 160];

  const out = new Uint8ClampedArray(65536 * 4);
  for (let j = 0; j < 255; j++) {
    const row = j * 256;
    const nextRow = (j + 1) * 256;
    for (let i = 0; i < 255; i++) {
      const idx = row + i;
      const e0 = dem[idx];
      const er = dem[idx + 1];
      const ed = dem[nextRow + i];
      const crossX = Math.floor(e0 / step) !== Math.floor(er / step);
      const crossY = Math.floor(e0 / step) !== Math.floor(ed / step);
      if (crossX || crossY) {
        const isIndex = (Math.floor(e0 / indexStep) !== Math.floor(er / indexStep)) ||
                        (Math.floor(e0 / indexStep) !== Math.floor(ed / indexStep));
        const px = idx * 4;
        const color = isIndex ? indexColor : regularColor;
        out[px] = color[0];
        out[px + 1] = color[1];
        out[px + 2] = color[2];
        out[px + 3] = color[3];
      }
    }
  }
  return out;
}

export function contourTiles(dark = false): string {
  return `contour://{z}/{x}/{y}${dark ? '?dark=1' : ''}`;
}

let registered = false;
export function registerTerrainProtocols() {
  if (registered) return;
  registered = true;
  const parse = (url: string) => {
    const m = url.match(/^\w+:\/\/(\d+)\/(\d+)\/(\d+)(?:\?(.*))?$/);
    if (!m) throw new Error('bad tile url ' + url);
    return { z: +m[1], x: +m[2], y: +m[3], q: new URLSearchParams(m[4] ?? '') };
  };

  maplibregl.addProtocol('slope', async (params: any, abort: AbortController) => {
    const { z, x, y } = parse(params.url);
    const demZoom = Math.min(z, 13), demX = z > demZoom ? x >> (z - demZoom) : x, demY = z > demZoom ? y >> (z - demZoom) : y;
    const dem = await loadDem(demZoom, demX, demY, abort.signal);
    if (!dem) return { data: await emptyTile() };
    const s = slopeDegrees(dem, cellMeters(demZoom, demY));
    const out = new Uint8ClampedArray(65536 * 4);
    for (let i = 0; i < 65536; i++) {
      let cls = -1;
      for (let k = SLOPE_CLASSES.length - 1; k >= 0; k--) if (s[i] >= SLOPE_CLASSES[k].min) { cls = k; break; }
      if (cls >= 0) out.set(SLOPE_CLASSES[cls].color, i * 4);
    }
    return { data: await toPng(paint(out)) };
  });

  maplibregl.addProtocol('contour', async (params: any, abort: AbortController) => {
    const { z, x, y, q } = parse(params.url);
    const demZoom = Math.min(z, 13), demX = z > demZoom ? x >> (z - demZoom) : x, demY = z > demZoom ? y >> (z - demZoom) : y;
    const dem = await loadDem(demZoom, demX, demY, abort.signal);
    if (!dem) return { data: await emptyTile() };
    const isDark = q.get('dark') === '1';
    const out = renderContours(dem, z, isDark);
    return { data: await toPng(paint(out)) };
  });

  maplibregl.addProtocol('susc', async (params: any, abort: AbortController) => {
    const { z, x, y, q } = parse(params.url);
    const ws = +(q.get('ws') ?? 55), wf = +(q.get('wf') ?? 25), ww = +(q.get('ww') ?? 20), buf = +(q.get('buf') ?? 10), wet = +(q.get('wet') ?? 50) / 100;
    const dem = await loadDem(z, x, y, abort.signal);
    // Missing fault data must not be rendered as a valid low score (which would imply low susceptibility).
    if (!dem || !faultDataAvailable) return { data: await emptyTile() };
    const cell = cellMeters(z, y);
    const s = slopeDegrees(dem, cell);
    const f = faultProximity(z, x, y, buf, cell);
    const sum = Math.max(1, ws + wf + ww);
    const out = new Uint8ClampedArray(65536 * 4);
    for (let i = 0; i < 65536; i++) {
      const S = slopeScore(s[i]);
      const F = f ? f[i] / 255 : 0;
      const idx = (ws * S + wf * F + ww * wet * S) / sum;
      for (let k = SUSC_CLASSES.length - 1; k >= 0; k--) if (idx >= SUSC_CLASSES[k].min) { out.set(SUSC_CLASSES[k].rgba, i * 4); break; }
    }
    return { data: await toPng(paint(out)) };
  });
}

export function suscTiles(p: SuscParams, version = 0): string {
  return `susc://{z}/{x}/{y}?ws=${p.ws}&wf=${p.wf}&ww=${p.ww}&buf=${p.buf}&wet=${p.wet}&v=${version}`;
}

// ---------- point elevation & slope inspector ----------
export async function elevationAt(lon: number, lat: number, z = 11): Promise<number | null> {
  const n = n2(z);
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const dem = await loadDem(z, tx, ty);
  if (!dem) return null;
  const px = Math.min(255, Math.floor((fx - tx) * 256)), py = Math.min(255, Math.floor((fy - ty) * 256));
  return dem[py * 256 + px];
}

export async function terrainInspect(lon: number, lat: number, z = 11): Promise<{ elevation: number; slope: number } | null> {
  const n = n2(z);
  const fx = ((lon + 180) / 360) * n;
  const fy = ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const dem = await loadDem(z, tx, ty);
  if (!dem) return null;
  const px = Math.min(255, Math.max(0, Math.floor((fx - tx) * 256)));
  const py = Math.min(255, Math.max(0, Math.floor((fy - ty) * 256)));
  const elev = dem[py * 256 + px];

  const at = (i: number, j: number) => dem[Math.min(255, Math.max(0, j)) * 256 + Math.min(255, Math.max(0, i))];
  const cell = cellMeters(z, ty);
  const dzdx = (at(px + 1, py - 1) + 2 * at(px + 1, py) + at(px + 1, py + 1) - at(px - 1, py - 1) - 2 * at(px - 1, py) - at(px - 1, py + 1)) / (8 * cell);
  const dzdy = (at(px - 1, py + 1) + 2 * at(px, py + 1) + at(px + 1, py + 1) - at(px - 1, py - 1) - 2 * at(px, py - 1) - at(px + 1, py - 1)) / (8 * cell);
  const slope = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI;

  return { elevation: Math.round(elev), slope: Math.round(slope) };
}
