import type { BasemapId } from './basemaps';
import type { LayerId } from './layers';

export interface UrlState {
  tab?: string; basemap?: BasemapId; focus?: boolean; layers?: LayerId[]; view?: { lng: number; lat: number; z: number; pitch: number; bearing: number };
  sel?: string; terrain?: boolean; minMag?: number; yFrom?: number; yTo?: number; susc?: string;
}

export function encode(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.tab && s.tab !== 'map') p.set('t', s.tab);
  if (s.basemap && s.basemap !== 'map') p.set('b', s.basemap);
  if (s.focus === false) p.set('f', '0');
  if (s.layers) p.set('l', s.layers.join(','));
  if (s.view) p.set('v', [s.view.lng.toFixed(3), s.view.lat.toFixed(3), s.view.z.toFixed(2), Math.round(s.view.pitch), Math.round(s.view.bearing)].join(','));
  if (s.sel) p.set('s', s.sel);
  if (s.terrain) p.set('3d', '1');
  if (s.minMag != null) p.set('m', String(s.minMag));
  if (s.yFrom != null) p.set('y0', String(s.yFrom));
  if (s.yTo != null) p.set('y1', String(s.yTo));
  if (s.susc) p.set('su', s.susc);
  return p.toString();
}

export function decode(q: string): UrlState {
  const p = new URLSearchParams(q);
  const out: UrlState = {};
  if (p.get('t')) out.tab = p.get('t')!;
  if (p.get('b')) out.basemap = p.get('b') as BasemapId;
  if (p.get('f') === '0') out.focus = false;
  if (p.get('l') != null) out.layers = p.get('l')!.split(',').filter(Boolean) as LayerId[];
  const v = p.get('v')?.split(',').map(Number);
  if (v && v.length >= 3 && v.every((n) => Number.isFinite(n))) out.view = { lng: v[0], lat: v[1], z: v[2], pitch: v[3] ?? 0, bearing: v[4] ?? 0 };
  if (p.get('s')) out.sel = p.get('s')!;
  if (p.get('3d') === '1') out.terrain = true;
  if (p.get('m')) out.minMag = Number(p.get('m'));
  if (p.get('y0')) out.yFrom = Number(p.get('y0'));
  if (p.get('y1')) out.yTo = Number(p.get('y1'));
  if (p.get('su')) out.susc = p.get('su')!;
  return out;
}
