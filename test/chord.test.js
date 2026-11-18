import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeKey } from '../js/theory/key.js';
import { chordName, diatonicChord, qualityChord, resolveRef, QUALITIES, EXTENSIONS } from '../js/theory/chord.js';

const C = makeKey('C', 'major');
const Am = makeKey('A', 'minor');
const dn = (k, deg, ext, v = 'natural') => chordName(diatonicChord(k, deg, ext, v));

test('C major degree 1 extensions', () => {
  assert.deepEqual([3, 7, 9, 11, 13].map((e) => dn(C, 1, e)), ['C', 'Cmaj7', 'Cmaj9', 'Cmaj9#11', 'Cmaj13#11']);
});
test('C major degree 2 extensions', () => {
  assert.deepEqual([9, 11, 13].map((e) => dn(C, 2, e)), ['Dm9', 'Dm11', 'Dm13']);
});
test('C major degree 3 ninth is Em7b9', () => assert.equal(dn(C, 3, 9), 'Em7b9'));
test('C major degree 5 drops natural 11', () => {
  assert.deepEqual([7, 9, 11, 13].map((e) => dn(C, 5, e)), ['G7', 'G9', 'G9', 'G13']);
});
test('C major degree 7 is Bm7b5', () => assert.equal(dn(C, 7, 7), 'Bm7b5'));
test('A minor i9', () => assert.equal(dn(Am, 1, 9), 'Am9'));
test('A minor v natural is Em7', () => assert.equal(dn(Am, 5, 7), 'Em7'));
test('A minor V dominant', () => {
  assert.equal(dn(Am, 5, 7, 'dominant'), 'E7');
  assert.equal(dn(Am, 5, 9, 'dominant'), 'E7b9');
  assert.equal(dn(Am, 5, 3, 'dominant'), 'E');
});
test('dominant variant ignored outside minor degree 5', () => {
  assert.deepEqual(diatonicChord(C, 5, 9, 'dominant'), diatonicChord(C, 5, 9, 'natural'));
  assert.deepEqual(diatonicChord(Am, 4, 7, 'dominant'), diatonicChord(Am, 4, 7, 'natural'));
});
test('spelling in flat and sharp keys', () => {
  assert.equal(dn(makeKey('Bb', 'major'), 4, 7), 'Ebmaj7');
  assert.equal(dn(makeKey('F#', 'major'), 7, 7), 'E#m7b5');
});
test('free pick qualities', () => {
  const q = (id) => chordName(qualityChord('A', id));
  assert.equal(q('min9'), 'Am9');
  assert.equal(q('sevenSus4'), 'A7sus4');
  assert.equal(q('min7b5'), 'Am7b5');
  assert.equal(q('six'), 'A6');
  assert.equal(q('add9'), 'Aadd9');
});
test('all qualities produce a chord', () => {
  assert.equal(QUALITIES.length, 22);
  for (const q of QUALITIES) assert.ok(chordName(qualityChord('C', q.id)).startsWith('C'));
});
test('degree refs transpose with the key', () => {
  const ref = { kind: 'degree', degree: 2, variant: 'natural', ext: 9 };
  assert.equal(chordName(resolveRef(ref, C)), 'Dm9');
  assert.equal(chordName(resolveRef(ref, makeKey('G', 'major'))), 'Am9');
  assert.equal(chordName(resolveRef({ ...ref, ext: 7 }, Am)), 'Bm7b5');
});
test('fixed refs never move', () => {
  const ref = { kind: 'fixed', root: 'D', quality: 'min9' };
  for (const k of [C, Am, makeKey('Eb', 'major')]) assert.equal(chordName(resolveRef(ref, k)), 'Dm9');
});
test('refs survive JSON', () => {
  for (const ref of [{ kind: 'degree', degree: 5, variant: 'dominant', ext: 7 }, { kind: 'fixed', root: 'Bb', quality: 'maj7' }]) {
    assert.deepEqual(resolveRef(JSON.parse(JSON.stringify(ref)), Am), resolveRef(ref, Am));
  }
});
test('EXTENSIONS', () => assert.deepEqual(EXTENSIONS, [3, 7, 9, 11, 13]));
