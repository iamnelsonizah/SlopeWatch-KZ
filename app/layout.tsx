import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { IBM_Plex_Mono, Onest } from 'next/font/google';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

// Both families draw every Kazakh letter (ә ғ қ ң ө ұ ү һ і); the same pair is used by the QazaqSu water atlas.
const sans = Onest({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin', 'cyrillic', 'cyrillic-ext'], variable: '--font-mono', display: 'swap', weight: ['400', '500', '700'] });

const THEME_BOOTSTRAP = `(() => {
  try {
    const preference = localStorage.getItem('kz-landslide-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = preference === 'dark' || (preference !== 'light' && systemDark) ? 'dark' : 'light';
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();`;

export const metadata: Metadata = {
  title: 'SlopeWatch KZ: Kazakhstan Landslide and Earthquake Atlas',
  description: 'Active faults, earthquakes, slopes, mudflows and rain triggers for Kazakhstan. Screening information with cited sources and downloadable data; not an official hazard map.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <Script id="theme-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
