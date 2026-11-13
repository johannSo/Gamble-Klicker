// Verbindung zwischen Spielzustand und React.
// Der Zustand selbst ist ein veränderliches Objekt (state.ts). Nach jeder Änderung, die man sehen soll,
// ruft man notify() auf; die Spielschleife tut das ohnehin alle 100 ms (wie render() im alten main.js).
// Komponenten holen sich mit useGame() die aktuelle Versionsnummer und zeichnen dadurch neu.
import { useSyncExternalStore } from 'react';

let version = 0;
const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(): void {
  version++;
  for (const fn of listeners) fn();
}

const getVersion = () => version;
const getServerVersion = () => 0;

// Neu zeichnen, sobald sich der Spielzustand ändert. Rückgabe: Versionsnummer (für useMemo-Abhängigkeiten)
export function useGame(): number {
  return useSyncExternalStore(subscribe, getVersion, getServerVersion);
}

// ---------- Kurze Meldungen (Toast) und Kästen unten rechts (Notify) ----------

export interface Toast { id: number; text: string; icon?: string }
export interface Notice { id: number; icon?: string; title: string; body?: string; duration: number }

let nextId = 1;
let toast: Toast | null = null;
let notices: Notice[] = [];
const uiListeners = new Set<() => void>();
const emitUi = () => { for (const fn of uiListeners) fn(); };

function subscribeUi(fn: () => void): () => void {
  uiListeners.add(fn);
  return () => uiListeners.delete(fn);
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

// Kurze Zeile unten, 2,5 s, immer nur eine
export function showToast(text: string, icon?: string): void {
  toast = { id: nextId++, text, icon };
  emitUi();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast = null; emitUi(); }, 2500);
}

// Kasten unten rechts, höchstens 3 gestapelt, Klick schließt
export function showNotice(n: Omit<Notice, 'id' | 'duration'> & { duration?: number }): void {
  const notice: Notice = { duration: 5000, ...n, id: nextId++ };
  notices = [...notices, notice].slice(-3);
  emitUi();
  setTimeout(() => closeNotice(notice.id), notice.duration);
}

export function closeNotice(id: number): void {
  if (!notices.some(n => n.id === id)) return;
  notices = notices.filter(n => n.id !== id);
  emitUi();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(subscribeUi, () => toast, () => null);
}

const noNotices: Notice[] = [];
export function useNotices(): Notice[] {
  return useSyncExternalStore(subscribeUi, () => notices, () => noNotices);
}
