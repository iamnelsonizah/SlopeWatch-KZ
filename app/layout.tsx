import type { Metadata, Viewport } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kazakhstan Landslide and Earthquake Atlas',
  description: 'Active faults, earthquakes, slopes, mudflows and rain triggers for Kazakhstan.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" data-theme="system"><body>{children}</body></html>);
}
