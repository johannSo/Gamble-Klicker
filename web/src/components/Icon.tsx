// Kleine Symbole aus dem SVG-Sprite (src/game/icons.ts), Dublonen-Symbol und Beträge.
import { Fragment } from 'react';
import { formatNumber } from '@/game/format.ts';
import { splitEmoji } from '@/game/icons.ts';

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg className={`ic ic-${name}${className ? ' ' + className : ''}`} aria-hidden="true" focusable="false">
      <use href={`#i-${name}`} />
    </svg>
  );
}

// Die Währung: goldene Dublone (per CSS gezeichnet)
export function Coin({ label }: { label?: string }) {
  return label ? <i className="dublone" aria-label={label} /> : <i className="dublone" aria-hidden="true" />;
}

// Betrag mit Dublone; Betrag und Münze bleiben zusammen (kein Umbruch dazwischen)
export function Money({ value, decimals = false }: { value: number; decimals?: boolean }) {
  return (
    <span className="money">
      {formatNumber(value, decimals)}&nbsp;<Coin />
    </span>
  );
}

// Text, in dem bekannte Emojis durch eigene Symbole ersetzt werden (Meldungen, Toasts)
export function IconText({ text }: { text: string }) {
  return (
    <>
      {splitEmoji(text).map((part, i) => (
        <Fragment key={i}>{'text' in part ? part.text : <Icon name={part.icon} className={part.cls || undefined} />}</Fragment>
      ))}
    </>
  );
}
