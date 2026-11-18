import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../js/actions.js';
import { defaultState } from '../js/store.js';
import { PRESETS } from '../js/rhythm/presets.js';
import { makeKey } from '../js/theory/key.js';

const ids = (s) => s.progression.bars.map((b) => b.id);

test('add bar duplicates the last bar with a fresh id', () => {
  const s = defaultState(); const last = s.progression.bars.at(-1);
  A.addBar(s);
  const added = s.progression.bars.at(-1);
  assert.equal(s.progression.bars.length, 5);
  assert.notEqual(added.id, last.id);
  assert.deepEqual(added.chord, last.chord);
  added.pattern.steps[0].stroke = 'rest';
  assert.equal(last.pattern.steps[0].stroke, 'down');
});
test('add bar to an empty progression uses the default first bar', () => {
  const s = defaultState(); s.progression.bars = [];
  A.addBar(s);
  assert.equal(s.progression.bars.length, 1);
});
test('duplicate inserts right after', () => {
  const s = defaultState(); const [a, b] = ids(s);
  A.duplicateBar(s, a);
  assert.equal(ids(s)[0], a); assert.equal(ids(s)[2], b); assert.equal(s.progression.bars.length, 5);
});
test('delete and move', () => {
  const s = defaultState(); const [a, b, c, d] = ids(s);
  A.moveBar(s, a, 1); assert.deepEqual(ids(s), [b, a, c, d]);
  A.moveBar(s, b, -1); assert.deepEqual(ids(s), [b, a, c, d]);
  A.deleteBar(s, c); assert.deepEqual(ids(s), [b, a, d]);
});
test('set chord, key and bpm', () => {
  const s = defaultState(); const [a] = ids(s);
  A.setChord(s, a, { kind: 'fixed', root: 'D', quality: 'min9' });
  assert.deepEqual(s.progression.bars[0].chord, { kind: 'fixed', root: 'D', quality: 'min9' });
  A.setKey(s, 'E', 'major');
  assert.deepEqual(s.progression.key, makeKey('E', 'major'));
  A.setBpm(s, 999); assert.equal(s.progression.bpm, 240);
});
test('pattern edits stay inside one bar', () => {
  const s = defaultState(); const [a, b] = ids(s);
  A.setPattern(s, a, PRESETS[0]);
  assert.equal(s.progression.bars[0].pattern.grid, 'sixteenths');
  assert.notEqual(s.progression.bars[0].pattern.id, PRESETS[0].id);
  A.cycleStep(s, b, 0); assert.equal(s.progression.bars[1].pattern.steps[0].stroke, 'up');
  A.toggleAccent(s, b, 0); assert.equal(s.progression.bars[1].pattern.steps[0].accent, true);
  assert.equal(s.progression.bars[2].pattern.steps[0].stroke, 'down');
  assert.equal(PRESETS[0].steps[1].stroke, 'rest');
});
test('my patterns: save, apply to all, delete', () => {
  const s = defaultState(); const [a] = ids(s);
  A.setPattern(s, a, PRESETS[1]);
  const saved = A.saveAsMyPattern(s, a, 'Mine');
  assert.equal(s.myPatterns.length, 1);
  assert.equal(saved.name, 'Mine');
  assert.notEqual(saved.id, s.progression.bars[0].pattern.id);
  A.applyPatternToAll(s, a);
  assert.ok(s.progression.bars.every((b) => b.pattern.grid === 'eighths' && b.pattern.steps[0].stroke === 'bass'));
  assert.equal(new Set(s.progression.bars.map((b) => b.pattern.id)).size, 4);
  A.deleteMyPattern(s, saved.id);
  assert.equal(s.myPatterns.length, 0);
  assert.equal(s.progression.bars[0].pattern.steps[0].stroke, 'bass');
});
test('roman numerals', () => {
  const C = makeKey('C', 'major'), Am = makeKey('A', 'minor');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => A.degreeLabel(C, d)), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((d) => A.degreeLabel(Am, d)), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  assert.equal(A.degreeLabel(Am, 5, 'dominant'), 'V');
});
