import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Transport } from '../js/audio/transport.js';
import { defaultProgression } from '../js/rhythm/progression.js';

const SR = 48000;
function fakeEngine() {
  return {
    sampleRate: SR, now: 0, scheduled: [], stopped: 0, unlocked: 0,
    async unlock() { this.unlocked++; }, nowFrame() { return this.now; },
    schedule(samples, frame) { this.scheduled.push({ len: samples.length, frame }); },
    stopAll() { this.stopped++; }, async requestWakeLock() {}, releaseWakeLock() {},
  };
}

test('play schedules the first bar right away, on exact frames', async () => {
  const e = fakeEngine(), p = defaultProgression(); // 96 BPM straight 8ths
  const t = new Transport(e, () => p, () => {});
  await t.play();
  t.stop();
  const start = Math.round(0.1 * SR);
  assert.equal(e.unlocked, 1);
  assert.equal(e.scheduled.length, 8);
  assert.deepEqual(e.scheduled.map((s) => s.frame), [0, 1, 2, 3, 4, 5, 6, 7].map((i) => start + i * 15000));
});
test('ticks schedule following bars only when due', async () => {
  const e = fakeEngine(), p = defaultProgression();
  const t = new Transport(e, () => p, () => {});
  await t.play();
  const after1 = e.scheduled.length;
  t.tick(); assert.equal(e.scheduled.length, after1);
  e.now = Math.round(0.1 * SR) + 120000 - 60000; // half a bar before bar 2
  t.tick(); assert.equal(e.scheduled.length, after1 + 8);
  t.stop();
});
test('edits apply from the next unscheduled bar', async () => {
  const e = fakeEngine(), p = defaultProgression();
  const t = new Transport(e, () => p, () => {});
  await t.play();
  p.bpm = 120;
  e.now = Math.round(0.1 * SR) + 120000 - 48000; // half a 120-BPM bar before bar 2
  t.tick();
  t.stop();
  const bar2 = e.scheduled.slice(8);
  assert.equal(bar2[0].frame, Math.round(0.1 * SR) + 120000);
  assert.equal(bar2[1].frame - bar2[0].frame, 12000);
});
test('play does nothing with no bars', async () => {
  const e = fakeEngine(), p = defaultProgression();
  p.bars = [];
  const t = new Transport(e, () => p, () => {});
  await t.play();
  assert.equal(t.isPlaying, false);
  assert.equal(e.scheduled.length, 0);
});
test('stop silences and resets the playhead', async () => {
  const e = fakeEngine(), p = defaultProgression();
  const heads = [];
  const t = new Transport(e, () => p, (h) => heads.push(h));
  await t.play();
  t.stop();
  assert.equal(e.stopped, 1);
  assert.equal(t.isPlaying, false);
  assert.equal(heads.at(-1), null);
});
