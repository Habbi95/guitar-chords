import { pluck, mulberry32 } from './karplus.js';
import { TUNING, soundingStrings } from '../theory/voicer.js';

/** @typedef {import('../playback/timing.js').Strike} Strike */

export const SPREAD = 0.015;
export const FADE = 0.005;
export const MUTE_SPREAD = 0.005;
const PEAK = 0.35;
const UP_GAIN = 0.8;
const ACCENT_GAIN = 2;
const DAMPING = 0.996;
const MUTE_DAMPING = 0.5;
const MUTE_NOISE_SECONDS = 0.02;

const midiFreq = (m) => 440 * 2 ** ((m - 69) / 12);

/** Per-string onsets (frames) of a strike, dropping strings that would start after the buffer ends. */
export function onsets(strike, sr) {
  const strings = soundingStrings(strike.voicing);
  let order;
  if (strike.stroke === 'bass') order = strings.slice(0, 1);
  else if (strike.stroke === 'up') order = strings.slice(-4).reverse();
  else order = strings;
  const gap = Math.round((strike.stroke === 'mute' ? MUTE_SPREAD : SPREAD) * sr);
  return order.map((string, i) => ({ string, frame: i * gap })).filter((o) => o.frame < strike.ring);
}

/** @param {Strike} strike @param {number} sr @returns {Float32Array} */
export function renderStrike(strike, sr) {
  const len = strike.ring;
  const out = new Float32Array(len);
  const mute = strike.stroke === 'mute';
  for (const { string, frame } of onsets(strike, sr)) {
    const midi = TUNING[string] + strike.voicing.frets[string];
    const s = pluck({ freq: midiFreq(midi), sr, frames: len - frame, amp: 1, damping: mute ? MUTE_DAMPING : DAMPING, seed: string + 1 });
    for (let i = 0; i < s.length; i++) out[frame + i] += s[i];
  }
  if (mute) {
    const rand = mulberry32(99);
    const n = Math.min(len, Math.round(MUTE_NOISE_SECONDS * sr));
    for (let i = 0; i < n; i++) out[i] += (rand() * 2 - 1) * 0.6 * (1 - i / n) ** 2;
  }
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(out[i]));
  const target = PEAK * (strike.stroke === 'up' ? UP_GAIN : 1) * (strike.accent ? ACCENT_GAIN : 1);
  const g = peak > 0 ? target / peak : 0;
  const fade = Math.min(len, Math.round(FADE * sr));
  for (let i = 0; i < len; i++) {
    let v = out[i] * g;
    const fromEnd = len - 1 - i;
    if (fromEnd < fade) v *= fromEnd / fade;
    out[i] = Math.max(-1, Math.min(1, v));
  }
  return out;
}

/** Cache key: what changes the sound, not where it plays. */
export const strikeKey = (s) => `${s.voicing.frets.join(',')}|${s.stroke}|${s.accent ? 1 : 0}|${s.ring}`;

export class RenderCache {
  constructor(sr) { this.sr = sr; this.map = new Map(); }
  /** @param {Strike} strike */
  get(strike) {
    const k = strikeKey(strike);
    let buf = this.map.get(k);
    if (!buf) {
      if (this.map.size > 400) this.map.clear();
      buf = renderStrike(strike, this.sr);
      this.map.set(k, buf);
    }
    return buf;
  }
  get size() { return this.map.size; }
}
