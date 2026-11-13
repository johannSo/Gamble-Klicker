// Klicker: Preise, Einkommen, Klickkraft, Upgrades, Combo – und Zahl für Zahl gleich wie js/clicker.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../src/game/clicker.ts';
import { applyData, getState } from '../src/game/state.ts';
import { applyOfflineEarnings } from '../src/game/offline.ts';
import { legacyAvailable, loadLegacy } from './legacy.ts';

const close = (a: number, b: number) => Math.abs(a - b) <= Math.abs(b) * 1e-9;

test('Gebäudepreis (geometrische Reihe)', () => {
  const piggy = C.BUILDINGS[1];
  assert.equal(C.buildingCost(piggy, 0, 1), 100);
  assert.equal(C.buildingCost(piggy, 1, 1), 115);
  assert.equal(C.buildingCost(piggy, 0, 2), 215);
  assert.equal(C.buildingCost(piggy, 0, 10), Math.ceil(100 * (1.15 ** 10 - 1) / 0.15));
});

test('Upgrades: 24 Gebäude × 9 Stufen + 23 Synergien + 28 von Hand', () => {
  assert.equal(C.BUILDINGS.length, 24);
  assert.equal(C.UPGRADES.length, 28 + 24 * 9 + 23);
  assert.equal(new Set(C.UPGRADES.map(u => u.id)).size, C.UPGRADES.length, 'IDs eindeutig');
});

test('Kaufen: Geld, Meilenstein, Upgrade', () => {
  applyData({ money: 10000, totalClicks: 20 });
  const r = C.buyBuilding('finger', 10);
  assert.ok(r);
  assert.equal(r.milestone, 10);
  assert.equal(r.tier?.name, 'Silber');
  assert.equal(C.owned('finger'), 10);
  assert.equal(C.buyBuilding('bigbang', 1), null, 'zu teuer');
  assert.equal(C.buyUpgrade('click1'), true);
  assert.equal(C.buyUpgrade('click1'), false, 'nicht doppelt');
  assert.equal(C.buyUpgrade('click8'), false, 'noch gesperrt');
  assert.equal(C.getClickPower(), 2);
});

test('Klick, Combo und kritischer Treffer', () => {
  applyData({ money: 0, upgrades: ['crit1'] });
  C.resetCombo();
  const hit = (t: number, roll: number) => {
    const res = C.click(t, roll);
    assert.ok(res, 'Klick zählt');
    return res;
  };
  let r = hit(1000, 0.99);
  assert.equal(r.crit, false);
  assert.equal(r.amount, 1);
  for (let i = 1; i <= 25; i++) r = hit(1000 + i * 100, 0.99);
  assert.equal(r.combo, 26);
  assert.equal(r.milestone, 25, 'Combo-Stufe 25');
  assert.ok(close(r.amount, 1.25), 'Combo höchstens +25 %');
  r = hit(5000, 0.0);
  assert.equal(r.combo, 1, 'Pause beendet die Combo');
  assert.equal(r.crit, true);
  assert.equal(r.amount, 10);
  const s = getState();
  assert.equal(s.totalClicks, 27);
  assert.equal(s.crits, 1);
  assert.equal(s.bestCombo, 26);
});

test('höchstens 25 Klicks pro Sekunde', () => {
  applyData({ money: 0 });
  C.resetCombo();
  let counted = 0;
  for (let i = 0; i < 100; i++) if (C.click(10000 + i * 5, 0.99)) counted++;
  assert.equal(counted, C.MAX_CLICKS_PER_SECOND, 'Dauerfeuer wird gebremst');
  assert.equal(getState().totalClicks, C.MAX_CLICKS_PER_SECOND);
  assert.ok(C.click(11000, 0.99), 'eine Sekunde später zählt es wieder');
});

test('Buffs: Restzeit gedeckelt, unbekannte zählen nicht, permanente Klickkraft ohne Buffs', () => {
  const now = Date.now();
  applyData({ money: 0, buffs: [
    { id: 'clickfever', type: 'click', mult: 25, until: now + 365 * 86400e3 },
    { id: 'erfunden', type: 'income', mult: 1000, until: now + 60e3 },
  ] });
  assert.equal(C.getClickPower(), 25);
  assert.equal(C.getClickPowerPermanent(), 1);
  assert.equal(C.getCps(), 0);
  assert.ok(getState().buffs[0].until <= Date.now() + 20e3 + 50, 'Klickfieber höchstens 20 s');
});

test('passives Einkommen und Schalter', () => {
  applyData({ money: 0, buildings: { piggy: 2 } });
  C.tick(10);
  assert.ok(close(getState().money, 20));
  C.setPassive(false);
  C.tick(10);
  assert.ok(close(getState().money, 20), 'ausgeschaltet verdienen Gebäude nichts');
  assert.ok(close(C.getCps(), 2), 'Anzeige bleibt');
});

test('Offline-Einnahmen: halbes Einkommen, höchstens 8 Stunden', () => {
  const now = Date.now();
  applyData({ money: 0, buildings: { piggy: 10 }, lastSaved: now - 3600e3 });
  assert.ok(close(applyOfflineEarnings(now)!.amount, 10 * 3600 * 0.5));
  applyData({ money: 0, buildings: { piggy: 10 }, lastSaved: now - 30 * 3600e3 });
  const r = applyOfflineEarnings(now)!;
  assert.equal(r.capped, true);
  assert.ok(close(r.amount, 10 * 8 * 3600 * 0.5));
  applyData({ money: 0, buildings: { piggy: 10 }, lastSaved: now - 30e3 });
  assert.equal(applyOfflineEarnings(now), null, 'unter einer Minute nichts');
  applyData({ money: 0, buildings: { piggy: 10 }, passiveOff: true, lastSaved: now - 3600e3 });
  assert.equal(applyOfflineEarnings(now), null, 'ausgeschaltet nichts');
});

// Zufällige, aber reproduzierbare Spielstände
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
}

function randomSave(rand: () => number) {
  const buildings: Record<string, number> = {};
  C.BUILDINGS.forEach((b, i) => { if (rand() < 0.9 - i * 0.03) buildings[b.id] = Math.floor(rand() * 320); });
  const upgrades = C.UPGRADES.filter(() => rand() < 0.35).map(u => u.id);
  return {
    money: rand() * 1e12,
    totalEarned: rand() * 1e15,
    totalClicks: Math.floor(rand() * 25000),
    buildings,
    upgrades,
    achievements: Array.from({ length: Math.floor(rand() * 60) }, (_, i) => 'a' + i),
    prestige: { points: Math.floor(rand() * 40), journeys: 3 },
    fleet: { treasures: { pearl: rand() < 0.5 ? 1 : 0, egg: rand() < 0.5 ? 2 : 0, scale: 1, bottle: 1 } },
    boss: { level: Math.floor(rand() * 80), kills: 0, fights: 0 },
    buffs: rand() < 0.5 ? [{ id: 'goldrush', type: 'income', mult: 7, until: Date.now() + 60e3 }] : [],
  };
}

test('gleiche Zahlen wie js/clicker.js', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  const rand = seeded(28);
  for (let round = 0; round < 60; round++) {
    const save = randomSave(rand);
    assert.equal(applyData(save), true);
    GK.state = JSON.parse(JSON.stringify(getState()));
    const L = GK.clicker;
    assert.ok(close(C.getCps(), L.getCps()), `getCps, Runde ${round}`);
    assert.ok(close(C.getCpsPermanent(), L.getCpsPermanent()), `getCpsPermanent, Runde ${round}`);
    assert.ok(close(C.getClickPower(), L.getClickPower()), `getClickPower, Runde ${round}`);
    assert.ok(close(C.getClickPowerPermanent(), L.getClickPowerPermanent()), `getClickPowerPermanent, Runde ${round}`);
    assert.equal(C.totalBuildings(), L.totalBuildings());
    assert.ok(close(C.buildingsWorth(), L.buildingsWorth()), `buildingsWorth, Runde ${round}`);
    assert.equal(C.UPGRADES.filter(u => !C.hasUpgrade(u.id)).length, L.remainingUpgrades());
  }
});
