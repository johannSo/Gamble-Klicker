// Zahlen- und Zeitformatierung in deutscher Schreibweise (Nachfolger von js/format.js).
// Zahlen bleiben auch auf Englisch deutsch geschrieben (1.234,5).
import { addTranslations, t } from './i18n.ts';

addTranslations({ 'T.': 'd', 'Std.': 'h', 'Min.': 'min', 'Sek.': 's' });

// Deutsche Zahlwörter (lange Skala), vom größten zum kleinsten
const BIG_UNITS: readonly { value: number; name: string }[] = [
  { value: 1e63, name: 'Dezd.' },
  { value: 1e60, name: 'Dez.' },
  { value: 1e57, name: 'Nond.' },
  { value: 1e54, name: 'Non.' },
  { value: 1e51, name: 'Oktd.' },
  { value: 1e48, name: 'Okt.' },
  { value: 1e45, name: 'Septd.' },
  { value: 1e42, name: 'Sept.' },
  { value: 1e39, name: 'Sextd.' },
  { value: 1e36, name: 'Sext.' },
  { value: 1e33, name: 'Quintd.' },
  { value: 1e30, name: 'Quint.' },
  { value: 1e27, name: 'Quadrd.' },
  { value: 1e24, name: 'Quadr.' },
  { value: 1e21, name: 'Trd.' },
  { value: 1e18, name: 'Trio.' },
  { value: 1e15, name: 'Brd.' },
  { value: 1e12, name: 'Bio.' },
  { value: 1e9, name: 'Mrd.' },
  { value: 1e6, name: 'Mio.' },
];

const intFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const decFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const bigFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Geldbetrag als Text: 1.234 / 12,5 / 1,23 Mio.
export function formatNumber(n: number, allowDecimals = false): string {
  if (!isFinite(n)) return '∞';
  const abs = Math.abs(n);
  for (const unit of BIG_UNITS) {
    // Geschütztes Leerzeichen: „1,23“ und „Mio.“ werden nie auf zwei Zeilen verteilt
    if (abs >= unit.value) return bigFormat.format(n / unit.value) + ' ' + unit.name;
  }
  if (allowDecimals && abs < 100 && n % 1 !== 0) return decFormat.format(n);
  return intFormat.format(Math.floor(n));
}

// Dezimalzahl auf Deutsch (z. B. Multiplikatoren „2,45“). Formate werden zwischengespeichert.
const decimalFormats: Record<string, Intl.NumberFormat> = {};
export function formatDecimal(n: number, minDigits: number, maxDigits: number): string {
  const key = minDigits + '|' + maxDigits;
  const f = (decimalFormats[key] ??= new Intl.NumberFormat('de-DE', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }));
  return f.format(n);
}

// ---------- Beträge eingeben: 500k, 2,5M, 1B, 3 Mio., 1.000.000 … ----------

// Abkürzungen → Zehnerpotenz. B steht wie in vielen Spielen für eine Milliarde (englisch „billion“),
// ausgeschrieben gelten die deutschen Wörter (Billion = 1.000 Milliarden, wie in der Anzeige „Bio.“).
const SUFFIXES: Record<string, number> = {
  '': 0, k: 3, t: 3, tsd: 3, tausend: 3,
  m: 6, mio: 6, million: 6, millionen: 6,
  b: 9, mrd: 9, milliarde: 9, milliarden: 9,
  bio: 12, billion: 12, billionen: 12,
  brd: 15, billiarde: 15, billiarden: 15,
  trio: 18, trillion: 18, trillionen: 18,
  trd: 21, trilliarde: 21, trilliarden: 21,
  quadr: 24, quadrd: 27, quint: 30, quintd: 33,
  sext: 36, sextd: 39, sept: 42, septd: 45, okt: 48, oktd: 51, non: 54, nond: 57, dez: 60, dezd: 63,
};

// Zahl vor der Abkürzung: Komma oder Punkt als Dezimalzeichen, das andere (bzw. mehrere gleiche)
// trennt Tausender wie in „1.000.000“. Ein Punkt vor genau drei Ziffern ist ein Tausenderpunkt („1.000“).
function numberPart(text: string): string | null {
  const count = (ch: string) => text.split(ch).length - 1;
  let dec: string | null = null;
  if (count('.') && count(',')) dec = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
  else if (count(',') === 1) dec = ',';
  else if (count('.') === 1 && !/^\d{1,3}\.\d{3}$/.test(text)) dec = '.';
  const cut = dec ? text.lastIndexOf(dec) : text.length;
  const whole = text.slice(0, cut);
  const frac = text.slice(cut + 1);
  const sep = dec === ',' || (!dec && count('.')) ? '.' : ',';
  const grouped = new RegExp('^\\d{1,3}(\\' + sep + '\\d{3})+$');
  if (!/^\d*$/.test(frac) || !(whole + frac) || !(/^\d*$/.test(whole) || grouped.test(whole))) return null;
  return whole.split(sep).join('') + (frac ? '.' + frac : '');
}

// Liest einen Betrag aus einem Eingabefeld. Unbekannte Eingaben ergeben NaN.
export function parseAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  const text = String(value || '').toLowerCase().replace(/[\s ']/g, '');
  const match = text.match(/^([\d.,]+?)([a-z.]*)$/);
  if (!match) return NaN;
  const num = numberPart(match[1]);
  const exp = SUFFIXES[match[2].replace(/\./g, '')];
  if (num === null || exp === undefined) return NaN;
  const result = Number(num + 'e' + exp); // „2.3e6“ ist genau 2.300.000
  return isFinite(result) ? result : NaN;
}

// Kurze, wieder einlesbare Schreibweise für ein Eingabefeld: 5 Mio. / 2,5 Mrd. / 12.345
export function formatAmount(n: number): string {
  if (!isFinite(n)) return '';
  for (const unit of BIG_UNITS) {
    const q = n / unit.value;
    if (Math.abs(n) >= unit.value && Math.abs(q * 100 - Math.round(q * 100)) < 1e-6) {
      return formatDecimal(q, 0, 2) + ' ' + unit.name;
    }
  }
  return intFormat.format(Math.floor(n));
}

// Sekunden als „1 Std. 5 Min.“ (Sekunden nur, wenn weder Tage noch Stunden)
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d) parts.push(d + ' ' + t('T.'));
  if (h) parts.push(h + ' ' + t('Std.'));
  if (m) parts.push(m + ' ' + t('Min.'));
  if (!d && !h) parts.push(s + ' ' + t('Sek.'));
  return parts.join(' ');
}
