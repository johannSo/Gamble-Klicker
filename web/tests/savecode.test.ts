// Spielstand-Code: SHA-256, Hin und zurück, Fälschung wird abgewiesen, und Codes passen zum alten Spiel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, encode, sha256hex } from '../src/game/savecode.ts';
import { legacyAvailable, loadLegacy } from './legacy.ts';

test('SHA-256 gegen bekannte Prüfwerte (FIPS 180-4)', () => {
  assert.equal(sha256hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'),
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
});

const proben: unknown[] = [
  {},
  { money: 1234, name: 'Rafaelo28' },
  { a: 1, b: [1, 2, 3], c: { tief: { x: true, y: null } }, text: 'Dublonen „≈“ 😀 Ümlaute' },
  { big: '0123456789'.repeat(500) },
];

test('Hin und zurück, jedes Mal ein anderer Code', () => {
  for (const p of proben) {
    const a = encode(p);
    assert.deepEqual(decode(a), p);
    assert.notEqual(encode(p), a);
  }
});

test('veränderter Code wird abgewiesen', () => {
  const code = encode({ money: 100 });
  const bytes = Buffer.from(code, 'base64');
  for (const i of [0, 5, 20, bytes.length - 1]) {
    const copy = Buffer.from(bytes);
    copy[i] ^= 1;
    assert.equal(decode(copy.toString('base64')), null, `Byte ${i}`);
  }
  assert.equal(decode('kein base64 !!'), null);
});

test('alte reine Base64-Codes laden weiter', () => {
  const old = Buffer.from(JSON.stringify({ money: 42 })).toString('base64');
  assert.deepEqual(decode(old), { money: 42 });
  assert.deepEqual(decode('  ' + old + '\n'), { money: 42 });
});

test('Codes passen in beide Richtungen zum alten Spiel', { skip: !legacyAvailable }, () => {
  const GK = loadLegacy();
  for (const p of proben) {
    assert.deepEqual(decode(GK.saveCode.encode(p)), p, 'alt → neu');
    assert.deepEqual(GK.saveCode.decode(encode(p)), p, 'neu → alt');
  }
});
