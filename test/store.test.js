import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, defaultState, loadState, saveState } from '../js/store.js';
import { PRESETS } from '../js/rhythm/presets.js';
import { copyPattern } from '../js/rhythm/pattern.js';

const fake = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; };
const sameShape = (s) => { assert.equal(s.version, 1); assert.equal(s.progression.bars.length, 4); assert.deepEqual(s.myPatterns, []); };

test('round trip', () => {
  const st = fake(), s = defaultState();
  s.progression.bpm = 133;
  saveState(st, s);
  assert.deepEqual(loadState(st), s);
});
test('missing key gives defaults', () => sameShape(loadState(fake())));
test('corrupt JSON gives defaults', () => sameShape(loadState(fake({ [STORAGE_KEY]: '{not json' }))));
test('wrong shape gives defaults', () => {
  sameShape(loadState(fake({ [STORAGE_KEY]: JSON.stringify({ version: 1, progression: {}, myPatterns: [] }) })));
  const s = defaultState();
  s.progression.bars[0].pattern.steps.pop();
  sameShape(loadState(fake({ [STORAGE_KEY]: JSON.stringify(s) })));
  const t = defaultState();
  t.progression.bars[0].chord = { kind: 'fixed', root: 'H', quality: 'major' };
  sameShape(loadState(fake({ [STORAGE_KEY]: JSON.stringify(t) })));
});
test('throwing storage gives defaults', () => sameShape(loadState({ getItem() { throw new Error('denied'); } })));
test('my patterns persist', () => {
  const st = fake(), s = defaultState();
  s.myPatterns.push(copyPattern(PRESETS[0], 'Mine'));
  saveState(st, s);
  assert.equal(loadState(st).myPatterns[0].name, 'Mine');
});
test('saving never throws', () => assert.doesNotThrow(() => saveState({ setItem() { throw new Error('quota'); } }, defaultState())));
