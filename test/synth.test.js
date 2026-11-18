import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pluck } from '../js/synth/karplus.js';
import { onsets, renderStrike, RenderCache, SPREAD } from '../js/synth/renderer.js';

const SR = 48000;
const C = { frets: [null, 3, 2, 0, 1, 0] };
const strike = (stroke, extra = {}) => ({ barIndex: 0, stepIndex: 0, offset: 0, stroke, accent: false, voicing: C, ring: 24000, ...extra });
const peak = (a) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const energy = (a, from, to) => { let e = 0; for (let i = from; i < to; i++) e += a[i] * a[i]; return e; };

test('pluck is deterministic and decays', () => {
  const a = pluck({ freq: 110, sr: SR, frames: SR, amp: 1, damping: 0.996, seed: 1 });
  assert.deepEqual(a, pluck({ freq: 110, sr: SR, frames: SR, amp: 1, damping: 0.996, seed: 1 }));
  assert.ok(energy(a, SR - 4800, SR) < energy(a, 0, 4800) / 4);
});
test('length equals ring for each stroke', () => {
  for (const s of ['down', 'up', 'mute', 'bass']) assert.equal(renderStrike(strike(s), SR).length, 24000, s);
});
test('audible, finite, never clips', () => {
  for (const s of ['down', 'up', 'mute', 'bass']) for (const accent of [false, true]) {
    const a = renderStrike(strike(s, { accent }), SR);
    const rms = Math.sqrt(energy(a, 0, a.length) / a.length);
    assert.ok(rms > (s === 'mute' ? 0.001 : 0.01), `${s} rms ${rms}`);
    assert.ok(a.every((x) => Number.isFinite(x) && Math.abs(x) <= 1), s);
  }
});
test('fades to zero at the end', () => {
  const a = renderStrike(strike('down'), SR);
  const f = Math.round(0.005 * SR);
  assert.equal(a[a.length - 1], 0);
  const mean = (from, to) => { let m = 0; for (let i = from; i < to; i++) m += Math.abs(a[i]); return m / (to - from); };
  assert.ok(mean(a.length - f, a.length) < mean(a.length - 2 * f, a.length - f));
});
test('down strum low to high, 15 ms apart', () => {
  assert.equal(SPREAD, 0.015);
  assert.deepEqual(onsets(strike('down'), SR), [1, 2, 3, 4, 5].map((string, i) => ({ string, frame: i * 720 })));
});
test('up strum high to low, top four strings', () => {
  assert.deepEqual(onsets(strike('up'), SR).map((o) => o.string), [5, 4, 3, 2]);
});
test('bass plays the lowest sounding string only', () => {
  assert.deepEqual(onsets(strike('bass'), SR), [{ string: 1, frame: 0 }]);
});
test('mute decays fast', () => {
  const a = renderStrike(strike('mute'), SR);
  const w = Math.round(0.06 * SR);
  assert.ok(energy(a, w, a.length) < 0.05 * energy(a, 0, w));
});
test('accent is about +6 dB', () => {
  const r = peak(renderStrike(strike('down', { accent: true }), SR)) / peak(renderStrike(strike('down'), SR));
  assert.ok(r >= 1.8 && r <= 2.2, String(r));
});
test('short ring skips strings that would start after the end', () => {
  const s = strike('down', { ring: 2000 });
  assert.ok(onsets(s, SR).every((o) => o.frame < 2000));
  assert.equal(onsets(s, SR).length, 3);
  assert.equal(renderStrike(s, SR).length, 2000);
});
test('cache returns the same buffer object', () => {
  const cache = new RenderCache(SR);
  const a = cache.get(strike('down'));
  assert.equal(cache.get(strike('down', { barIndex: 3, offset: 999 })), a);
  assert.equal(cache.size, 1);
});
