'use client';
// Statistiken, Einstellungen und Spielstand (Nachfolger von renderStats/setupSettings/setupStatsActions in js/main.js).
// Casino-Statistik, Freundes-Rangliste, Figur, Name und Ton folgen, sobald ihre Module umgezogen sind.
import { Fragment, useState, type ReactNode } from 'react';
import { getCps, passiveActive, resetCombo, totalBuildings } from '@/game/clicker.ts';
import { formatDuration, formatNumber } from '@/game/format.ts';
import { t, type Lang } from '@/game/i18n.ts';
import {
  exportSave, getState, hasStorage, importSave, resetSave, save, setLanguage, type Effects,
} from '@/game/state.ts';
import { notify, showToast, useGame } from '@/game/store.ts';
import { Icon, Money } from './Icon.tsx';

type Transfer = { mode: 'export' | 'import'; text: string } | null;

export function StatsTab() {
  useGame();
  const s = getState();
  const [transfer, setTransfer] = useState<Transfer>(null);
  const storage = hasStorage();

  function changeLang(lang: Lang) {
    // Kein Neuladen nötig: alle Anzeigen werden mit der neuen Sprache neu gezeichnet
    setLanguage(lang);
    notify();
  }

  function changeEffects(effects: Effects) {
    s.settings.effects = effects;
    save();
    notify();
  }

  // Nach Import und Zurücksetzen ist der Zustand ein neues Objekt: alles neu zeichnen, im Tab bleiben
  // (wie refreshAll in js/main.js)
  function afterReplace() {
    getState().ui.tab = 'stats';
    resetCombo();
    save();
    notify();
  }

  function loadCode() {
    if (!transfer || !importSave(transfer.text)) {
      showToast(t('Ungültiger Spielstand-Code ⚠️'));
      return;
    }
    setTransfer(null);
    afterReplace();
    showToast(t('Spielstand geladen ✅'));
  }

  function reset() {
    if (!confirm(t('Willst du wirklich deinen kompletten Spielstand löschen? Das kann nicht rückgängig gemacht werden.'))) return;
    resetSave();
    afterReplace();
    showToast(t('Spielstand zurückgesetzt'));
  }

  const rows: [string, ReactNode][] = [
    ['Aktuelles Guthaben', <Money value={s.money} />],
    ['Verdient auf dieser Fahrt', <Money value={s.totalEarned} />],
    ['Insgesamt verdient', <Money value={s.allTimeEarned} />],
    ['Durch Klicks verdient', <Money value={s.clickEarned} />],
    ['Anzahl Klicks', formatNumber(s.totalClicks)],
    ['Kritische Klicks', formatNumber(s.crits)],
    ['Längste Klick-Combo', formatNumber(s.bestCombo)],
    ['Einkommen pro Sekunde', <><Money value={getCps()} decimals />{passiveActive() ? '' : <> <span className="muted">{t('(ausgeschaltet)')}</span></>}</>],
    ['Gebäude insgesamt', formatNumber(totalBuildings())],
    ['Upgrades gekauft', formatNumber(s.upgrades.length)],
    ['Spielzeit', formatDuration(s.playTime)],
  ];

  return (
    <>
      <h2><Icon name="chart" />{t('Statistiken')}</h2>
      <dl className="stats-list">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt>{t(label)}</dt><dd>{value}</dd>
          </Fragment>
        ))}
      </dl>

      <h2 className="section-gap"><Icon name="gear" />{t('Einstellungen')}</h2>
      <div className="settings">
        <label className="setting">
          <span><Icon name="globe" />Sprache / Language</span>
          <select id="set-lang" className="bet-input" value={s.settings.lang} onChange={e => changeLang(e.target.value as Lang)}>
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="setting">
          <span><Icon name="sparkle" />{t('Animationen')}</span>
          <select id="set-effects" className="bet-input" value={s.settings.effects} onChange={e => changeEffects(e.target.value as Effects)}>
            <option value="full">{t('Volle Effekte')}</option>
            <option value="reduced">{t('Reduziert (ruhiger)')}</option>
          </select>
        </label>
      </div>

      <h2 className="section-gap"><Icon name="save" />{t('Spielstand')}</h2>
      {!storage && (
        <p id="storage-warning" className="warning">
          <Icon name="warning" /> {t('Dein Browser erlaubt hier kein Speichern (z. B. in einer Vorschau oder im privaten Modus). Dein Fortschritt geht beim Neuladen verloren. Öffne das Spiel direkt im Browser oder sichere ihn mit „Exportieren“.')}
        </p>
      )}
      <p className="muted small">
        {t('Dein Fortschritt wird automatisch alle paar Sekunden, nach jedem Kauf und beim Schließen der Seite in deinem Browser gespeichert. Zuletzt gespeichert:')}{' '}
        <span id="last-saved">{storage ? t('vor {time}', { time: formatDuration((Date.now() - s.lastSaved) / 1000) }) : t('nicht möglich')}</span>
      </p>
      <div className="stats-actions">
        <button id="save-btn" className="btn" onClick={() => showToast(save() ? t('Spielstand gespeichert ✅') : t('Speichern nicht möglich ⚠️'))}>
          <Icon name="save" />{t('Jetzt speichern')}
        </button>
        <button id="export-btn" className="btn" onClick={() => setTransfer({ mode: 'export', text: exportSave() })}>
          <Icon name="upload" />{t('Exportieren')}
        </button>
        <button id="import-btn" className="btn" onClick={() => setTransfer({ mode: 'import', text: '' })}>
          <Icon name="download" />{t('Importieren')}
        </button>
        <button id="reset-btn" className="btn btn-danger" onClick={reset}>
          <Icon name="trash" />{t('Spielstand zurücksetzen')}
        </button>
      </div>
      {transfer && (
        <div id="transfer-box" className="transfer-box">
          <p id="transfer-hint" className="muted small">
            {transfer.mode === 'export'
              ? t('Kopiere diesen Code und bewahre ihn auf. Mit „Importieren“ kannst du ihn später (auch auf einem anderen Gerät) wieder laden.')
              : t('Füge hier deinen Spielstand-Code ein und klicke auf „Laden“. Dein aktueller Fortschritt wird dabei ersetzt.')}
          </p>
          <textarea id="transfer-text" rows={4} spellCheck={false} value={transfer.text} readOnly={transfer.mode === 'export'}
            onFocus={e => { if (transfer.mode === 'export') e.target.select(); }}
            onChange={e => setTransfer({ ...transfer, text: e.target.value })} />
          <div className="stats-actions">
            {transfer.mode === 'import' && <button id="transfer-confirm" className="btn" onClick={loadCode}>{t('Laden')}</button>}
            <button id="transfer-close" className="btn" onClick={() => setTransfer(null)}>{t('Schließen')}</button>
          </div>
        </div>
      )}
      <p className="muted small">{t('Alles ist reines Spielgeld ohne echten Wert.')}</p>
    </>
  );
}
