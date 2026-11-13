// Lädt das bisherige Spiel (js/*.js) in Node, um die neue Fassung Zahl für Zahl damit zu vergleichen.
// Wie in den alten Tests: window = global, ein kleines document-Gerüst, dann die Skripte der Reihe nach.
// Fällt weg, sobald das alte Spiel gelöscht ist.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'js');
export const legacyAvailable = existsSync(path.join(JS, 'clicker.js'));

// Das alte Spiel hat keine Typen
export type LegacyGK = any;

let cached: LegacyGK | null = null;

export function loadLegacy(): LegacyGK {
  if (cached) return cached;
  const g = globalThis as Record<string, unknown>;
  g.window = globalThis;
  g.document ??= { addEventListener() {}, querySelector() { return null; }, getElementById() { return null }, visibilityState: 'visible' };
  g.location ??= { search: '', pathname: '/', origin: '', hash: '' };
  g.history ??= { replaceState() {} };
  const require = createRequire(import.meta.url);
  for (const f of ['icons.js', 'format.js', 'savecode.js', 'state.js', 'daily.js', 'progress.js', 'clicker.js', 'casino/casino.js', 'fleet.js', 'boss.js']) {
    require(path.join(JS, f));
  }
  cached = g.GK as LegacyGK;
  cached.sound = { play() {} };
  return cached;
}
