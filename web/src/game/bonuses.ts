// Dauerhafte und zeitlich begrenzte Boni, die der Klicker braucht.
// Rechnet wie js/progress.js (permanentMult, buffMult), js/fleet.js (incomeMult) und js/boss.js (clickMult).
// Die Module selbst (große Fahrt, Flotte, Bosskampf) ziehen später um; die Werte stehen schon im Spielstand.
import { getState, type Buff } from './state.ts';

const PRESTIGE_BONUS = 0.1;      // +10 % Einkommen pro Schatzkarte
const ACHIEVEMENT_BONUS = 0.01;  // +1 % Einkommen pro Erfolg
const BOSS_BIG_EVERY = 10;       // jede zehnte Bossstufe bringt eine Trophäe …
const TROPHY_CLICK = 0.05;       // … mit +5 % Klickkraft

// Einkommens-Bonus der Schätze aus der Flotte in Prozent (aus js/fleet.js:TREASURES, nur „income“)
const TREASURE_INCOME: Record<string, number> = {
  pearl: 2, starfish: 2, coral: 3, bigpearl: 3, amphora: 4, opal: 5, dagger: 4, icegem: 6, egg: 10, scale: 8,
};

export function prestigeMult(): number {
  return 1 + PRESTIGE_BONUS * getState().prestige.points;
}

export function achievementMult(): number {
  return 1 + ACHIEVEMENT_BONUS * getState().achievements.length;
}

export function fleetIncomeMult(): number {
  const treasures = getState().fleet.treasures;
  let pct = 0;
  for (const [id, bonus] of Object.entries(TREASURE_INCOME)) {
    if ((treasures[id] || 0) > 0) pct += bonus;
  }
  return 1 + pct / 100;
}

// Dauerhafte Boni (ohne zeitlich begrenzte)
export function permanentMult(): number {
  return prestigeMult() * achievementMult() * fleetIncomeMult();
}

export function activeBuffs(now = Date.now()): Buff[] {
  return getState().buffs.filter(b => b.until > now);
}

// Zeitlich begrenzte Boni eines Typs (Goldrausch: 'income', Klickfieber: 'click')
export function buffMult(type: Buff['type'], now = Date.now()): number {
  return activeBuffs(now).filter(b => b.type === type).reduce((m, b) => m * b.mult, 1);
}

// Trophäen aus Bosskämpfen: dauerhaft mehr Klickkraft
export function bossClickMult(): number {
  return 1 + Math.floor(getState().boss.level / BOSS_BIG_EVERY) * TROPHY_CLICK;
}
