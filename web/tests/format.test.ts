// Zahlenformate und Beträge eingeben – gleiche Fälle wie tests/format.test.js, dazu Vergleich mit dem alten Code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, formatDecimal, formatDuration, formatNumber, parseAmount } from '../src/game/format.ts';
import { setLang } from '../src/game/i18n.ts';
import { legacyAvailable, loadLegacy } from './legacy.ts';

test('formatNumber', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(1234.9), '1.234');
  assert.equal(formatNumber(12.34, true), '12,3');
  assert.equal(formatNumber(12, true), '12');
  assert.equal(formatNumber(1234567), '1,23 Mio.');
  assert.equal(formatNumber(2.5e9), '2,50 Mrd.');
  assert.equal(formatNumber(1e63), '1,00 Dezd.');
  assert.equal(formatNumber(Infinity), '∞');
});

test('parseAmount', () => {
  const cases: [string, number][] = [
    ['500k', 500000], ['2,5M', 2500000], ['1B', 1e9], ['1 Bio.', 1e12], ['3 Mio.', 3e6],
    ['1.234,56', 1234.56], ['1.000.000', 1e6], ['1.000', 1000], ['1.5', 1.5], ['12', 12],
  ];
  for (const [text, want] of cases) assert.equal(parseAmount(text), want, text);
  for (const bad of ['-5', 'abc', '', '1,2,3', '5x']) assert.ok(Number.isNaN(parseAmount(bad)), bad);
  assert.equal(parseAmount(42), 42);
});

test('formatAmount lässt sich wieder einlesen', () => {
  for (const n of [5e6, 2.5e9, 1234567, 12345, 7.25e15]) assert.equal(parseAmount(formatAmount(n)), n, String(n));
  assert.equal(formatAmount(2.5e9), '2,5 Mrd.');
  assert.equal(formatAmount(NaN), '');
});

test('formatDecimal und formatDuration', () => {
  assert.equal(formatDecimal(2.456, 2, 2), '2,46');
  assert.equal(formatDuration(3725), '1 Std. 2 Min.');
  assert.equal(formatDuration(45), '45 Sek.');
  // Im alten Spiel blieb das auf Englisch deutsch (Ladereihenfolge) – hier wirkt die Übersetzung
  setLang('en');
  assert.equal(formatDuration(3725), '1 h 2 min');
  setLang('de');
});

test('gleiche Ausgabe wie js/format.js', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  const values = [0, 0.5, 7.25, 99.9, 100.5, 1234, 999999, 1e6, 123456789, 4.2e13, 9.99e25, 1e70, -2500, -3.3e9];
  for (const n of values) {
    assert.equal(formatNumber(n), GK.formatNumber(n), `formatNumber(${n})`);
    assert.equal(formatNumber(n, true), GK.formatNumber(n, true), `formatNumber(${n}, true)`);
    assert.equal(formatAmount(n), GK.formatAmount(n), `formatAmount(${n})`);
  }
  for (const text of ['500k', '2,5M', '1B', '1 Bio.', '1.234,56', '7 quint', 'x', '1,5 Mrd.']) {
    assert.deepEqual(parseAmount(text), GK.parseAmount(text), text);
  }
});
