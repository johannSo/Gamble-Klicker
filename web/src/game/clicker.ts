// Klicker: Gebäude (passives Einkommen), Upgrades und die große Münze (Nachfolger von js/clicker.js).
// Nur Regeln und Berechnungen – die Darstellung steht in src/components/clicker/.
// Zahlen, IDs und Formeln sind unverändert, damit alte Spielstände genauso weiterlaufen.
import './clicker.i18n.ts';
import { bossClickMult, buffMult, permanentMult } from './bonuses.ts';
import { t } from './i18n.ts';
import * as rng from './rng.ts';
import { canAfford, earn, getState, save, spend, type GameState } from './state.ts';

export const COST_GROWTH = 1.15;
export const COMBO_WINDOW = 700;      // ms: so schnell muss der nächste Klick kommen
const BASE_COMBO_CAP = 25;            // ohne Upgrades höchstens +25 % durch die Combo
const BASE_CRIT_MULT = 10;            // kritischer Klick = ×10
export const COMBO_MILESTONES = [25, 50, 100, 200];
export const BUILDING_MILESTONES = [10, 25, 50, 100, 150, 200, 250, 300];
export const UPGRADES_SHOWN = 8;      // so viele Upgrades sind sichtbar, der Rest ist eingeklappt

export interface Building {
  id: string;
  icon: string;   // Emoji (Rückfall, Meldungen)
  ic: string;     // Name des eigenen Symbols (icons.ts)
  name: string;   // deutscher Quelltext, Anzeige über t()
  baseCost: number;
  baseCps: number;
  desc: string;
}

export type UpgradeType = 'clickMult' | 'clickCps' | 'critChance' | 'critMult' | 'comboCap' | 'globalMult' | 'buildingMult' | 'synergy';

export type Rarity = 'click' | 'crit' | 'combo' | 'empire' | 'synergy'
  | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legend' | 'mythic' | 'cosmic' | 'divine';

export interface Upgrade {
  id: string;
  icon: string;
  ic: string;
  name: string;
  cost: number;
  type: UpgradeType;
  value: number;
  rarity: Rarity;
  desc: string;
  unlocked: (s: GameState) => boolean;
  all?: boolean;        // nur clickMult: wirkt auch auf den Einkommens-Anteil
  building?: string;    // buildingMult / synergy
  source?: string;      // synergy: Vorgänger-Gebäude
}

export const BUILDINGS: readonly Building[] = [
  { id: 'finger',    icon: '👆', ic: 'tap', name: 'Hilfsfinger',      baseCost: 15,     baseCps: 0.1,   desc: 'Klickt ab und zu für dich.' },
  { id: 'piggy',     icon: '🐷', ic: 'piggy', name: 'Sparschwein',      baseCost: 100,    baseCps: 1,     desc: 'Jeder Cent zählt.' },
  { id: 'lemonade',  icon: '🍋', ic: 'lemon', name: 'Limonadenstand',   baseCost: 1100,   baseCps: 8,     desc: 'Sauer macht reich.' },
  { id: 'kiosk',     icon: '🏪', ic: 'kiosk', name: 'Kiosk',            baseCost: 12000,  baseCps: 47,    desc: 'Rubbellose und Kaugummis.' },
  { id: 'pawnshop',  icon: '💍', ic: 'ring', name: 'Pfandhaus',        baseCost: 130000, baseCps: 260,   desc: 'Kauft alles, was glänzt.' },
  { id: 'bank',      icon: '🏦', ic: 'bank', name: 'Bank',             baseCost: 1.4e6,  baseCps: 1400,  desc: 'Zinsen auf Spielgeld.' },
  { id: 'goldmine',  icon: '⛏️', ic: 'pickaxe', name: 'Goldmine',         baseCost: 2e7,    baseCps: 7800,  desc: 'Tief unten glitzert es.' },
  { id: 'mint',      icon: '🏛️', ic: 'coins', name: 'Münzprägerei',     baseCost: 3.3e8,  baseCps: 44000, desc: 'Prägt Dublonen am laufenden Band.' },
  { id: 'ship',      icon: '🚢', ic: 'ship', name: 'Handelsschiff',    baseCost: 5.1e9,  baseCps: 2.6e5, desc: 'Bringt Gold aus fernen Häfen.' },
  { id: 'alchemy',   icon: '🧪', ic: 'flask', name: 'Alchemistenlabor', baseCost: 7.5e10, baseCps: 1.6e6, desc: 'Macht aus Blei pures Gold.' },
  { id: 'fleet',     icon: '🏴‍☠️', ic: 'skull', name: 'Piratenflotte',   baseCost: 1e12,   baseCps: 1e7,   desc: 'Kapert Schatzschiffe auf allen Meeren.' },
  { id: 'island',    icon: '🏝️', ic: 'island', name: 'Schatzinsel',      baseCost: 1.4e13, baseCps: 6.5e7, desc: 'X markiert die Stelle – jeden Tag aufs Neue.' },
  { id: 'dragon',    icon: '🐉', ic: 'dragon', name: 'Drachenhort',      baseCost: 1.7e14, baseCps: 4.3e8, desc: 'Ein Drache brütet auf Bergen von Gold.' },
  { id: 'timemachine', icon: '🔮', ic: 'hourglass', name: 'Zeitmaschine',   baseCost: 2.1e15, baseCps: 2.9e9, desc: 'Holt Dublonen aus der Zukunft.' },
  { id: 'luck',      icon: '🍀', ic: 'clover', name: 'Glücksfabrik',     baseCost: 2.6e16, baseCps: 2.1e10, desc: 'Stellt Glück am Fließband her.' },
  { id: 'portal',    icon: '🌌', ic: 'portal', name: 'Sternenportal',    baseCost: 3.1e17, baseCps: 1.5e11, desc: 'Dublonen aus anderen Welten.' },
  // Nach dem Sternenportal: für alle, die das Spiel schon „durchgespielt“ haben
  { id: 'poseidon',  icon: '🔱', ic: 'trident', name: 'Poseidons Tempel', baseCost: 3.7e18, baseCps: 1.05e12, desc: 'Der Meeresgott zahlt Tribut.' },
  { id: 'ghostyard', icon: '👻', ic: 'ghost', name: 'Geisterwerft',     baseCost: 4.4e19, baseCps: 7.4e12, desc: 'Untote Seeleute arbeiten ohne Pause.' },
  { id: 'atlantis',  icon: '🏛️', ic: 'atlantis', name: 'Atlantis',         baseCost: 5.3e20, baseCps: 5.2e13, desc: 'Die versunkene Stadt voller Gold.' },
  { id: 'lavaforge', icon: '🌋', ic: 'volcano', name: 'Lava-Schmiede',    baseCost: 6.4e21, baseCps: 3.6e14, desc: 'Gießt Dublonen aus flüssiger Lava.' },
  { id: 'blackhole', icon: '🕳️', ic: 'blackhole', name: 'Schwarzes Loch',   baseCost: 7.7e22, baseCps: 2.5e15, desc: 'Saugt Gold aus dem ganzen Universum.' },
  { id: 'parallel',  icon: '🪞', ic: 'mirror', name: 'Paralleluniversum', baseCost: 9.2e23, baseCps: 1.8e16, desc: 'Ein zweites Du verdient mit.' },
  { id: 'galaxy',    icon: '💫', ic: 'galaxy', name: 'Galaxienbank',     baseCost: 1.1e25, baseCps: 1.25e17, desc: 'Verwaltet die Schätze ganzer Galaxien.' },
  { id: 'bigbang',   icon: '💥', ic: 'burst', name: 'Dublonen-Urknall', baseCost: 1.3e26, baseCps: 8.8e17, desc: 'Erschafft ein Universum nur aus Dublonen.' },
];

const has = (upgradeId: string) => getState().upgrades.includes(upgradeId);
export const owned = (buildingId: string) => getState().buildings[buildingId] || 0;

export function totalBuildings(): number {
  return BUILDINGS.reduce((sum, b) => sum + owned(b.id), 0);
}

// Upgrades für Klicks, kritische Treffer, Combo und alle Gebäude. rarity bestimmt Farbe und Effekt der Kachel.
const HAND_UPGRADES: Upgrade[] = [
  { id: 'click1', icon: '💪', ic: 'fist', name: 'Starker Finger',  cost: 100,  type: 'clickMult', value: 2, rarity: 'click', desc: 'Klickkraft ×2',
    unlocked: s => s.totalClicks >= 10 },
  { id: 'click2', icon: '🥇', ic: 'tap', name: 'Goldener Finger', cost: 1000, type: 'clickMult', value: 2, rarity: 'click', desc: 'Klickkraft ×2',
    unlocked: s => has('click1') && s.totalClicks >= 100 },
  { id: 'click3', icon: '💎', ic: 'gem', name: 'Diamantfinger',   cost: 50000, type: 'clickMult', value: 2, rarity: 'click', desc: 'Klickkraft ×2',
    unlocked: s => has('click2') && s.totalClicks >= 500 },
  { id: 'click4', icon: '✨', ic: 'sparkle', name: 'Magische Hand',   cost: 5e6,  type: 'clickMult', value: 2, rarity: 'click', desc: 'Klickkraft ×2',
    unlocked: s => has('click3') && s.totalClicks >= 1500 },
  { id: 'click5', icon: '👊', ic: 'fist', name: 'Goldene Faust',   cost: 5e8,  type: 'clickMult', value: 3, all: true, rarity: 'click', desc: 'Klickkraft ×3 – auch der Anteil vom Einkommen',
    unlocked: s => has('click4') && s.totalClicks >= 3000 },
  { id: 'click6', icon: '🤴', ic: 'crown', name: 'Hand des Midas',  cost: 5e10, type: 'clickMult', value: 3, all: true, rarity: 'click', desc: 'Klickkraft ×3 – auch der Anteil vom Einkommen',
    unlocked: s => has('click5') && s.totalClicks >= 6000 },
  { id: 'click7', icon: '🌟', ic: 'star', name: 'Sternenhand',     cost: 5e12, type: 'clickMult', value: 3, all: true, rarity: 'click', desc: 'Klickkraft ×3 – auch der Anteil vom Einkommen',
    unlocked: s => has('click6') && s.totalClicks >= 10000 },
  { id: 'click8', icon: '🪐', ic: 'planet', name: 'Hand der Götter', cost: 5e14, type: 'clickMult', value: 4, all: true, rarity: 'click', desc: 'Klickkraft ×4 – auch der Anteil vom Einkommen',
    unlocked: s => has('click7') && s.totalClicks >= 20000 },
  { id: 'cpsClick1', icon: '📈', ic: 'trend', name: 'Klick-Investment', cost: 25000, type: 'clickCps', value: 0.01, rarity: 'click',
    desc: 'Jeder Klick bringt zusätzlich 1 % deines Einkommens pro Sekunde',
    unlocked: () => getCps() >= 20 },
  { id: 'cpsClick2', icon: '📊', ic: 'chart', name: 'Klick-Dividende', cost: 2.5e6, type: 'clickCps', value: 0.02, rarity: 'click',
    desc: 'Jeder Klick bringt zusätzlich 2 % deines Einkommens pro Sekunde',
    unlocked: () => has('cpsClick1') && getCps() >= 1000 },
  { id: 'cpsClick3', icon: '💹', ic: 'trend', name: 'Klick-Imperium', cost: 2.5e8, type: 'clickCps', value: 0.03, rarity: 'click',
    desc: 'Jeder Klick bringt zusätzlich 3 % deines Einkommens pro Sekunde',
    unlocked: () => has('cpsClick2') && getCps() >= 100000 },
  { id: 'cpsClick4', icon: '🏦', ic: 'bank', name: 'Klick-Konzern', cost: 2.5e10, type: 'clickCps', value: 0.04, rarity: 'click',
    desc: 'Jeder Klick bringt zusätzlich 4 % deines Einkommens pro Sekunde',
    unlocked: () => has('cpsClick3') && getCps() >= 1e7 },
  { id: 'cpsClick5', icon: '👑', ic: 'crown', name: 'Klick-Dynastie', cost: 2.5e12, type: 'clickCps', value: 0.05, rarity: 'click',
    desc: 'Jeder Klick bringt zusätzlich 5 % deines Einkommens pro Sekunde',
    unlocked: () => has('cpsClick4') && getCps() >= 1e9 },
  // Kritische Treffer
  { id: 'crit1', icon: '🎯', ic: 'target', name: 'Glückstreffer', cost: 5000, type: 'critChance', value: 0.03, rarity: 'crit',
    desc: '3 % Chance auf einen kritischen Klick (×10)',
    unlocked: s => s.totalClicks >= 250 },
  { id: 'crit2', icon: '🦅', ic: 'eye', name: 'Adlerauge', cost: 5e5, type: 'critChance', value: 0.04, rarity: 'crit',
    desc: '+4 % Chance auf kritische Klicks',
    unlocked: s => has('crit1') && s.totalClicks >= 1000 },
  { id: 'crit3', icon: '💥', ic: 'burst', name: 'Volltreffer-Hand', cost: 5e7, type: 'critMult', value: 25, rarity: 'crit',
    desc: 'Kritische Klicks bringen ×25 statt ×10',
    unlocked: s => has('crit2') && s.totalClicks >= 2500 },
  { id: 'crit4', icon: '🍀', ic: 'clover', name: 'Glückspilz', cost: 5e9, type: 'critChance', value: 0.05, rarity: 'crit',
    desc: '+5 % Chance auf kritische Klicks',
    unlocked: s => has('crit3') && s.totalClicks >= 5000 },
  { id: 'crit5', icon: '⚡', ic: 'bolt', name: 'Blitzschlag', cost: 5e11, type: 'critMult', value: 50, rarity: 'crit',
    desc: 'Kritische Klicks bringen ×50',
    unlocked: s => has('crit4') && s.totalClicks >= 8000 },
  // Combo
  { id: 'combo1', icon: '🔥', ic: 'flame', name: 'Combo-Meister', cost: 2000, type: 'comboCap', value: 50, rarity: 'combo',
    desc: 'Combo bis +50 % statt +25 %',
    unlocked: s => s.totalClicks >= 150 },
  { id: 'combo2', icon: '☄️', ic: 'comet', name: 'Feuerhände', cost: 2e6, type: 'comboCap', value: 100, rarity: 'combo',
    desc: 'Combo bis +100 % (doppelte Klickkraft)',
    unlocked: s => has('combo1') && s.totalClicks >= 1200 },
  { id: 'combo3', icon: '🌋', ic: 'volcano', name: 'Vulkanhände', cost: 2e9, type: 'comboCap', value: 200, rarity: 'combo',
    desc: 'Combo bis +200 % (dreifache Klickkraft)',
    unlocked: s => has('combo2') && s.totalClicks >= 4000 },
  // Für alle Gebäude zusammen, je nachdem, wie viele man insgesamt besitzt
  { id: 'global1', icon: '📜', ic: 'scroll', name: 'Handelsvertrag', cost: 2e5, type: 'globalMult', value: 1.1, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +10 %', unlocked: () => totalBuildings() >= 50 },
  { id: 'global2', icon: '🧭', ic: 'compass', name: 'Goldener Kompass', cost: 1e8, type: 'globalMult', value: 1.15, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +15 %', unlocked: () => totalBuildings() >= 150 },
  { id: 'global3', icon: '⚓', ic: 'anchor', name: 'Kaiserliche Flotte', cost: 5e10, type: 'globalMult', value: 1.2, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +20 %', unlocked: () => totalBuildings() >= 300 },
  { id: 'global4', icon: '🏛️', ic: 'temple', name: 'Goldenes Zeitalter', cost: 5e13, type: 'globalMult', value: 1.25, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +25 %', unlocked: () => totalBuildings() >= 500 },
  { id: 'global5', icon: '🌠', ic: 'comet', name: 'Ewiger Reichtum', cost: 5e16, type: 'globalMult', value: 1.3, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +30 %', unlocked: () => totalBuildings() >= 800 },
  { id: 'global6', icon: '🔱', ic: 'trident', name: 'Herrschaft der Meere', cost: 5e22, type: 'globalMult', value: 1.35, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +35 %', unlocked: () => totalBuildings() >= 1200 },
  { id: 'global7', icon: '💥', ic: 'burst', name: 'Unendlicher Reichtum', cost: 5e27, type: 'globalMult', value: 1.4, rarity: 'empire',
    desc: 'Alle Gebäude: Einkommen +40 %', unlocked: () => totalBuildings() >= 1600 },
];

// Pro Gebäude: immer stärkere Upgrades, sobald man genug davon besitzt
export const BUILDING_TIERS = [
  { owned: 1,   costFactor: 10,    name: 'Bronze',  rarity: 'bronze',   value: 2 },
  { owned: 10,  costFactor: 50,    name: 'Silber',  rarity: 'silver',   value: 2 },
  { owned: 25,  costFactor: 500,   name: 'Gold',    rarity: 'gold',     value: 2 },
  { owned: 50,  costFactor: 5000,  name: 'Platin',  rarity: 'platinum', value: 2 },
  { owned: 100, costFactor: 5e5,   name: 'Diamant', rarity: 'diamond',  value: 3 },
  { owned: 150, costFactor: 5e7,   name: 'Legenden', rarity: 'legend',  value: 3 },
  { owned: 200, costFactor: 5e9,   name: 'Mythos',  rarity: 'mythic',   value: 4 },
  { owned: 250, costFactor: 5e11,  name: 'Sternen', rarity: 'cosmic',   value: 4 },
  { owned: 300, costFactor: 5e13,  name: 'Götter',  rarity: 'divine',   value: 5 },
] as const satisfies readonly { owned: number; costFactor: number; name: string; rarity: Rarity; value: number }[];

const TIER_UPGRADES: Upgrade[] = BUILDINGS.flatMap(b => BUILDING_TIERS.map((tier, i): Upgrade => ({
  id: `${b.id}-${i + 1}`,
  icon: b.icon,
  ic: b.ic,
  name: `${tier.name}-${b.name}`,
  cost: b.baseCost * tier.costFactor,
  type: 'buildingMult',
  building: b.id,
  value: tier.value,
  rarity: tier.rarity,
  desc: `${b.name}: Einkommen ×${tier.value}`,
  unlocked: () => owned(b.id) >= tier.owned,
})));

// Synergien: Jedes Gebäude profitiert vom vorherigen (+1 % Einkommen pro Stück)
const SYNERGY_UPGRADES: Upgrade[] = BUILDINGS.slice(1).map((b, i): Upgrade => {
  const source = BUILDINGS[i];
  return {
    id: `syn-${b.id}`,
    icon: '🤝',
    ic: 'handshake',
    name: `${source.name} & ${b.name}`,
    cost: b.baseCost * 200,
    type: 'synergy',
    building: b.id,
    source: source.id,
    value: 0.01,
    rarity: 'synergy',
    desc: `${b.name}: +1 % Einkommen pro ${source.name}`,
    unlocked: () => owned(b.id) >= 15 && owned(source.id) >= 15,
  };
});

export const UPGRADES: readonly Upgrade[] = [...HAND_UPGRADES, ...TIER_UPGRADES, ...SYNERGY_UPGRADES];
export const upgradeById: Readonly<Record<string, Upgrade>> = Object.fromEntries(UPGRADES.map(u => [u.id, u]));
const buildingById: Readonly<Record<string, Building>> = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export { has as hasUpgrade };

// ---------- Berechnungen ----------

function ownedUpgrades(type: UpgradeType): Upgrade[] {
  return getState().upgrades.map(id => upgradeById[id]).filter(u => u && u.type === type);
}

// Preis für `count` Gebäude, wenn man schon `alreadyOwned` besitzt (geometrische Reihe)
export function buildingCost(building: Building, alreadyOwned: number, count: number): number {
  const first = building.baseCost * Math.pow(COST_GROWTH, alreadyOwned);
  return Math.ceil(first * (Math.pow(COST_GROWTH, count) - 1) / (COST_GROWTH - 1));
}

// Was alle eigenen Gebäude zusammen gekostet haben (Rangliste „Vermögen mit Gebäuden“)
export function buildingsWorth(): number {
  return BUILDINGS.reduce((sum, b) => sum + (owned(b.id) ? buildingCost(b, 0, owned(b.id)) : 0), 0);
}

export function buildingMultiplier(buildingId: string): number {
  let mult = 1;
  for (const id of getState().upgrades) {
    const u = upgradeById[id];
    if (!u || u.building !== buildingId) continue;
    if (u.type === 'buildingMult') mult *= u.value;
    if (u.type === 'synergy' && u.source) mult *= 1 + u.value * owned(u.source);
  }
  return mult;
}

// Upgrades für alle Gebäude zusammen (Handelsvertrag …)
export function globalMultiplier(): number {
  return ownedUpgrades('globalMult').reduce((m, u) => m * u.value, 1);
}

// Einkommen eines Gebäudes mit allen Gebäude-Upgrades, ohne Schatzkarten, Erfolge usw.
export function buildingBaseCps(building: Building): number {
  return building.baseCps * buildingMultiplier(building.id) * globalMultiplier();
}

export function baseCps(): number {
  return BUILDINGS.reduce((sum, b) => sum + owned(b.id) * buildingBaseCps(b), 0);
}

// Alle Boni zusammen (dauerhaft × zeitlich begrenzt, z. B. Goldrausch)
function incomeMult(): number {
  return permanentMult() * buffMult('income');
}

export function buildingCps(building: Building): number {
  return buildingBaseCps(building) * incomeMult();
}

export function getCps(): number {
  return baseCps() * incomeMult();
}

// Einkommen nur mit dauerhaften Boni (Offline-Einnahmen, Erfolge)
export function getCpsPermanent(): number {
  return baseCps() * permanentMult();
}

// Klickkraft ohne Combo und Krit: Grundwert plus Anteil vom Einkommen (Klick-Investment …).
// Die frühen „Klickkraft ×2“ vervielfachen nur den Grundwert, die späten („all“) auch den Einkommens-Anteil.
export function getClickPower(upgrades: readonly string[] = getState().upgrades): number {
  let mult = 1;
  let allMult = 1;
  let cpsShare = 0;
  for (const id of upgrades) {
    const u = upgradeById[id];
    if (!u) continue;
    if (u.type === 'clickMult') {
      mult *= u.value;
      if (u.all) allMult *= u.value;
    }
    if (u.type === 'clickCps') cpsShare += u.value;
  }
  return (mult * permanentMult() + getCps() * cpsShare * allMult) * buffMult('click') * bossClickMult();
}

// Wie viel mehr pro Klick brächte ein Klick-Upgrade? (Anzeige auf der Kachel)
export function upgradeClickGain(u: Upgrade): number {
  if (u.type !== 'clickMult' && u.type !== 'clickCps') return 0;
  const upgrades = getState().upgrades;
  return getClickPower([...upgrades, u.id]) - getClickPower(upgrades);
}

// Wie viel Einkommen pro Sekunde brächte ein Gebäude-Upgrade zusätzlich?
export function upgradeGain(u: Upgrade): number {
  if (u.type === 'globalMult') return getCps() * (u.value - 1);
  const b = u.building ? buildingById[u.building] : undefined;
  if (!b) return 0;
  const current = buildingCps(b) * owned(b.id);
  if (u.type === 'buildingMult') return current * (u.value - 1);
  if (u.type === 'synergy' && u.source) return current * u.value * owned(u.source);
  return 0;
}

export function critChance(): number {
  return ownedUpgrades('critChance').reduce((sum, u) => sum + u.value, 0);
}

export function critMult(): number {
  return ownedUpgrades('critMult').reduce((m, u) => Math.max(m, u.value), BASE_CRIT_MULT);
}

export function comboCap(): number {
  return ownedUpgrades('comboCap').reduce((m, u) => Math.max(m, u.value), BASE_COMBO_CAP);
}

export function availableUpgrades(): Upgrade[] {
  const s = getState();
  return UPGRADES.filter(u => !has(u.id) && u.unlocked(s)).sort((a, b) => a.cost - b.cost);
}

export function passiveActive(): boolean {
  return !getState().passiveOff;
}

// ---------- Combo (nur im Speicher, nicht im Spielstand) ----------

const combo = { count: 0, last: -Infinity };

export function comboCount(): number {
  return combo.count;
}

// Combo-Bonus in Prozent: +1 % für jeden schnellen Folgeklick, bis zur Obergrenze
export function comboBonus(): number {
  return Math.min(Math.max(combo.count - 1, 0), comboCap());
}

export function comboMult(): number {
  return 1 + comboBonus() / 100;
}

// Die Combo-Anzeige leuchtet ab 3 Klicks und kurz nach dem letzten Klick nach
export function comboActive(now: number): boolean {
  if (now - combo.last > COMBO_WINDOW + 300) {
    combo.count = 0;
    return false;
  }
  return combo.count >= 3;
}

export function resetCombo(): void {
  combo.count = 0;
  combo.last = -Infinity;
}

// ---------- Aktionen ----------

export interface ClickResult {
  amount: number;
  crit: boolean;
  combo: number;
  milestone: number | null;   // erreichte Combo-Stufe (25, 50 …), sonst null
}

// Ein Klick auf die Münze. now: performance.now(); roll: Zufallszahl für den kritischen Treffer
export function click(now: number, roll = rng.float()): ClickResult {
  const s = getState();
  combo.count = now - combo.last <= COMBO_WINDOW ? combo.count + 1 : 1;
  combo.last = now;
  if (combo.count > s.bestCombo) s.bestCombo = combo.count;

  const crit = roll < critChance();
  const amount = getClickPower() * comboMult() * (crit ? critMult() : 1);
  s.totalClicks++;
  if (crit) s.crits++;
  earn(amount, 'click');
  const step = combo.count - 1;
  const milestone = COMBO_MILESTONES.includes(step) && step <= comboCap() ? step : null;
  return { amount, crit, combo: combo.count, milestone };
}

export interface BuildingPurchase { milestone: number | null; tier: (typeof BUILDING_TIERS)[number] | undefined }

// Kauft `amount` Gebäude. null, wenn das Geld nicht reicht.
export function buyBuilding(buildingId: string, amount: number): BuildingPurchase | null {
  const building = buildingById[buildingId];
  if (!building || !(amount >= 1)) return null;
  const before = owned(building.id);
  if (!spend(buildingCost(building, before, amount))) return null;
  getState().buildings[building.id] = before + amount;
  save();
  // Meilenstein erreicht? (z. B. 25 Sparschweine)
  const milestone = BUILDING_MILESTONES.filter(m => before < m && before + amount >= m).pop() ?? null;
  return { milestone, tier: milestone ? BUILDING_TIERS.find(t => t.owned === milestone) : undefined };
}

// Kauft ein Upgrade. false, wenn schon gekauft, noch gesperrt oder zu teuer.
export function buyUpgrade(upgradeId: string): boolean {
  const upgrade = upgradeById[upgradeId];
  if (!upgrade || has(upgrade.id) || !upgrade.unlocked(getState()) || !spend(upgrade.cost)) return false;
  getState().upgrades.push(upgrade.id);
  save();
  return true;
}

export function setPassive(on: boolean): void {
  getState().passiveOff = !on;
  save();
}

// Passives Einkommen für `seconds` Sekunden (kann nach einem Hintergrund-Tab sehr groß sein)
export function tick(seconds: number): void {
  if (!passiveActive()) return;
  const income = getCps() * seconds;
  if (income > 0) earn(income, 'passive');
}

export const isRareUpgrade = (u: Upgrade) => ['diamond', 'legend', 'mythic', 'cosmic', 'divine', 'empire'].includes(u.rarity);

// ---------- Texte ----------

export function buildingName(b: Building): string {
  return t(b.name);
}

// Angezeigter Name/Beschreibung eines Upgrades; Gebäude-Stufen und Synergien aus Vorlagen zusammengesetzt
export function upgradeName(u: Upgrade): string {
  const b = u.building ? buildingById[u.building] : undefined;
  if (u.type === 'buildingMult' && b) {
    const tier = BUILDING_TIERS[Number(u.id.slice(u.id.lastIndexOf('-') + 1)) - 1];
    if (tier) return t('{tier}-{name}', { tier: t(tier.name), name: t(b.name) });
  }
  if (u.type === 'synergy' && b && u.source) {
    return t('{source} & {name}', { source: t(buildingById[u.source].name), name: t(b.name) });
  }
  return t(u.name);
}

export function upgradeDesc(u: Upgrade): string {
  const b = u.building ? buildingById[u.building] : undefined;
  if (u.type === 'buildingMult' && b) return t('{name}: Einkommen ×{value}', { name: t(b.name), value: u.value });
  if (u.type === 'synergy' && b && u.source) {
    return t('{name}: +1 % Einkommen pro {source}', { name: t(b.name), source: t(buildingById[u.source].name) });
  }
  return t(u.desc);
}
