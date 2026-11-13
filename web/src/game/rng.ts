// Zufall für das ganze Spiel (Nachfolger von GK.rng aus js/casino/casino.js), aus crypto.getRandomValues.

// Ganzzahl von 0 bis max-1, ohne Verzerrung
export function int(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return buf[0] % max;
}

// Zahl von 0 (inklusive) bis 1 (exklusive)
export function float(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

// Eintrag nach Gewicht auswählen
export function weighted<T extends { weight: number }>(items: readonly T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = int(total);
  for (const item of items) {
    if (roll < item.weight) return item;
    roll -= item.weight;
  }
  return items[items.length - 1];
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
