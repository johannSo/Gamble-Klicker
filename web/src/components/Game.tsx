'use client';
// Einstiegspunkt im Browser (Nachfolger von js/main.js): Laden, Spielschleife, Autosave, Kopfzeile und Tabs.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import '@/game/ui.i18n.ts';
import { getCps, passiveActive, tick } from '@/game/clicker.ts';
import { formatDuration, formatNumber } from '@/game/format.ts';
import { t } from '@/game/i18n.ts';
import { applyOfflineEarnings } from '@/game/offline.ts';
import { getState, hasStorage, load, save, setOnSave, type TabId } from '@/game/state.ts';
import { closeNotice, notify, showNotice, showToast, useGame, useNotices, useToast } from '@/game/store.ts';
import { BigCoin } from './clicker/BigCoin.tsx';
import { Shop } from './clicker/Shop.tsx';
import { Coin, Icon, IconText } from './Icon.tsx';
import { MovingTab } from './MovingTab.tsx';
import { StatsTab } from './StatsTab.tsx';

const AUTOSAVE_INTERVAL = 5000;  // ms
const RENDER_INTERVAL = 100;     // ms
const MAX_CATCH_UP = 8 * 3600;   // Sekunden, die ein Hintergrund-Tab nachgeholt wird

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'clicker', icon: 'tap', label: 'Klicker' },
  { id: 'casino', icon: 'dice', label: 'Casino' },
  { id: 'adventure', icon: 'anchor', label: 'Abenteuer' },
  { id: 'progress', icon: 'trophy', label: 'Fortschritt' },
  { id: 'stats', icon: 'chart', label: 'Statistiken' },
];
const TAB_IDS = TABS.map(x => x.id);

// Spielschleife: Einkommen in jedem Bild, Anzeige alle 100 ms, Autosave alle 5 s
function useGameLoop(onSaved: () => void) {
  useEffect(() => {
    setOnSave(onSaved);
    let lastTick = performance.now();
    let lastRender = 0;
    let hiddenAt: number | null = null;
    let frame = 0;

    function loop(now: number) {
      // Begrenzen, damit ein lange inaktiver Tab nicht auf einmal riesige Sprünge macht
      const seconds = Math.min((now - lastTick) / 1000, 1);
      lastTick = now;
      getState().playTime += seconds;
      tick(seconds);
      if (now - lastRender >= RENDER_INTERVAL) {
        lastRender = now;
        notify();
      }
      frame = requestAnimationFrame(loop);
    }

    // Im Hintergrund pausiert der Browser die Schleife: beim Zurückkommen nachholen (bis 8 Stunden)
    function onVisibilityChange() {
      if (document.hidden) {
        hiddenAt = Date.now();
        save();
      } else if (hiddenAt !== null) {
        const seconds = Math.min((Date.now() - hiddenAt) / 1000, MAX_CATCH_UP);
        hiddenAt = null;
        if (seconds > 1) {
          getState().playTime += seconds;
          tick(seconds);
        }
        lastTick = performance.now();
        notify();
      }
    }

    const autosave = setInterval(save, AUTOSAVE_INTERVAL);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', save);
    window.addEventListener('beforeunload', save);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(autosave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', save);
      window.removeEventListener('beforeunload', save);
      setOnSave(null);
    };
  }, [onSaved]);
}

function Header({ saved }: { saved: boolean }) {
  const s = getState();
  const passive = passiveActive();
  return (
    <header className="topbar">
      <div className="logo"><span className="logo-coin">D</span><span className="logo-text">Gamble Klicker</span></div>
      <div className="wallet">
        <div className="wallet-money"><span id="money">{formatNumber(s.money)}</span> <Coin label={t('Dublonen')} /></div>
        <div className="wallet-cps">
          {passive
            ? <span id="cps-on"><span id="cps">{formatNumber(getCps(), true)}</span> {t('Dublonen pro Sekunde')}</span>
            : <span id="cps-off"><Icon name="pause" />{t('Passives Einkommen aus')}</span>}
        </div>
        <div id="save-indicator" className={`save-indicator${saved ? ' show' : ''}`}><Icon name="save" />{t('gespeichert')}</div>
      </div>
    </header>
  );
}

function Overlays() {
  const toast = useToast();
  const notices = useNotices();
  return (
    <>
      <div id="toast" className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">
        {toast && <>{toast.icon && <><Icon name={toast.icon} /> </>}<IconText text={toast.text} /></>}
      </div>
      <div id="notify-stack" className="notify-stack" aria-live="polite">
        {notices.map(n => (
          <div key={n.id} className="notify" onClick={() => closeNotice(n.id)}>
            {n.icon && <span className="notify-icon"><Icon name={n.icon} /></span>}
            <span><b><IconText text={n.title} /></b>{n.body && <><br /><IconText text={n.body} /></>}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export function Game() {
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useGame();

  // Laden erst im Browser (localStorage); beim Bauen der Seite gibt es keinen Spielstand
  useEffect(() => {
    load();
    if (!hasStorage()) showToast(t('⚠️ Speichern nicht möglich – Details unter Statistiken'));
    const offline = applyOfflineEarnings();
    if (offline) {
      showNotice({
        icon: 'bag',
        title: t('Willkommen zurück!'),
        body: t('Während du {dur} weg warst, haben deine Gebäude {amount} Dublonen verdient{max}.', {
          dur: formatDuration(offline.seconds),
          amount: formatNumber(offline.amount),
          max: offline.capped ? t(' (höchstens 8 Stunden)') : '',
        }),
        duration: 8000,
      });
    }
    // Unbekannter Tab (z. B. aus einem neueren Spielstand) → Klicker
    if (!TAB_IDS.includes(getState().ui.tab)) getState().ui.tab = 'clicker';
    save();
    setReady(true);
    notify();
  }, []);

  const onSaved = useRef(() => {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1200);
  }).current;
  useGameLoop(onSaved);

  const s = getState();
  const tab = s.ui.tab;
  const effects = s.settings.effects;
  const { theme, table } = s.cosmetics.equipped;
  const money = formatNumber(s.money);

  // Seiten-Einstellungen, die außerhalb von React liegen: Titel, Sprache, Animationen, Schatzkammer-Thema
  useEffect(() => {
    if (!ready) return;
    const title = t('{money} Dublonen – Gamble Klicker', { money });
    if (document.title !== title) document.title = title;
  });
  useEffect(() => {
    document.documentElement.lang = s.settings.lang;
    document.body.classList.toggle('reduced-effects', effects === 'reduced');
    if (theme && theme !== 'tavern') document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
    if (table && table !== 'felt') document.documentElement.dataset.table = table;
    else delete document.documentElement.dataset.table;
  }, [s.settings.lang, effects, theme, table]);

  // Höhe der festen Kopfzeile merken (die Klick-Münze bleibt darunter stehen)
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, [ready]);

  function showTab(id: TabId) {
    getState().ui.tab = id;
    notify();
  }

  if (!ready) return <div className="boot-screen" aria-busy="true"><span className="logo-coin">D</span></div>;

  return (
    <>
      <div className="app-header" ref={headerRef}>
        <Header saved={saved} />
        <nav className="tabs">
          {TABS.map(x => (
            <button key={x.id} className={`tab${tab === x.id ? ' active' : ''}`} data-tab={x.id} onClick={() => showTab(x.id)}>
              <span className="tab-icon"><Icon name={x.icon} /></span><span className="tab-label">{t(x.label)}</span>
            </button>
          ))}
        </nav>
      </div>

      <main>
        <section id="tab-clicker" className={`tab-panel${tab === 'clicker' ? ' active' : ''}`}>
          {tab === 'clicker' && (
            <div className="clicker-layout">
              <BigCoin />
              <Shop />
            </div>
          )}
        </section>
        {(['casino', 'adventure', 'progress'] as const).map(id => (
          <section key={id} id={`tab-${id}`} className={`tab-panel${tab === id ? ' active' : ''}`}>
            {tab === id && <MovingTab />}
          </section>
        ))}
        <section id="tab-stats" className={`tab-panel${tab === 'stats' ? ' active' : ''}`}>
          {tab === 'stats' && <StatsTab />}
        </section>
      </main>

      <footer className="footer">
        <Icon name="anchor" />{t('Gamble Klicker · Entwickelt von Rafael')} (<a href="https://github.com/Rafaelo28" target="_blank" rel="noopener">Rafaelo28</a>)
        {' '}{t('mit der Community · Idee von Adrian')}
        {' · '}<a href="https://github.com/Rafaelo28/Gamble-Klicker" target="_blank" rel="noopener">{t('Quellcode auf GitHub')}</a>
        {' · '}{t('Nur Spielgeld – kein echtes Geld')}
      </footer>

      <Overlays />
    </>
  );
}
