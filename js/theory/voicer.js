import { pitchClass } from './pitch.js';
import { chordName, chordPitchClasses, chordRoles } from './chord.js';

/** @typedef {import('./chord.js').Chord} Chord */
/** @typedef {{frets: (number|null)[]}} Voicing  6 strings, index 0 = low E, null = muted */

export const TUNING = [40, 45, 50, 55, 59, 64];

const cache = new Map();

/** @param {Voicing} v */
export const voicingMidi = (v) => v.frets.map((f, s) => (f === null ? null : TUNING[s] + f));

/** @param {Voicing} v */
export const soundingStrings = (v) => v.frets.flatMap((f, s) => (f === null ? [] : [s]));

/** @param {Chord} chord @returns {Voicing} */
export const voice = (chord) => voiceWithInfo(chord).voicing;

/** @param {Chord} chord @returns {{voicing: Voicing, usedFallback: boolean}} */
export function voiceWithInfo(chord) {
  const key = chordName(chord) + '|' + chord.intervals.join(',');
  if (!cache.has(key)) {
    const roles = chordRoles(chord);
    const rpc = pitchClass(chord.root);
    const required = [0, roles.third, roles.seventh, roles.topExtension]
      .filter((i) => i !== null).map((i) => (rpc + i) % 12);
    let best = search(chord, required);
    let usedFallback = false;
    if (!best && roles.topExtension !== null) {
      usedFallback = true;
      const withoutTop = (rpc + roles.topExtension) % 12;
      best = search(chord, required.filter((pc) => pc !== withoutTop));
    }
    if (!best) throw new Error(`No voicing for ${chordName(chord)}`);
    cache.set(key, { voicing: { frets: best }, usedFallback });
  }
  const hit = cache.get(key);
  return { voicing: { frets: [...hit.voicing.frets] }, usedFallback: hit.usedFallback };
}

const fretsKey = (frets) => frets.map((f) => (f === null ? -1 : f));
function lexLess(a, b) {
  const x = fretsKey(a), y = fretsKey(b);
  for (let i = 0; i < 6; i++) if (x[i] !== y[i]) return x[i] < y[i];
  return false;
}

/** Exhaustive search over root-position shapes; returns frets or null. */
function search(chord, requiredPcs) {
  const pcs = chordPitchClasses(chord);
  const rpc = pitchClass(chord.root);
  const fifthPc = (rpc + 7) % 12;
  const manyTones = chord.intervals.length >= 5;
  let best = null, bestScore = Infinity;

  for (let b = 0; b <= 2; b++) {
    for (let bf = 0; bf <= 12; bf++) {
      if ((TUNING[b] + bf) % 12 !== rpc) continue;
      const bassMidi = TUNING[b] + bf;
      for (let w = Math.max(1, bf - 3); w <= Math.max(1, bf); w++) {
        const frets = Array(6).fill(null);
        frets[b] = bf;
        const walk = (s) => {
          if (s === 6) {
            const sc = score(frets);
            if (sc !== null && (sc < bestScore || (sc === bestScore && lexLess(frets, best)))) {
              best = [...frets]; bestScore = sc;
            }
            return;
          }
          const options = [null];
          for (let f = 0; f <= w + 3; f++) {
            if (f !== 0 && f < w) continue;
            const midi = TUNING[s] + f;
            if (midi > bassMidi && pcs.has(midi % 12)) options.push(f);
          }
          for (const o of options) { frets[s] = o; walk(s + 1); }
          frets[s] = null;
        };
        walk(b + 1);
      }
    }
  }
  return best;

  function score(frets) {
    const sounding = frets.flatMap((f, s) => (f === null ? [] : [s]));
    if (sounding.length < 3) return null;
    const notes = sounding.map((s) => (TUNING[s] + frets[s]) % 12);
    const present = new Set(notes);
    if (!requiredPcs.every((pc) => present.has(pc))) return null;
    const top = sounding[sounding.length - 1];
    let interiorMutes = 0;
    for (let s = sounding[0]; s <= top; s++) if (frets[s] === null) interiorMutes++;
    if (interiorMutes > 1) return null;
    const fretted = frets.filter((f) => f !== null && f > 0);
    const base = fretted.length ? Math.min(...fretted) : 0;
    if (fretted.length && Math.max(...fretted) - base > 3) return null;
    const extraRoots = Math.max(0, notes.filter((pc) => pc === rpc).length - 2);
    return 3 * extraRoots
      + (manyTones && present.has(fifthPc) ? 2 : 0)
      + 1.5 * interiorMutes
      + 0.2 * base
      - 0.5 * present.size
      - 0.6 * sounding.length;
  }
}
