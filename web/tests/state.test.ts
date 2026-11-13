// Spielstand: Geld, Laden alter Stände (applyData), Import/Export, gleiche Regeln wie js/state.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLang } from '../src/game/i18n.ts';
import { encode } from '../src/game/savecode.ts';
import { applyData, canAfford, cleanData, createDefaultState, earn, exportSave, getState, importSave, now, spend } from '../src/game/state.ts';
import { legacyAvailable, loadLegacy } from './legacy.ts';

test('earn und spend', () => {
  applyData({ money: 0 });
  const s = getState();
  earn(100, 'click');
  assert.equal(s.money, 100);
  assert.equal(s.totalEarned, 100);
  assert.equal(s.clickEarned, 100);
  earn(50, 'casino');
  assert.equal(s.money, 150);
  assert.equal(s.totalEarned, 100, 'Casino zählt nicht als verdient');
  assert.equal(s.allTimeEarned, 100);
  earn(NaN); earn(-5); earn(0);
  assert.equal(s.money, 150, 'ungültige Beträge werden geschluckt');
  assert.equal(spend(200), false);
  assert.equal(spend(-1), false);
  assert.equal(spend(NaN), false);
  assert.equal(spend(0), true);
  assert.equal(spend(150), true);
  assert.equal(s.money, 0);
  assert.equal(canAfford(0), true);
});

test('applyData weist kaputte Daten ab', () => {
  for (const bad of [null, 5, 'x', [], {}, { money: 'viel' }, { money: Infinity }, { money: NaN }]) {
    assert.equal(applyData(bad), false, JSON.stringify(bad));
  }
});

test('alter Spielstand: fehlende Felder bekommen Standardwerte', () => {
  assert.equal(applyData({
    money: 5, totalEarned: 77, buildings: { piggy: 3 },
    casino: { rounds: 4, games: { room: { name: 'Käpt’n', avatar: '🦈' } } },
    fleet: { ships: [], log: 'kaputt' }, boss: { level: -2 }, cosmetics: { equipped: { coin: 'ruby' } },
    unbekannt: { bleibt: true },
  }), true);
  const s = getState();
  assert.equal(s.allTimeEarned, 77, 'allTimeEarned aus totalEarned');
  assert.equal(s.settings.lang, 'de', 'ohne gespeicherte Sprache bleibt Deutsch');
  assert.equal(getLang(), 'de');
  assert.ok(s.casino.statsSince > 0, 'Statistik je Spiel zählt ab jetzt');
  assert.deepEqual(s.fleet.ships, {});
  assert.deepEqual(s.fleet.log, []);
  assert.equal(s.boss.level, 0);
  assert.equal(s.cosmetics.equipped.coin, 'ruby');
  assert.equal(s.cosmetics.equipped.theme, 'tavern');
  assert.deepEqual(s.player, { name: 'Käpt’n', avatar: '🦈', fig: '', figOn: false });
  assert.deepEqual((s as unknown as Record<string, unknown>).unbekannt, { bleibt: true }, 'unbekannte Felder bleiben erhalten');
});

test('Daten von außen werden entschärft', () => {
  const evil = JSON.parse('{"money": 1, "player": {"name": "<img src=x onerror=alert(1)>"}, "__proto__": {"x": 1}, "friends": {"<b>": {"name": "`a\\"b\'c"}}}');
  assert.equal(applyData(evil), true);
  const s = getState();
  assert.equal(s.player.name, '‹img src=x onerror=alert(1)›');
  assert.deepEqual(s.friends, { '‹b›': { name: 'ˋa”b’c' } });
  assert.equal(({} as Record<string, unknown>).x, undefined, 'kein Prototyp verändert');
  assert.equal(applyData([{ money: 1 }]), false, 'Array ist kein Spielstand');
  applyData({ money: 1, buffs: 'kaputt', buildings: [1, 2], casino: { games: [], history: {}, vip: -3 }, lastSaved: 'gestern' });
  const t = getState();
  assert.deepEqual(t.buffs, []);
  assert.deepEqual(t.buildings, {});
  assert.deepEqual(t.casino.games, {});
  assert.deepEqual(t.casino.history, []);
  assert.equal(t.casino.vip, 0);
  assert.ok(t.lastSaved > 0);
});

test('gleiche Entschärfung wie js/state.js', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  const probe = JSON.parse('{"a": "<x>\'\\"`", "b": [1, null, {"<k>": true}], "__proto__": 1, "constructor": 2}');
  assert.deepEqual(cleanData(probe), GK.cleanData(probe));
});

test('Spielzeit läuft nie rückwärts und nie vor das letzte Speichern', () => {
  applyData({ money: 0, lastSaved: Date.now() + 3600e3 });
  const a = now();
  assert.ok(a >= getState().lastSaved);
  assert.ok(now() >= a);
});

test('Export und Import', () => {
  applyData({ money: 123, settings: { lang: 'en' } });
  assert.equal(getLang(), 'en');
  const code = exportSave();
  applyData({ money: 0, settings: { lang: 'de' } });
  assert.equal(importSave(code), true);
  assert.equal(getState().money, 123);
  assert.equal(getLang(), 'en');
  assert.equal(importSave('Unsinn'), false);
  assert.equal(importSave(encode({ kein: 'spielstand' })), false);
  applyData({ money: 0, settings: { lang: 'de' } });
});

test('Standardzustand gleicht dem alten Spiel', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  const strip = (s: Record<string, unknown>) => {
    const copy = JSON.parse(JSON.stringify(s));
    delete copy.startedAt;
    delete copy.lastSaved;
    return copy;
  };
  GK.resetSave();
  assert.deepEqual(strip(createDefaultState() as unknown as Record<string, unknown>), strip(GK.state));
});
