'use client';
// Upgrades und Gebäude rechts neben der Münze (Nachfolger von renderUpgrades/renderBuildings in js/clicker.js).
import { useRef, useState } from 'react';
import {
  BUILDING_TIERS, BUILDINGS, UPGRADES_SHOWN, availableUpgrades, buildingCost, buildingCps, buildingName,
  buyBuilding, buyUpgrade, hasUpgrade, isRareUpgrade, owned, passiveActive, setPassive, upgradeClickGain,
  upgradeDesc, upgradeGain, upgradeName, type Building, type Upgrade,
} from '@/game/clicker.ts';
import { formatNumber } from '@/game/format.ts';
import { center, floatText, pulse } from '@/game/fx.ts';
import { t } from '@/game/i18n.ts';
import { canAfford, getState } from '@/game/state.ts';
import { notify, showNotice, showToast, useGame } from '@/game/store.ts';
import { Coin, Icon } from '../Icon.tsx';

const BUY_AMOUNTS = [1, 10, 100] as const;

function UpgradeTile({ u }: { u: Upgrade }) {
  const ref = useRef<HTMLButtonElement>(null);
  const name = upgradeName(u);
  const desc = upgradeDesc(u);
  const gain = upgradeGain(u);
  const clickGain = gain > 0 ? 0 : upgradeClickGain(u);

  function buy() {
    if (!buyUpgrade(u.id)) return;
    // Das betroffene Gebäude leuchtet auf, Upgrades für alle Gebäude lassen alle aufleuchten
    const target = u.building ? document.querySelector<HTMLElement>(`.building[data-building="${u.building}"]`) : null;
    if (target) {
      pulse(target, 'powered');
      const p = center(target.querySelector('.building-icon'));
      floatText(p.x + 40, p.y, u.type === 'synergy' ? t('🤝 Synergie!') : t('⚡ ×{value}!', { value: u.value }), 'win big');
    } else {
      const c = center(document.getElementById('big-coin'));
      floatText(c.x, c.y - 60, `${u.icon} ${name}!`, 'win big');
      if (u.type === 'globalMult') document.querySelectorAll<HTMLElement>('.building:not([hidden])').forEach(b => pulse(b, 'powered'));
    }
    if (ref.current && isRareUpgrade(u)) pulse(ref.current, 'bought');
    notify();
  }

  return (
    <button ref={ref} className={`upgrade rarity-${u.rarity}`} disabled={!canAfford(u.cost)} onClick={buy}
      title={`${name}\n${desc}\n${t('Preis: {cost} Dublonen', { cost: formatNumber(u.cost) })}`}>
      <span className="upgrade-icon"><Icon name={u.ic} /></span>
      <span className="upgrade-name">{name}</span>
      <span className="upgrade-desc">{desc}</span>
      <span className="upgrade-gain">
        {gain > 0 ? `+${formatNumber(gain, true)}/s` : clickGain > 0 ? t('+{x} pro Klick', { x: formatNumber(clickGain, true) }) : ''}
      </span>
      <span className="upgrade-cost"><Coin /> {formatNumber(u.cost)}</span>
    </button>
  );
}

function UpgradeList() {
  const [showAll, setShowAll] = useState(false);
  const available = availableUpgrades();
  const shown = showAll ? available : available.slice(0, UPGRADES_SHOWN);
  const hiddenCount = available.length - shown.length;
  return (
    <div className="shop-section">
      <h2>{t('Upgrades')}</h2>
      <div id="upgrade-list" className="upgrade-list">
        {shown.map(u => <UpgradeTile key={u.id} u={u} />)}
      </div>
      {available.length > UPGRADES_SHOWN && (
        <button className="btn btn-small upgrade-more" onClick={() => setShowAll(!showAll)}>
          {showAll
            ? t('▲ Weniger anzeigen')
            : t('▼ {n} weitere {word} anzeigen', { n: hiddenCount, word: t(hiddenCount === 1 ? 'Upgrade' : 'Upgrades', undefined, 'anzahl') })}
        </button>
      )}
      {shown.length === 0 && <p className="muted">{t('Noch keine Upgrades verfügbar – sammle weiter!')}</p>}
    </div>
  );
}

function BuildingRow({ b, mystery, amount }: { b: Building; mystery: boolean; amount: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const ownedRef = useRef<HTMLSpanElement>(null);
  const count = owned(b.id);
  const cost = buildingCost(b, count, amount);
  const cps = buildingCps(b);

  function buy() {
    const result = buyBuilding(b.id, amount);
    if (!result) return;
    pulse(ref.current, 'bought');
    pulse(ownedRef.current, 'count-pop');
    if (result.milestone) {
      const pos = center(ref.current?.querySelector('.building-icon'));
      floatText(pos.x + 60, pos.y - 10, t('🏗️ {n}× {name}!', { n: result.milestone, name: buildingName(b) }), 'win big');
      showNotice({
        icon: b.ic,
        title: t('Meilenstein: {n}× {name}!', { n: result.milestone, name: buildingName(b) }),
        body: result.tier
          ? t('Neues Upgrade verfügbar: {upg}', { upg: t('{tier}-{name}', { tier: t(result.tier.name), name: buildingName(b) }) })
          : undefined,
        duration: 4000,
      });
    }
    notify();
  }

  // Fortschritt bis zum nächsten Gebäude-Upgrade
  const nextTier = BUILDING_TIERS.find(tier => tier.owned > count);
  const prevTier = [...BUILDING_TIERS].reverse().find(tier => tier.owned <= count);
  const from = prevTier ? prevTier.owned : 0;
  const showProgress = !mystery && count > 0 && !!nextTier;

  return (
    <button ref={ref} className={`building${mystery ? ' mystery' : ''}`} data-building={b.id} disabled={!canAfford(cost)} onClick={buy}>
      <span className="building-icon"><Icon name={mystery ? 'question' : b.ic} /></span>
      <span className="building-info">
        <span className="building-name">
          {mystery ? '??? ' : buildingName(b) + ' '}
          <span className="building-stars">
            {BUILDING_TIERS.map((tier, k) => hasUpgrade(`${b.id}-${k + 1}`) && <i key={k} className={`star rarity-${tier.rarity}`}>★</i>)}
            {hasUpgrade(`syn-${b.id}`) && <i className="star rarity-synergy"><Icon name="handshake" /></i>}
          </span>
        </span>
        <span className="building-desc">{mystery ? t('Noch unbekannt') : t(b.desc)}</span>
        <span className="building-meta">
          {mystery ? '' : t('+{x}/s pro Stück', { x: formatNumber(cps, true) }) +
            (count ? t(' · gesamt {x}/s', { x: formatNumber(cps * count, true) }) : '') +
            (passiveActive() ? '' : t(' · pausiert'))}
        </span>
        <span className="building-progress" hidden={!showProgress}>
          <span className={`building-progress-fill${nextTier ? ` rarity-${nextTier.rarity}` : ''}`}
            style={showProgress && nextTier ? { width: ((count - from) / (nextTier.owned - from)) * 100 + '%' } : undefined} />
        </span>
        <span className="building-next" hidden={mystery || !count}>
          {!mystery && count > 0 && (nextTier
            ? t('Noch {n} bis zum {tier}-Upgrade (×{value})', { n: nextTier.owned - count, tier: t(nextTier.name), value: nextTier.value })
            : <><Icon name="sparkle" /> {t('Alle Stufen freigeschaltet')}</>)}
        </span>
      </span>
      <span className="building-side">
        <span className="building-cost"><Coin /> {formatNumber(cost)}</span>
        <span ref={ownedRef} className="building-owned">{count || ''}</span>
      </span>
    </button>
  );
}

function BuildingList() {
  const [amount, setAmount] = useState<number>(1);
  const s = getState();
  // Sichtbar: alle gekauften bzw. fast bezahlbaren Gebäude, plus eins als „???“-Vorschau
  let lastRevealed = 0;
  BUILDINGS.forEach((b, i) => {
    if (owned(b.id) > 0 || s.totalEarned >= b.baseCost / 2) lastRevealed = i;
  });
  const passive = passiveActive();

  function togglePassive(on: boolean) {
    setPassive(on);
    showToast(on ? t('💰 Passives Einkommen läuft wieder.') : t('⏸️ Passives Einkommen ausgeschaltet – nur noch Klicks und Casino bringen Dublonen.'));
    notify();
  }

  return (
    <div className="shop-section">
      <div className="shop-header">
        <h2>{t('Gebäude')}</h2>
        <div className="buy-amount" role="group" aria-label={t('Kaufmenge')}>
          {BUY_AMOUNTS.map(n => (
            <button key={n} className={`amount-btn${amount === n ? ' active' : ''}`} onClick={() => setAmount(n)}>×{n}</button>
          ))}
        </div>
      </div>
      <div id="building-list" className={`building-list${passive ? '' : ' paused'}`}>
        {BUILDINGS.map((b, i) => i <= lastRevealed + 1 && (
          <BuildingRow key={b.id} b={b} mystery={i === lastRevealed + 1} amount={amount} />
        ))}
      </div>
      <label className="setting passive-toggle">
        <span><Icon name="bag" />{t('Passives Einkommen der Gebäude')}
          <span className="muted small passive-hint">{t('Ausgeschaltet verdienen die Gebäude nichts – auch nicht, während das Spiel geschlossen ist.')}</span></span>
        <input type="checkbox" id="passive-toggle" className="switch" checked={passive} onChange={e => togglePassive(e.target.checked)} />
      </label>
    </div>
  );
}

export function Shop() {
  useGame();
  return (
    <div className="shop">
      <UpgradeList />
      <BuildingList />
    </div>
  );
}
