// Zentraler Spielstand: Geld verdienen/ausgeben, Speichern und Laden (Nachfolger von js/state.js).
// Der Zustand ist ein veränderliches Objekt wie im alten Code (schnell genug für 60 Bilder pro Sekunde);
// React erfährt über subscribe/notify (siehe store.ts), wann neu gezeichnet werden muss.
//
// Alle Felder des alten Spielstands bleiben erhalten – auch die der Bereiche, die noch nicht nach
// React umgezogen sind (Casino, Flotte, Kraken …). So geht beim Hin- und Herwechseln nichts verloren.
import { detectLang, setLang, type Lang } from './i18n.ts';
import * as saveCode from './savecode.ts';

// Neuer Speicherplatz für die Next.js-Fassung. Beim allerersten Start wird der Stand des alten Spiels
// übernommen (nur gelesen, nie verändert), damit niemand von vorn anfängt und das alte Spiel unberührt bleibt.
export const SAVE_KEY = 'gamble-klicker-next-save';
export const LEGACY_SAVE_KEY = 'gamble-klicker-save';
const SAVE_VERSION = 1;

export type EarnSource = 'click' | 'passive' | 'casino' | 'boss' | 'daily' | 'fleet';
export type Effects = 'full' | 'reduced';
export type TabId = 'clicker' | 'casino' | 'adventure' | 'progress' | 'stats';

export interface Buff { id: string; type: 'income' | 'click' | 'luck'; mult: number; until: number }

export interface CasinoState {
  wagered: number;
  won: number;
  rounds: number;
  biggestWin: number;
  biggestLoss: number;
  biggestLossPct: number;
  vip: number;
  history: { game: string; bet: number; payout: number; text: string; time: number }[];
  openGame: string | null;
  games: Record<string, unknown>;
  stats: Record<string, unknown>;
  statsSince: number;
}

export interface CosmeticsState {
  owned: string[];
  equipped: { coin: string; effect: string; theme: string; profile: string; table: string };
  wheel: unknown;
}

export interface Settings { lang: Lang; sound: boolean; volume: number; effects: Effects; kraken: boolean }

export interface DailyState { day: string; tasks: unknown[]; streak: number; bonusDay: string; bonuses: number; completed: number }

export interface KrakenState { clock: number; next: number; attack: unknown; defeated: number; escaped: number; stolen: number }

export interface FleetState {
  ships: Record<string, number>;
  voyages: Record<string, unknown>;
  last: Record<string, string>;
  treasures: Record<string, number>;
  peak: number;
  done: number;
  earned: number;
  log: unknown[];
}

export interface Player { name: string; avatar: string; fig: string; figOn: boolean }

export interface GameState {
  version: number;
  money: number;
  totalEarned: number;      // verdient auf dieser großen Fahrt (ohne Casino)
  clickEarned: number;
  totalClicks: number;
  buildings: Record<string, number>;
  upgrades: string[];
  playTime: number;         // Sekunden
  allTimeEarned: number;    // verdient über alle großen Fahrten
  rankSeen: number;
  fleet: FleetState;
  boss: { level: number; kills: number; fights: number };
  prestige: { points: number; journeys: number };
  achievements: string[];
  buffs: Buff[];
  goldenClicks: number;
  crits: number;
  bestCombo: number;
  passiveOff: boolean;
  casino: CasinoState;
  cosmetics: CosmeticsState;
  player: Player;
  friendId: string;
  friends: Record<string, unknown>;
  friendWins: number;
  kraken: KrakenState;
  daily: DailyState;
  ui: { tab: TabId };
  settings: Settings;
  startedAt: number;
  lastSaved: number;
}

function createDefaultCasino(): CasinoState {
  return {
    wagered: 0, won: 0, rounds: 0, biggestWin: 0, biggestLoss: 0, biggestLossPct: 0, vip: 0,
    history: [], openGame: null, games: {}, stats: {}, statsSince: 0,
  };
}

function createDefaultCosmetics(): CosmeticsState {
  return { owned: [], equipped: { coin: 'gold', effect: 'coins', theme: 'tavern', profile: 'sailor', table: 'felt' }, wheel: null };
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createDefaultSettings(): Settings {
  return { lang: detectLang(), sound: true, volume: 0.7, effects: prefersReducedMotion() ? 'reduced' : 'full', kraken: true };
}

function createDefaultDaily(): DailyState {
  return { day: '', tasks: [], streak: 0, bonusDay: '', bonuses: 0, completed: 0 };
}

function createDefaultKraken(): KrakenState {
  return { clock: 0, next: 0, attack: null, defeated: 0, escaped: 0, stolen: 0 };
}

function createDefaultFleet(): FleetState {
  return { ships: {}, voyages: {}, last: {}, treasures: {}, peak: 0, done: 0, earned: 0, log: [] };
}

const defaultBoss = () => ({ level: 0, kills: 0, fights: 0 });
const defaultPrestige = () => ({ points: 0, journeys: 0 });
const defaultPlayer = (): Player => ({ name: '', avatar: '', fig: '', figOn: false });

export function createDefaultState(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    money: 0,
    totalEarned: 0,
    clickEarned: 0,
    totalClicks: 0,
    buildings: {},
    upgrades: [],
    playTime: 0,
    allTimeEarned: 0,
    rankSeen: 0,
    fleet: createDefaultFleet(),
    boss: defaultBoss(),
    prestige: defaultPrestige(),
    achievements: [],
    buffs: [],
    goldenClicks: 0,
    crits: 0,
    bestCombo: 0,
    passiveOff: false,
    casino: createDefaultCasino(),
    cosmetics: createDefaultCosmetics(),
    player: defaultPlayer(),
    friendId: '',
    friends: {},
    friendWins: 0,
    kraken: createDefaultKraken(),
    daily: createDefaultDaily(),
    ui: { tab: 'clicker' },
    settings: createDefaultSettings(),
    startedAt: now,
    lastSaved: now,
  };
}

// ---------- Der aktuelle Zustand ----------
// Nie eine Referenz auf den Zustand oder Teile davon aufheben: applyData und resetSave ersetzen ihn ganz.

let state: GameState = createDefaultState();
setLang(state.settings.lang);

export function getState(): GameState {
  return state;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

// Übernimmt geladene Daten; fehlende Felder (z. B. aus älteren Versionen) bekommen Standardwerte.
// Gleiche Regeln wie js/state.js:applyData – geprüft wird nur, ob money eine endliche Zahl ist.
export function applyData(data: unknown): boolean {
  if (!isObject(data) || typeof data.money !== 'number' || !isFinite(data.money)) return false;
  const d = data as Partial<GameState> & Record<string, unknown>;
  const s: GameState = Object.assign(createDefaultState(), d, { version: SAVE_VERSION });
  s.casino = Object.assign(createDefaultCasino(), d.casino);
  // Ältere Spielstände haben noch keine Statistik je Spiel: sie zählt ab jetzt
  if (d.casino && !d.casino.stats && d.casino.rounds > 0) s.casino.statsSince = Date.now();
  s.ui = Object.assign({ tab: 'clicker' as TabId }, d.ui);
  s.settings = Object.assign(createDefaultSettings(), d.settings);
  // Wer schon spielt (ohne gespeicherte Sprache), hat bisher Deutsch gesehen und behält es
  if (!d.settings || (d.settings.lang !== 'de' && d.settings.lang !== 'en')) s.settings.lang = 'de';
  s.prestige = Object.assign(defaultPrestige(), d.prestige);
  s.cosmetics = Object.assign(createDefaultCosmetics(), d.cosmetics);
  s.kraken = Object.assign(createDefaultKraken(), d.kraken);
  s.daily = Object.assign(createDefaultDaily(), d.daily);
  s.fleet = Object.assign(createDefaultFleet(), d.fleet);
  for (const k of ['ships', 'voyages', 'last', 'treasures'] as const) {
    if (!isObject(s.fleet[k])) s.fleet[k] = {};
  }
  if (!Array.isArray(s.fleet.log)) s.fleet.log = [];
  s.boss = Object.assign(defaultBoss(), d.boss);
  if (!Number.isInteger(s.boss.level) || s.boss.level < 0) s.boss.level = 0;
  if (!Array.isArray(s.daily.tasks)) s.daily.tasks = [];
  if (!isObject(d.friends)) s.friends = {};
  s.cosmetics.equipped = Object.assign(createDefaultCosmetics().equipped, d.cosmetics?.equipped);
  if (!Array.isArray(s.cosmetics.owned)) s.cosmetics.owned = [];
  s.player = Object.assign(defaultPlayer(), d.player);
  if (!d.player) {
    const games = (d.casino?.games ?? {}) as Record<string, { name?: string; avatar?: string } | undefined>;
    const old = games.room || games.pokerMp;
    if (old) Object.assign(s.player, { name: old.name || '', avatar: old.avatar || '' });
  }
  if (typeof d.allTimeEarned !== 'number') s.allTimeEarned = s.totalEarned;
  // Zusätzliche Typ-Reparaturen für Felder, die der Klicker hier direkt benutzt
  if (!isObject(s.buildings)) s.buildings = {};
  if (!Array.isArray(s.upgrades)) s.upgrades = [];
  if (!Array.isArray(s.achievements)) s.achievements = [];
  if (!Array.isArray(s.buffs)) s.buffs = [];
  state = s;
  setLang(s.settings.lang);
  return true;
}

// ---------- Geld ----------

// Geld gutschreiben. Casino-Gewinne zählen nicht als „verdient“ (eigene Statistik im Casino).
export function earn(amount: number, source?: EarnSource): void {
  if (!(amount > 0)) return;
  state.money += amount;
  if (source !== 'casino') {
    state.totalEarned += amount;
    state.allTimeEarned += amount;
  }
  if (source === 'click') state.clickEarned += amount;
}

export function canAfford(amount: number): boolean {
  return state.money >= amount;
}

// Geld abbuchen. false, wenn der Betrag ungültig ist oder das Guthaben nicht reicht.
export function spend(amount: number): boolean {
  if (!(amount >= 0) || !canAfford(amount)) return false;
  state.money -= amount;
  return true;
}

// ---------- Speichern und Laden ----------

function detectStorage(): boolean {
  try {
    const testKey = SAVE_KEY + '-test';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

let storageAvailable: boolean | null = null;
export function hasStorage(): boolean {
  if (storageAvailable === null) storageAvailable = detectStorage();
  return storageAvailable;
}

let onSave: (() => void) | null = null;
export function setOnSave(fn: (() => void) | null): void {
  onSave = fn;
}

export function save(): boolean {
  if (!hasStorage()) return false;
  state.lastSaved = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen:', e);
    return false;
  }
  onSave?.();
  return true;
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('Laden fehlgeschlagen:', e);
    return null;
  }
}

// Lädt den eigenen Stand; gibt es keinen, den des alten Spiels. false: Standardzustand bleibt.
export function load(): boolean {
  if (!hasStorage()) return false;
  const raw = readKey(SAVE_KEY) ?? readKey(LEGACY_SAVE_KEY);
  if (!raw) return false;
  try {
    return applyData(JSON.parse(raw));
  } catch (e) {
    console.warn('Spielstand beschädigt, starte neu:', e);
    return false;
  }
}

export function exportSave(): string {
  return saveCode.encode(state);
}

export function importSave(text: string): boolean {
  const data = saveCode.decode(text);
  if (!data || !applyData(data)) return false;
  save();
  return true;
}

// Löscht nur den Stand der neuen Fassung – der des alten Spiels bleibt unberührt
export function resetSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ohne Speicher gibt es nichts zu löschen
  }
  state = createDefaultState();
  // Nach dem Zurücksetzen nicht wieder den alten Stand übernehmen: leeren Stand sofort ablegen
  save();
  setLang(state.settings.lang);
}

export function setLanguage(lang: Lang): void {
  state.settings.lang = setLang(lang);
  save();
}
