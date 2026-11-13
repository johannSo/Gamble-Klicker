'use client';
// Die große Münze mit Combo-Anzeige und schwebenden Zahlen.
// Ein Tipp ändert nur den Spielzustand und setzt Effekte direkt ins DOM – neu gezeichnet wird im 100-ms-Takt.
import { useRef, type MouseEvent, type PointerEvent } from 'react';
import { click, comboActive, comboBonus, comboCap, comboCount, comboMult, getClickPower } from '@/game/clicker.ts';
import { formatDecimal, formatNumber } from '@/game/format.ts';
import { center, floatText, layerRing, layerText, reducedEffects } from '@/game/fx.ts';
import { t } from '@/game/i18n.ts';
import { getState } from '@/game/state.ts';
import { useGame } from '@/game/store.ts';
import { Icon } from '../Icon.tsx';

// Die Münze federt beim Tippen (Web Animations: es bleibt keine Klasse hängen, das Schweben läuft weiter)
const COIN_HIT: Keyframe[] = [
  { transform: 'scale(1)' },
  { transform: 'scale(0.9) rotate(-3deg)', offset: 0.4 },
  { transform: 'scale(1)' },
];
const COIN_CRIT: Keyframe[] = [
  { transform: 'scale(1)', filter: 'brightness(1)' },
  { transform: 'scale(0.84) rotate(-8deg)', filter: 'brightness(1.6) saturate(1.4)', offset: 0.3 },
  { transform: 'scale(1.08) rotate(5deg)', filter: 'brightness(1.2) saturate(1.1)', offset: 0.6 },
  { transform: 'scale(1)', filter: 'brightness(1)' },
];

const factor = (f: number) => formatDecimal(f, 0, 2);

export function BigCoin() {
  useGame();
  const coinRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);

  function hit(x: number | null, y: number | null) {
    const coin = coinRef.current;
    const layer = layerRef.current;
    if (!coin || !layer) return;
    const pos = x !== null && y !== null ? { x, y } : center(coin);
    // Erst messen, dann schreiben – sonst rechnet der Browser pro Tipp mehrmals das Layout
    const rect = layer.getBoundingClientRect();
    const local = { x: pos.x - rect.left, y: pos.y - rect.top };
    const result = click(performance.now());
    if (!result) return; // zu schnell (mehr als 25 Klicks pro Sekunde)

    layerRing(layer, local.x, local.y);
    if (!reducedEffects() && coin.animate) {
      animation.current?.cancel(); // laufendes Federn ablösen, damit sich nichts aufstaut
      animation.current = coin.animate(result.crit ? COIN_CRIT : COIN_HIT, { duration: result.crit ? 350 : 180, easing: 'ease-out' });
    }
    if (result.crit) {
      layerText(layer, local.x, local.y, t('KRITISCH! +{amount}', { amount: formatNumber(result.amount, true) }), 'crit', 1300);
    } else {
      layerText(layer, local.x, local.y, '+' + formatNumber(result.amount, true), result.combo >= 25 ? 'hot' : '', 1000);
    }
    if (result.milestone !== null) {
      const c = center(coin);
      floatText(c.x, c.y - 30, t('🔥 COMBO ×{mult}!', { mult: factor(comboMult()) }), 'win big');
    }
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    // pointerdown statt click: reagiert sofort und erlaubt schnelles Tippen mit mehreren Fingern (iPad)
    if (e.button !== 0) return;
    e.preventDefault();
    hit(e.clientX, e.clientY);
  }

  // Tastatur (Enter/Leertaste) löst ein click-Ereignis ohne Zeiger aus
  function onKeyClick(e: MouseEvent<HTMLButtonElement>) {
    if (e.detail === 0) hit(null, null);
  }

  const active = comboActive(performance.now());
  const cap = comboCap();
  const bonus = comboBonus();
  const coinSkin = getState().cosmetics.equipped.coin;

  return (
    <div className="click-area">
      <div className={`coin-stage coin-skin-${coinSkin}`}>
        <button ref={coinRef} id="big-coin" className="big-coin" aria-label={t('Dublone klicken')}
          onPointerDown={onPointerDown} onClick={onKeyClick}
          onKeyDown={e => { if (e.repeat) e.preventDefault(); }}>
          <span className="big-coin-inner">D</span>
        </button>
      </div>
      <div className="click-power">+<span id="click-power">{formatNumber(getClickPower(), true)}</span> {t('pro Klick')}</div>
      <div id="combo-meter" className={`combo-meter${active ? ' active' : ''}${active && bonus >= cap ? ' maxed' : ''}`} aria-hidden="true">
        <span className="combo-count">{active && <><Icon name="flame" /> {t('Combo {n}', { n: comboCount() })}</>}</span>
        <span className="combo-bar"><span className="combo-fill" style={{ width: active ? (bonus / cap) * 100 + '%' : undefined }} /></span>
        <span className="combo-mult">{active ? '×' + factor(comboMult()) : ''}</span>
      </div>
      <div ref={layerRef} id="float-layer" className="float-layer" />
    </div>
  );
}
