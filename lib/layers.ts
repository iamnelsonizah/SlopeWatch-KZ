export type LayerId =
  | 'faults' | 'folds' | 'quakes' | 'hillshade' | 'contours' | 'slope' | 'susc'
  | 'triggers' | 'cities' | 'rivers' | 'lakes' | 'regions' | 'reports';

export interface LegendItem { color: string; label: string; kind?: 'swatch' | 'line' | 'dot' }
export interface LayerDef {
  id: LayerId; label: string; group: 'Tectonics' | 'Slopes and terrain' | 'Triggers' | 'Exposure and context' | 'Community'; source: string; legend: LegendItem[];
}

export const FAULT_COLORS = { reverse: '#d62f4b', strike: '#1f6fd1', normal: '#2a9d5c', other: '#6b7c85' };

export const LAYERS: LayerDef[] = [
  { id: 'faults', label: 'Active faults', group: 'Tectonics', source: 'GEM Global Active Faults database',
    legend: [{ color: FAULT_COLORS.reverse, label: 'Reverse (thrust) fault', kind: 'line' }, { color: FAULT_COLORS.strike, label: 'Strike-slip fault', kind: 'line' }, { color: FAULT_COLORS.normal, label: 'Normal fault', kind: 'line' }, { color: FAULT_COLORS.other, label: 'Fault, slip type not given', kind: 'line' }] },
  { id: 'folds', label: 'Folds', group: 'Tectonics', source: 'GEM Global Active Faults database', legend: [{ color: '#9aa7ae', label: 'Anticline or syncline (not a fault)', kind: 'line' }] },
  { id: 'quakes', label: 'Earthquakes', group: 'Tectonics', source: 'USGS ComCat live earthquake catalogue', legend: [{ color: '#e5384f', label: 'Shallow (under 20 km)', kind: 'dot' }, { color: '#f08a24', label: '20 to 70 km', kind: 'dot' }, { color: '#e8c21a', label: '70 to 150 km', kind: 'dot' }, { color: '#3b82c4', label: 'Deeper than 150 km', kind: 'dot' }] },
  { id: 'hillshade', label: 'Hillshade', group: 'Slopes and terrain', source: 'AWS Terrain Tiles (Tilezen/Mapzen; SRTM, GMTED and other DEM sources)', legend: [] },
  { id: 'contours', label: 'Contour lines', group: 'Slopes and terrain', source: 'Elevation contours computed from AWS Terrain Tiles',
    legend: [{ color: '#55371e', label: 'Index contour (500 m / 1000 m)', kind: 'line' }, { color: '#825f3c', label: 'Contour (50 m / 100 m / 200 m)', kind: 'line' }] },
  { id: 'slope', label: 'Slope angle', group: 'Slopes and terrain', source: 'Slope angle computed from AWS Terrain Tiles',
    legend: [{ color: '#fff196', label: 'Slope 10–20°' }, { color: '#fdba46', label: '20–30°' }, { color: '#f26b21', label: '30–40°' }, { color: '#c4182b', label: '40–50°' }, { color: '#7a1a8a', label: 'Over 50°' }] },
  { id: 'susc', label: 'Susceptibility screening', group: 'Slopes and terrain', source: 'Heuristic from slope, fault proximity and wet conditions',
    legend: [{ color: '#ffe9a8', label: 'Screening index: low' }, { color: '#f9b348', label: 'Moderate' }, { color: '#e5552d', label: 'High' }, { color: '#9e1a3a', label: 'Very high' }] },
  { id: 'triggers', label: 'Rain triggers', group: 'Triggers', source: 'Open-Meteo live weather model data',
    legend: [{ color: '#2e9d5c', label: 'Rain screening: low', kind: 'dot' }, { color: '#e0a100', label: 'Watch', kind: 'dot' }, { color: '#c62828', label: 'Elevated', kind: 'dot' }] },
  { id: 'cities', label: 'Cities', group: 'Exposure and context', source: 'Natural Earth populated places', legend: [{ color: '#27353c', label: 'City; size follows population', kind: 'dot' }] },
  { id: 'rivers', label: 'Rivers', group: 'Exposure and context', source: 'Natural Earth', legend: [{ color: '#2d86c4', label: 'Rivers', kind: 'line' }] },
  { id: 'lakes', label: 'Lakes', group: 'Exposure and context', source: 'Natural Earth', legend: [{ color: '#a9d3ee', label: 'Lakes and seas' }] },
  { id: 'regions', label: 'Regions', group: 'Exposure and context', source: 'Natural Earth administrative boundaries', legend: [{ color: '#6b7c85', label: 'Region boundaries', kind: 'line' }] },
  { id: 'reports', label: 'Community reports', group: 'Community', source: 'Community reports (unverified)', legend: [{ color: '#27353c', label: 'Report; ring colour shows verification level', kind: 'dot' }] },
];
export const LAYER_GROUPS: LayerDef['group'][] = ['Tectonics', 'Slopes and terrain', 'Triggers', 'Exposure and context', 'Community'];
export const DEFAULT_LAYERS: LayerId[] = ['faults', 'quakes', 'hillshade', 'regions', 'rivers', 'lakes', 'reports'];
