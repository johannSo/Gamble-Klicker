// Symbole: das Sprite ist Zeichen für Zeichen das des alten Spiels; Emojis werden zu Symbolen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_NAMES, iconForEmoji, splitEmoji, spriteHTML } from '../src/game/icons.ts';
import { BUILDINGS, UPGRADES } from '../src/game/clicker.ts';
import { legacyAvailable, loadLegacy } from './legacy.ts';

test('jedes Gebäude und Upgrade hat ein Symbol', () => {
  for (const x of [...BUILDINGS, ...UPGRADES]) assert.ok(ICON_NAMES.includes(x.ic), x.id + ': ' + x.ic);
  for (const name of ['question', 'handshake', 'sparkle', 'flame', 'bag', 'pause', 'save']) assert.ok(ICON_NAMES.includes(name), name);
});

test('Emojis in Meldungen', () => {
  assert.deepEqual(iconForEmoji('⚓'), ['anchor', '']);
  assert.deepEqual(iconForEmoji('🥇'), ['medal', 'ic-gold']);
  assert.equal(iconForEmoji('🙂'), null);
  assert.deepEqual(splitEmoji('Spielstand geladen ✅'), [{ text: 'Spielstand geladen ' }, { icon: 'check', cls: '' }]);
  assert.deepEqual(splitEmoji('⏸️ Pause'), [{ icon: 'pause', cls: '' }, { text: ' Pause' }]);
});

test('Sprite gleicht js/icons.js', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  assert.equal(spriteHTML(), GK.icons.spriteHTML());
});
