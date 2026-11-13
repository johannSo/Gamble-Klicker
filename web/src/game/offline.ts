// Offline-Einnahmen, während das Spiel geschlossen war (wie js/progress.js:applyOfflineEarnings).
import { getCpsPermanent, passiveActive } from './clicker.ts';
import { addTranslations } from './i18n.ts';
import { earn, getState } from './state.ts';

addTranslations({
  'Willkommen zurück!': 'Welcome back!',
  'Während du {dur} weg warst, haben deine Gebäude {amount} Dublonen verdient{max}.':
    'While you were away for {dur}, your buildings earned {amount} doubloons{max}.',
  ' (höchstens 8 Stunden)': ' (at most 8 hours)',
});

export const OFFLINE_RATE = 0.5;        // Anteil des Einkommens, solange das Spiel geschlossen ist
export const OFFLINE_MAX = 8 * 3600;    // höchstens 8 Stunden
const OFFLINE_MIN = 60;                 // erst ab einer Minute Abwesenheit

export interface OfflineResult { seconds: number; amount: number; capped: boolean }

// Einmal beim Start nach dem Laden aufrufen. null, wenn es nichts gab.
export function applyOfflineEarnings(now = Date.now()): OfflineResult | null {
  const seconds = (now - getState().lastSaved) / 1000;
  if (!(seconds >= OFFLINE_MIN) || !passiveActive()) return null;
  const counted = Math.min(seconds, OFFLINE_MAX);
  const amount = getCpsPermanent() * counted * OFFLINE_RATE;
  if (!(amount > 0)) return null;
  earn(amount, 'passive');
  return { seconds, amount, capped: seconds > OFFLINE_MAX };
}
