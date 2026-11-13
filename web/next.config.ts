import type { NextConfig } from 'next';

// Statische Ausgabe (out/) für GitHub Pages – kein Server nötig.
// NEXT_BASE_PATH setzt den Unterordner, z. B. „/Gamble-Klicker/next“ auf rafaelo28.github.io.
const basePath = process.env.NEXT_BASE_PATH || '';

const config: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
