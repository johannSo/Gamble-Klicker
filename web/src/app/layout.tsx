// Grundgerüst der Seite. Läuft nur beim Bauen (statische Ausgabe): Kopfdaten, Schrift und das SVG-Sprite.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { spriteHTML } from '@/game/icons.ts';
import './globals.css';

const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'Gamble Klicker',
  description: 'Klicke dich reich und verzocke deine Dublonen im Casino! Browser-Spiel aus Cookie Clicker und Casino – nur Spielgeld.',
  authors: [{ name: 'Rafaelo28' }],
  manifest: `${base}/manifest.webmanifest`,
  icons: {
    icon: [
      { url: `${base}/icons/icon.svg`, type: 'image/svg+xml' },
      { url: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
    ],
    apple: `${base}/icons/icon-180.png`,
  },
  // Als App auf dem Home-Bildschirm (iPad/iPhone): Vollbild, eigenes Symbol
  appleWebApp: { capable: true, title: 'Gamble Klicker', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#06120c',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap" />
      </head>
      <body suppressHydrationWarning>
        <div dangerouslySetInnerHTML={{ __html: spriteHTML() }} />
        {children}
      </body>
    </html>
  );
}
