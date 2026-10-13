import type { StyleSpecification } from 'maplibre-gl';

export type BasemapId = 'outline' | 'map' | 'satellite' | 'terrain' | 'nasa';
export const BASEMAPS: { id: BasemapId; label: string }[] = [
  { id: 'outline', label: 'Outline' },
  { id: 'map', label: 'Map' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'nasa', label: 'NASA daily' },
];

const CUSTOM = process.env.NEXT_PUBLIC_CUSTOM_STYLE_URL || '';
const MT = process.env.NEXT_PUBLIC_MAPTILER_KEY || '';
const ST = process.env.NEXT_PUBLIC_STADIA_KEY || '';

/** Which provider is serving the basemap right now (shown in the UI) */
export const BASEMAP_PROVIDER = CUSTOM ? 'Custom style' : MT ? 'MapTiler' : ST ? 'Stadia Maps' : 'OpenFreeMap / Esri (no key)';

export function getBasemapProvider(dark = false): string {
  if (CUSTOM) return 'Custom style';
  if (MT) return 'MapTiler';
  if (ST) return 'Stadia Maps';
  if (dark) return 'Carto / Esri (no key)';
  return 'OpenFreeMap / Esri (no key)';
}

function raster(
  id: string,
  tiles: string[],
  attribution: string,
  maxzoom = 19,
  tileSize = 256,
  bg = '#e4ecef',
  paint: Record<string, number | string> = {},
): StyleSpecification {
  return {
    version: 8,
    sources: { [id]: { type: 'raster', tiles, tileSize, maxzoom, attribution } },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': bg } },
      { id: `base-${id}`, type: 'raster', source: id, paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 150, ...paint } },
    ],
  };
}

export function yesterdayUTC(): string {
  const d = new Date(Date.now() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export const NASA_LAYER = 'MODIS_Terra_CorrectedReflectance_TrueColor';
export function nasaTiles(date = yesterdayUTC()): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${NASA_LAYER}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

export function getBasemapStyle(id: BasemapId, dark = false): StyleSpecification | string {
  switch (id) {
    case 'outline':
      return {
        version: 8,
        sources: {},
        layers: [{ id: 'bg', type: 'background', paint: { 'background-color': dark ? '#0a1017' : '#dfe9ec' } }],
      };
    case 'map':
      if (CUSTOM) return CUSTOM;
      if (MT) return `https://api.maptiler.com/maps/${dark ? 'dataviz-dark' : 'streets-v2'}/style.json?key=${MT}`;
      if (ST) return `https://tiles.stadiamaps.com/styles/${dark ? 'alidade_smooth_dark' : 'osm_bright'}.json?api_key=${ST}`;
      if (dark) {
        return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
      }
      return 'https://tiles.openfreemap.org/styles/liberty';
    case 'satellite':
      if (MT) return `https://api.maptiler.com/maps/satellite/style.json?key=${MT}`;
      if (ST) return `https://tiles.stadiamaps.com/styles/alidade_satellite.json?api_key=${ST}`;
      return raster(
        'esri-sat',
        ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        'Imagery © Esri, Maxar, Earthstar Geographics',
        19,
        256,
        dark ? '#080d14' : '#e4ecef',
      );
    case 'terrain':
      if (MT) return `https://api.maptiler.com/maps/${dark ? 'backdrop-dark' : 'outdoor-v2'}/style.json?key=${MT}`;
      if (ST) return `https://tiles.stadiamaps.com/styles/${dark ? 'alidade_smooth_dark' : 'stamen_terrain'}.json?api_key=${ST}`;
      if (dark) {
        return raster(
          'esri-dark-gray',
          ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
          'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors',
          16,
          256,
          '#090e15',
          { 'raster-brightness-max': 0.88, 'raster-contrast': 0.15 },
        );
      }
      return raster(
        'esri-topo',
        ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
        'Tiles © Esri, HERE, Garmin, OpenStreetMap contributors',
        19,
        256,
        '#f0f3f4',
        { 'raster-brightness-max': 1, 'raster-contrast': 0.08, 'raster-saturation': -0.02 },
      );
    case 'nasa':
      return raster(
        'nasa-base',
        [nasaTiles()],
        'Imagery: NASA GIBS / EOSDIS (MODIS Terra)',
        9,
        256,
        dark ? '#080d14' : '#e4ecef',
      );
  }
}
