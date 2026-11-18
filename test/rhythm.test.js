import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRIDS, nextStroke, parsePattern, blankPattern, copyPattern } from '../js/rhythm/pattern.js';
import { PRESETS } from '../js/rhythm/presets.js';
import { clampBpm, makeBar, defaultProgression } from '../js/rhythm/progression.js';

test('grid step counts', () => assert.deepEqual(GRIDS, { eighths: 8, sixteenths: 16, triplets: 12, sextuplets: 24 }));
test('stroke cycle', () => {
  assert.deepEqual(['down', 'up', 'mute', 'bass', 'rest'].map(nextStroke), ['up', 'mute', 'bass', 'rest', 'down']);
});
test('notation parsing with accent', () => {
  const p = parsePattern('t', 'eighths', '>D.DU.UDU');
  assert.equal(p.steps.length, 8);
  assert.deepEqual(p.steps[0], { stroke: 'down', accent: true });
  assert.deepEqual(p.steps[1], { stroke: 'rest', accent: false });
});
test('wrong step count throws', () => assert.throws(() => parsePattern('t', 'eighths', 'DDD')));
test('blank pattern', () => {
  const p = blankPattern('triplets');
  assert.equal(p.steps.length, 12);
  assert.equal(p.steps[0].stroke, 'down');
  assert.ok(p.steps.slice(1).every((s) => s.stroke === 'rest'));
});
test('presets are valid', () => {
  for (const p of PRESETS) assert.equal(p.steps.length, GRIDS[p.grid], p.name);
  const byId = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
  const funky = byId['preset-funky'], country = byId['preset-country'];
  assert.equal(funky.grid, 'sixteenths');
  assert.ok(funky.steps.some((s) => s.stroke === 'mute'));
  assert.ok(funky.steps.some((s) => s.accent));
  assert.equal(country.grid, 'eighths');
  assert.equal(country.steps[0].stroke, 'bass');
  assert.equal(country.steps[4].stroke, 'bass');
  assert.equal(byId['preset-shuffle'].grid, 'triplets');
  assert.ok(byId['preset-straight8']);
});
test('bpm clamped', () => {
  assert.equal(clampBpm(10), 40);
  assert.equal(clampBpm(300), 240);
  assert.equal(clampBpm(96.4), 96);
});
test('copy has new id', () => {
  const p = PRESETS[0];
  const c = copyPattern(p, 'mine');
  assert.notEqual(c.id, p.id);
  assert.equal(c.name, 'mine');
  assert.deepEqual(c.steps, p.steps);
});
test('makeBar copies the pattern', () => {
  const src = parsePattern('t', 'eighths', 'DDDDDDDD');
  const bar = makeBar({ kind: 'fixed', root: 'C', quality: 'major' }, src);
  src.steps[0].stroke = 'rest';
  assert.equal(bar.pattern.steps[0].stroke, 'down');
});
test('default progression survives JSON', () => {
  const p = defaultProgression();
  assert.equal(p.bpm, 96);
  assert.equal(p.bars.length, 4);
  assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
});
