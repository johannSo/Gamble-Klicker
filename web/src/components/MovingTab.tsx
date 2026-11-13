// Platzhalter für Bereiche, die noch nicht nach React umgezogen sind (Casino, Abenteuer, Fortschritt).
import { t } from '@/game/i18n.ts';
import { Icon } from './Icon.tsx';

// Adresse des bisherigen Spiels (lässt sich beim Bauen über NEXT_PUBLIC_LEGACY_URL ändern)
const LEGACY_URL = process.env.NEXT_PUBLIC_LEGACY_URL || 'https://rafaelo28.github.io/Gamble-Klicker/';

export function MovingTab() {
  return (
    <div className="moving-tab">
      <h2><Icon name="bricks" />{t('Dieser Bereich zieht gerade um')}</h2>
      <p className="muted">
        {t('Gamble Klicker wird Stück für Stück auf Next.js umgebaut. Bis dahin findest du diesen Bereich im bisherigen Spiel – dein Spielstand von dort wurde beim ersten Start hierher übernommen.')}
      </p>
      <a className="btn" href={LEGACY_URL}><Icon name="anchor" />{t('Zum bisherigen Spiel')}</a>
    </div>
  );
}
