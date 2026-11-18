import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Transport } from '../js/audio/transport.js';
import { RenderCache, MAX_CACHE_SECONDS } from '../js/synth/renderer.js';
import { defaultProgression } from '../js/rhythm/progression.js';
import { MINOR_TONICS, ALL_TONICS, makeKey, scale } from '../js/theory/key.js';
import { pitchName } from '../js/theory/pitch.js';

const SR = 48000;
const engine = (extra = {}) => ({
  sampleRate: SR, now: 0, scheduled: [], intervals: 0,
  async unlock() {}, nowFrame() { return this.now; },
  schedule(samples, frame) { this.scheduled.push({ frame, now: this.now }); },
  stopAll() {}, ...extra,
});

test('double tap on Play while starting schedules the first bar once', async () => {
  const e = engine({ async unlock() { await new Promise((r) => setTimeout(r, 30)); } });
  const p = defaultProgression();
  const t = new Transport(e, () => p, () => {});
  await Promise.all([t.play(), t.play()]);
  t.stop();
  assert.equal(e.scheduled.length, 8);
  assert.equal(t.timer, null);
});

test('first bar is rendered before its start time is chosen, so it is never late', async () => {
  const e = engine();
  const orig = RenderCache.prototype.get;
  RenderCache.prototype.get = function (s) { e.now += 3000; return orig.call(this, s); }; // slow device
  try {
    const t = new Transport(e, () => defaultProgression(), () => {});
    await t.play();
    t.stop();
  } finally { RenderCache.prototype.get = orig; }
  for (const s of e.scheduled) assert.ok(s.frame >= s.now, `scheduled at ${s.frame} but now was ${s.now}`);
});

test('render cache is bounded by total audio length', () => {
  const c = new RenderCache(SR);
  const v = { frets: [null, 3, 2, 0, 1, 0] };
  for (let i = 0; i < 80; i++) c.get({ stroke: 'down', accent: false, voicing: v, ring: 2 * SR - i });
  assert.ok(c.totalFrames <= MAX_CACHE_SECONDS * SR, String(c.totalFrames));
  const last = { stroke: 'down', accent: false, voicing: v, ring: 2 * SR - 79 };
  assert.equal(c.get(last), c.get(last));
});

test('ids work without crypto.randomUUID (plain http)', async () => {
  const saved = globalThis.crypto.randomUUID;
  Object.defineProperty(globalThis.crypto, 'randomUUID', { value: undefined, configurable: true });
  try {
    const { newId } = await import('../js/rhythm/pattern.js?nouuid');
    const a = newId(), b = newId();
    assert.equal(typeof a, 'string');
    assert.notEqual(a, b);
  } finally { Object.defineProperty(globalThis.crypto, 'randomUUID', { value: saved, configurable: true }); }
});

test('minor keys are offered with guitarist spellings (C# and G# minor)', () => {
  assert.ok(MINOR_TONICS.includes('C#') && MINOR_TONICS.includes('G#'));
  assert.ok(!MINOR_TONICS.includes('Db') && !MINOR_TONICS.includes('Ab'));
  assert.equal(MINOR_TONICS.length, 12);
  assert.deepEqual(scale(makeKey('C#', 'minor')).map(pitchName), ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B']);
  assert.equal(ALL_TONICS.length, 12);
});
