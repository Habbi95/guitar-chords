/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Karplus-Strong plucked string.
 * @param {{freq: number, sr: number, frames: number, amp: number, damping: number, seed: number}} o
 * @returns {Float32Array}
 */
export function pluck({ freq, sr, frames, amp, damping, seed }) {
  const n = Math.max(2, Math.round(sr / freq));
  const rand = mulberry32(seed);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) buf[i] = (rand() * 2 - 1) * amp;
  const out = new Float32Array(frames);
  let idx = 0;
  for (let i = 0; i < frames; i++) {
    const next = (idx + 1) % n;
    out[i] = buf[idx];
    buf[idx] = damping * 0.5 * (buf[idx] + buf[next]);
    idx = next;
  }
  return out;
}
