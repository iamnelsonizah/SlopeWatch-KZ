// One stroke icon set (24px grid, 1.8 stroke) so every control uses the same drawing style. No emoji or unicode glyphs.
const PATHS = {
  sun: 'M12 4V2.5M12 21.5V20M4 12H2.5M21.5 12H20M6.3 6.3 5.2 5.2M18.8 18.8l-1.1-1.1M6.3 17.7l-1.1 1.1M18.8 5.2l-1.1 1.1M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  close: 'M6 6l12 12M18 6 6 18',
  info: 'M12 11v5m0-8.5v.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  alert: 'M12 9v4m0 3.5v.01M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  chevronDown: 'm6 9 6 6 6-6',
  chevronUp: 'm6 15 6-6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  locate: 'M12 2.5V5m0 14v2.5M2.5 12H5m14 0h2.5M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  share: 'M12 15V3.5m0 0L8 7.5m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5',
  tools: 'M4 6h9m4 0h3M4 12h3m4 0h9M4 18h11m4 0h1M15 4v4M9 10v4M17 16v4',
  filter: 'M4 6h16M7 12h10M10 18h4',
  mountain: 'm2.5 19 6.5-12 4 7 2.5-4 6 9h-19Z',
  cube: 'm12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9',
  profile: 'M3 19 9 11l4 4 8-10M3 21h18',
  cloud: 'M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 10.5a3.8 3.8 0 0 1-.5 7.5H7Z',
  rain: 'M7 15a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 7.5a3.8 3.8 0 0 1-.5 7.5M8 18v3m4-4v3m4-2v3',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  print: 'M7 8V3.5h10V8M7 17H5a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v6.5H7V14Z',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 3-3 4 4M15.5 9.5v.01',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19.5h14',
  focus: 'M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4M12 9.5v5M9.5 12h5',
  map: 'm3 6 6-2.5 6 2.5 6-2.5v14.5L15 20.5 9 18l-6 2.5V6Zm6-2.5V18m6-11.5v14',
  wave: 'M2 12h4l2.5-7 4 14 3.5-9 2 4H22',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.5a6.5 6.5 0 0 1 3.5 5.5',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Zm0 15A2.5 2.5 0 0 0 6.5 21H20',
  database: 'M4 6.5C4 4.6 7.6 3 12 3s8 1.6 8 3.5S16.4 10 12 10 4 8.4 4 6.5Zm0 0v11C4 19.4 7.6 21 12 21s8-1.6 8-3.500v-11M4 12c0 1.9 3.6 3.5 8 3.500s8-1.6 8-3.5',
  city: 'M3 21h18M5 21V8l6-3v16m0-11h8v11M8 10v.01M8 14v.01M8 18v.01M15 14v.01M15 18v.01',
  more: 'M5 12v.01M12 12v.01M19 12v.01',
  play: 'M7 4.5v15l12-7.5-12-7.500Z',
  pause: 'M8 5v14M16 5v14',
  quote: 'M10 7H6a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3M19 7h-4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3v1a3 3 0 0 1-3 3',
  list: 'M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01',
  mail: 'M3.5 6h17v12h-17V6Zm0 .500 8.5 6.5 8.5-6.5',
  compass: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-5.5-3.5-2 5-5 2 2-5 5-2Z',
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className ? `icon ${className}` : 'icon'} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
