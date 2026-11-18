import { makeKey } from '../theory/key.js';
import { copyPattern, newId } from './pattern.js';
import { PRESETS } from './presets.js';

/** @typedef {{id: string, chord: import('../theory/chord.js').ChordRef, pattern: import('./pattern.js').Pattern}} Bar */
/** @typedef {{key: import('../theory/key.js').Key, bpm: number, bars: Bar[]}} Progression */

export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const clampBpm = (n) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));

/** @returns {Bar} */
export const makeBar = (chord, pattern) => ({ id: newId(), chord: structuredClone(chord), pattern: copyPattern(pattern) });

const deg = (degree, ext, variant = 'natural') => ({ kind: 'degree', degree, variant, ext });

/** @returns {Progression} */
export function defaultProgression() {
  const straight = PRESETS.find((p) => p.id === 'preset-straight8');
  return {
    key: makeKey('A', 'minor'),
    bpm: 96,
    bars: [deg(1, 9), deg(4, 9), deg(5, 7, 'dominant'), deg(1, 9)].map((r) => makeBar(r, straight)),
  };
}
