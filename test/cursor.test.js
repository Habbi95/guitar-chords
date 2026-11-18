import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackCursor, PlayheadTracker } from '../js/playback/cursor.js';
import { defaultProgression } from '../js/rhythm/progression.js';

const SR = 48000;
const prog = (n, bpm = 120) => { const p = defaultProgression(); p.bars = p.bars.slice(0, n); p.bpm = bpm; return p; };

test('take advances and wraps', () => {
  const c = new PlaybackCursor(1000), p = prog(3);
  const got = [0, 1, 2, 3].map(() => c.take(p, SR));
  assert.deepEqual(got.map((g) => g.barIndex), [0, 1, 2, 0]);
  assert.deepEqual(got.map((g) => g.start), [1000, 97000, 193000, 289000]);
});
test('tempo change applies to the next bar', () => {
  const c = new PlaybackCursor(0), p = prog(3);
  c.take(p, SR);
  p.bpm = 60;
  assert.deepEqual(c.take(p, SR), { barIndex: 1, start: 96000, barFrames: 192000 });
});
test('index past the end wraps after bars are deleted', () => {
  const c = new PlaybackCursor(0), p = prog(3);
  c.take(p, SR); c.take(p, SR);
  p.bars = p.bars.slice(0, 1);
  assert.equal(c.take(p, SR).barIndex, 0);
});
test('empty progression returns null', () => {
  assert.equal(new PlaybackCursor(0).take(prog(0), SR), null);
  assert.equal(new PlaybackCursor(0).isDue(0, prog(0), SR), false);
});
test('lookahead is half a bar, at least 200 ms', () => {
  const c = new PlaybackCursor(0), p = prog(2);
  c.take(p, SR);
  assert.equal(c.isDue(47999, p, SR), false);
  assert.equal(c.isDue(48000, p, SR), true);
  assert.equal(PlaybackCursor.lookahead(10000, SR), 9600);
});
test('playhead position', () => {
  const t = new PlayheadTracker();
  t.record(0, 0, 96000, 16);
  assert.deepEqual(t.position(6000), { bar: 0, step: 1 });
  assert.equal(t.position(-1), null);
  t.record(1, 96000, 96000, 8);
  assert.deepEqual(t.position(96000 + 12000), { bar: 1, step: 1 });
  t.reset();
  assert.equal(t.position(6000), null);
});
