export type Lang = 'en' | 'ru' | 'kk';
export type PlaceType = 'landslide' | 'mudflow' | 'glacial' | 'quake' | 'protection';
/** A = well documented, B = documented but details approximate, C = unverified or substantially approximate, confirm before use */
export type Verification = 'A' | 'B' | 'C';

export interface Place {
  id: string;
  type: PlaceType;
  name: Record<Lang, string>;
  lat: number;
  lon: number;
  region: string;
  verification: Verification;
  year?: number;
  magnitude?: number;
  trigger?: string;
  note?: string;
  source: string;
  sourceLinks?: { label: string; url: string }[];
  approx?: boolean;
  locationAccuracy?: string;
  fatalities?: number;
  injuries?: number;
  catalog?: string;
}

export type FC = GeoJSON.FeatureCollection;
export const EMPTY_FC: FC = { type: 'FeatureCollection', features: [] };

export interface Quake {
  id: string;
  mag: number;
  depth: number | null;
  time: number;
  lat: number;
  lon: number;
  place: string;
  /** inside the national border (otherwise within ~100 km of it) */
  inside: boolean;
  region: string;
}

export type LoadState = 'idle' | 'loading' | 'ok' | 'error';
export type Level = 'low' | 'watch' | 'elevated' | 'nodata';

export interface SiteWatch {
  name: string;
  lat: number;
  lon: number;
  rainPast3: number | null;
  rainPast7: number | null;
  rainNext3: number | null;
  snowPast7: number | null;
  tmax: number | null;
  level: Level;
  melt: boolean;
  days: { date: string; rain: number }[];
}

export type ReportCategory = 'landslide' | 'mudflow' | 'rockfall' | 'cracks' | 'drainage' | 'other';
export interface Report {
  id: string;
  category: ReportCategory;
  description: string;
  lat: number;
  lon: number;
  createdAt: string;
  photo?: string;
  verification: Verification;
  status: 'published' | 'hidden';
}
