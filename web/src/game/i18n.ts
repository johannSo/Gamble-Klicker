// Sprachumschaltung Deutsch/Englisch (Nachfolger von js/i18n.js).
// Deutsch ist die Quellsprache und zugleich der Schlüssel: t('deutscher text') liefert auf Englisch
// die angemeldete Übersetzung, sonst den deutschen Text. Jedes Modul meldet seine Übersetzungen
// selbst über addTranslations an – anders als im alten Code spielt die Ladereihenfolge keine Rolle.

export type Lang = 'de' | 'en';
export type Vars = Record<string, string | number>;

const EN: Record<string, string> = {};
let current: Lang = 'de';

export function addTranslations(map: Record<string, string>): void {
  Object.assign(EN, map);
}

export function getLang(): Lang {
  return current;
}

// Wird vom Spielstand gesetzt (state.ts), sobald die Sprache feststeht
export function setLang(lang: string): Lang {
  current = lang === 'en' ? 'en' : 'de';
  return current;
}

// {name} in einer Vorlage durch die übergebenen Werte ersetzen
export function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

// Deutschen Quelltext übersetzen. ctx: Kontext, wenn dasselbe deutsche Wort je nach Spiel anders heißt
// (angemeldet als 'ctx\u0001wort', wie im alten Code).
export function t(de: string, vars?: Vars, ctx?: string): string {
  let s = de;
  if (current === 'en') {
    if (ctx != null && EN[ctx + '\u0001' + de] != null) s = EN[ctx + '\u0001' + de];
    else if (EN[de] != null) s = EN[de];
  }
  return interpolate(s, vars);
}

// Browser-Sprache: alles außer Deutsch startet auf Englisch
export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : '';
  return String(nav || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';
}
