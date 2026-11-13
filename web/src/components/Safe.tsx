'use client';
// Ein Fehler in einem Bereich (z. B. durch einen beschädigten Spielstand) darf nicht das ganze Spiel anhalten:
// Jeder Bereich zeichnet für sich, ein Fehler wird einmal gemeldet und der Rest läuft weiter (wie safe() in js/main.js).
import { Component, type ReactNode } from 'react';

const reported = new Set<string>();

// Für Code außerhalb von React (Spielschleife): Fehler einmal je Bereich melden, dann weiter
export function safe(name: string, fn: () => void): void {
  try {
    fn();
  } catch (e) {
    if (!reported.has(name)) {
      reported.add(name);
      console.error(`Bereich „${name}“ fehlgeschlagen:`, e);
    }
  }
}

export class Safe extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (!reported.has(this.props.name)) {
      reported.add(this.props.name);
      console.error(`Bereich „${this.props.name}“ fehlgeschlagen:`, error);
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
