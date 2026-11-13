# Gamble Klicker – Next.js-Fassung (Umzug läuft)

Das Spiel wird Schritt für Schritt von reinem HTML/JS (Hauptordner: `index.html`, `js/`, `css/`) auf
**Next.js 16 + React 19 + TypeScript** umgebaut. Solange der Umzug läuft, bleibt das bisherige Spiel
unverändert online; diese Fassung liegt daneben in `web/` und wird noch nicht veröffentlicht.

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm test           # Node-Tests (node:test, TypeScript direkt, ohne Build)
npm run typecheck
npm run build      # statische Seite in web/out/ (für GitHub Pages, kein Server nötig)
NEXT_BASE_PATH=/Gamble-Klicker/next npm run build   # für einen Unterordner
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/game/` | Spielregeln ohne React – reines TypeScript, in Node testbar. Ein Modul je altem `js/`-Modul. |
| `src/components/` | React-Komponenten (alle `'use client'`; das Spiel läuft ganz im Browser). |
| `src/app/` | Next.js App Router: `layout.tsx` (Kopfdaten, Schrift, SVG-Sprite – läuft nur beim Bauen), `page.tsx`. |
| `src/styles/` | `style.css` und `icons.css` **unverändert kopiert** aus `css/`, Neues in `next.css`. |
| `tests/` | Node-Tests. `legacy.ts` lädt das alte Spiel, damit die neuen Module Zahl für Zahl verglichen werden. |

### Zustand und Neuzeichnen

- Der Spielstand ist wie bisher **ein veränderliches Objekt** (`state.ts:getState()`), nicht React-State –
  die Schleife ändert ihn in jedem Bild. Nie eine Referenz darauf aufheben (Import/Zurücksetzen ersetzen ihn).
- `store.ts:notify()` sagt React, dass neu gezeichnet werden soll; die Spielschleife (`Game.tsx`) tut das
  alle 100 ms wie `render()` im alten `main.js`. Komponenten rufen `useGame()` auf.
- Effekte, die bei jedem Tipp passieren (schwebende Zahlen, Ring, Federn der Münze), schreiben direkt ins DOM
  (`fx.ts`), damit schnelles Tippen nicht ständig React-Arbeit auslöst.

### Sprache

`t('deutscher text')` aus `i18n.ts`, Englisch per `addTranslations({...})` im jeweiligen Modul
(`*.i18n.ts`). Die Ladereihenfolge spielt keine Rolle mehr. Ein Sprachwechsel lädt die Seite **nicht** neu –
alles wird mit der neuen Sprache neu gezeichnet.

### Spielstand

- Eigener Speicherplatz `gamble-klicker-next-save`. Beim allerersten Start wird der Stand des alten Spiels
  (`gamble-klicker-save`) **kopiert** – das alte Spiel bleibt unberührt.
- Alle Felder bleiben erhalten, auch die von Bereichen, die noch nicht umgezogen sind.
- Spielstand-Codes (Export/Import) sind dasselbe Format wie im alten Spiel – in beide Richtungen austauschbar.
- Beim endgültigen Umzug wechselt `SAVE_KEY` auf `gamble-klicker-save`.

## Stand des Umzugs

| Bereich | Stand |
|---|---|
| Kern: Spielstand, Geld, Zahlenformate, Spielstand-Code, Sprache, Zufall, Symbole | ✅ umgezogen, mit Vergleichstests |
| Klicker: Münze, Combo, Krit, Gebäude, Upgrades, passives Einkommen, Offline-Einnahmen | ✅ umgezogen, mit Vergleichstests |
| Statistiken (Klicker-Teil), Sprache, Animationen, Speichern/Export/Import/Zurücksetzen | ✅ |
| Absicherung aus dem Original (Nov. 2026): Spielzeit-Uhr, Daten von außen entschärfen, Buff-Dauer gedeckelt, höchstens 25 Klicks/s, kein Autoklicker per Taste, nur ein Tab spielt, Fehler legen nur ihren Bereich lahm, defekten Stand aufheben | ✅ |
| Import sperren bzw. laufende Runden verfallen lassen (`GK.casino.runningRound`/`clearRunning`) | ⏳ mit dem Casino |
| Content-Security-Policy (`index.html`) | ⏳ Next.js schreibt Inline-Skripte in die Seite; braucht Hashes beim Bauen |
| Ton (`sound.js`), Partikel (`fx.js`: Münzregen, Funken), Besucherzählung (`analytics.js`) | ⏳ |
| Fortschritt: Boni/goldene Dublone, große Fahrt, Erfolge, tägliche Aufgaben, Ränge, Schatzkammer | ⏳ (Boni werden schon mitgerechnet) |
| Abenteuer: Flotte, Bosskampf; Kraken | ⏳ (Schatz- und Trophäen-Boni werden schon mitgerechnet) |
| Casino (22 Spiele), Poker, Spiele mit Freunden (`mp/`), Figur, Freundes-Rangliste | ⏳ |

Noch nicht umgezogene Tabs zeigen einen Hinweis mit Link zum bisherigen Spiel.

## Rezept: ein Modul umziehen

1. Regeln aus `js/x.js` nach `src/game/x.ts` (Zahlen, IDs, Formeln **unverändert** – alte Spielstände).
   Deutsche Texte bleiben Schlüssel, Englisch nach `x.i18n.ts`.
2. Vergleichstest in `tests/x.test.ts`: alten Code über `loadLegacy()` laden, gleiche Zustände, gleiche Ergebnisse.
3. Darstellung als Komponente in `src/components/`, mit den **gleichen CSS-Klassen** wie `index.html`/`js/x.js`.
4. Im Platzhalter-Tab einsetzen, Tabelle oben aktualisieren.
5. `npm test`, `npm run typecheck`, `npm run build`, im Browser prüfen (iPad hoch/quer, keine Konsolenfehler,
   kein seitliches Scrollen).

Regeln aus `CLAUDE.md` gelten weiter: Dublonen nur über `earn`/`spend`, keine Quoten anzeigen, iPad 8 als Zielgerät,
Physik der Online-Spiele ohne Winkelfunktionen, laufende Runden sofort speichern. Die `?v=`-Versionsnummer gibt es
hier nicht – Next.js hängt an jede Datei einen Inhalts-Hash.
