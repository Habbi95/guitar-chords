import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePitch, pitchClass, pitchName } from '../js/theory/pitch.js';
import { makeKey, scale, keyName, ALL_TONICS } from '../js/theory/key.js';

const names = (k) => scale(k).map(pitchName).join(' ');

test('C major scale', () => assert.equal(names(makeKey('C', 'major')), 'C D E F G A B'));
test('F# major spells E#', () => assert.equal(names(makeKey('F#', 'major')), 'F# G# A# B C# D# E#'));
test('Eb minor spells Cb', () => assert.equal(names(makeKey('Eb', 'minor')), 'Eb F Gb Ab Bb Cb Db'));
test('A minor scale', () => assert.equal(names(makeKey('A', 'minor')), 'A B C D E F G'));
test('every scale uses each letter once', () => {
  for (const t of ALL_TONICS) for (const m of ['major', 'minor']) {
    const letters = new Set(scale(makeKey(t, m)).map((p) => p.letter));
    assert.equal(letters.size, 7, `${t} ${m}`);
  }
});
test('Cb has pitch class 11', () => assert.equal(pitchClass(parsePitch('Cb')), 11));
test('key name', () => assert.equal(keyName(makeKey('A', 'minor')), 'A minor'));
