import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeKey, ALL_TONICS } from '../js/theory/key.js';
import { diatonicChord, qualityChord, QUALITIES, EXTENSIONS, chordName, chordPitchClasses, chordRoles } from '../js/theory/chord.js';
import { pitchClass } from '../js/theory/pitch.js';
import { voice, voiceWithInfo, voicingMidi } from '../js/theory/voicer.js';

const diatonic = [];
for (const t of ALL_TONICS) for (const m of ['major', 'minor']) for (let d = 1; d <= 7; d++)
  for (const e of EXTENSIONS) for (const v of ['natural', 'dominant']) diatonic.push(diatonicChord(makeKey(t, m), d, e, v));
const free = [];
for (const r of ['C', 'F#', 'Bb']) for (const q of QUALITIES) free.push(qualityChord(r, q.id));
const all = [...diatonic, ...free];

const sounding = (v) => voicingMidi(v).filter((n) => n !== null);

test('fretted span is at most 4 frets', () => {
  for (const c of all) {
    const fretted = voice(c).frets.filter((f) => f !== null && f > 0);
    if (fretted.length) assert.ok(Math.max(...fretted) - Math.min(...fretted) <= 3, chordName(c));
  }
});
test('root is the lowest sounding note', () => {
  for (const c of all) assert.equal(Math.min(...sounding(voice(c))) % 12, pitchClass(c.root), chordName(c));
});
test('only chord tones sound', () => {
  for (const c of all) {
    const pcs = chordPitchClasses(c);
    for (const n of sounding(voice(c))) assert.ok(pcs.has(n % 12), chordName(c));
  }
});
test('characteristic tones present', () => {
  let fallbacks = 0;
  for (const c of all) {
    const { voicing, usedFallback } = voiceWithInfo(c);
    const pcs = new Set(sounding(voicing).map((n) => n % 12));
    const { third, seventh, topExtension } = chordRoles(c);
    const rpc = pitchClass(c.root);
    const has = (i) => pcs.has((rpc + i) % 12);
    if (third !== null) assert.ok(has(third), `${chordName(c)} 3rd`);
    if (seventh !== null) assert.ok(has(seventh), `${chordName(c)} 7th`);
    if (topExtension !== null && !usedFallback) assert.ok(has(topExtension), `${chordName(c)} top`);
    if (usedFallback && diatonic.includes(c)) fallbacks++;
  }
  assert.equal(fallbacks, 0);
});
test('at least three notes', () => {
  for (const c of all) assert.ok(sounding(voice(c)).length >= 3, chordName(c));
});
test('deterministic', () => {
  for (const c of all.slice(0, 50)) assert.deepEqual(voice(structuredClone(c)), voice(c));
});
test('C major sits in low position', () => {
  const v = voice(qualityChord('C', 'major'));
  assert.ok(Math.max(...v.frets.filter((f) => f !== null)) <= 3, JSON.stringify(v.frets));
});
test('triads and sevenths are full enough to strum (>= 4 strings)', () => {
  for (const r of ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'F#'])
    for (const q of ['major', 'minor', 'dom7', 'maj7', 'min7']) {
      const c = qualityChord(r, q);
      assert.ok(sounding(voice(c)).length >= 4, `${chordName(c)} ${voice(c).frets}`);
    }
});
test('open C is x32010', () => assert.deepEqual(voice(qualityChord('C', 'major')).frets, [null, 3, 2, 0, 1, 0]));
