import { test } from 'node:test';
import assert from 'node:assert/strict';
import { barFrames, stepOffset, planBar, MAX_RING_SECONDS } from '../js/playback/timing.js';
import { GRIDS, parsePattern } from '../js/rhythm/pattern.js';
import { makeKey } from '../js/theory/key.js';

const SR = 48000;
const C = { kind: 'fixed', root: 'C', quality: 'major' };
const prog = (bpm, ...notations) => ({
  key: makeKey('C', 'major'), bpm,
  bars: notations.map((n, i) => ({ id: `b${i}`, chord: C, pattern: parsePattern('t', n.replace(/>/g, '').length === 8 ? 'eighths' : 'sixteenths', n) })),
});

test('bar frames', () => {
  assert.equal(barFrames(120, SR), 96000);
  assert.equal(barFrames(96, SR), 120000);
});
test('step offsets exact, strictly increasing, no drift', () => {
  const bf = barFrames(97, SR);
  for (const steps of Object.values(GRIDS)) {
    assert.equal(stepOffset(steps, steps, bf), bf);
    for (let i = 1; i <= steps; i++) assert.ok(stepOffset(i, steps, bf) > stepOffset(i - 1, steps, bf));
  }
});
test('rest extends ring', () => {
  const s = planBar(0, prog(120, 'D...D...'), SR);
  assert.equal(s.length, 2);
  assert.deepEqual(s.map((x) => x.ring), [48000, 48000]);
  assert.deepEqual(s.map((x) => x.offset), [0, 48000]);
});
test('ring wraps around the loop and is capped', () => {
  assert.equal(planBar(0, prog(120, 'D.......'), SR)[0].ring, 96000);
  assert.equal(planBar(0, prog(60, 'D.......'), SR)[0].ring, MAX_RING_SECONDS * SR);
});
test('ring crosses bar line', () => {
  const s = planBar(0, prog(120, 'D.......', '....D...'), SR);
  assert.equal(s[0].ring, 96000);
});
test('mute cuts ring', () => assert.equal(planBar(0, prog(120, 'DX......'), SR)[0].ring, 12000));
test('all-rest progression plans nothing', () => {
  const p = prog(120, '........', '........');
  assert.deepEqual(planBar(0, p, SR), []);
  assert.deepEqual(planBar(1, p, SR), []);
});
test('lone strike among rest bars terminates at the cap', () => {
  const p = prog(40, 'D.......', ...Array(50).fill('........'));
  const t = performance.now();
  assert.equal(planBar(0, p, SR)[0].ring, MAX_RING_SECONDS * SR);
  assert.ok(performance.now() - t < 50);
});
test('strikes carry voicing and never rest', () => {
  const s = planBar(0, prog(120, '>DUXB....'), SR);
  assert.ok(s.every((x) => x.stroke !== 'rest' && Array.isArray(x.voicing.frets)));
  assert.equal(s[0].accent, true);
  assert.deepEqual(s.map((x) => x.stroke), ['down', 'up', 'mute', 'bass']);
});
