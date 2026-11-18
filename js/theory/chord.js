import { parsePitch, pitchClass, pitchName } from './pitch.js';
import { scale } from './key.js';

/** @typedef {import('./pitch.js').Pitch} Pitch */
/** @typedef {import('./key.js').Key} Key */
/** @typedef {{root: Pitch, intervals: number[], symbol?: string}} Chord  intervals: semitones above root, sorted, unique, includes 0 */
/** @typedef {{kind: 'degree', degree: number, variant: 'natural'|'dominant', ext: number} | {kind: 'fixed', root: string, quality: string}} ChordRef */

export const EXTENSIONS = [3, 7, 9, 11, 13];

export const QUALITIES = [
  { id: 'major', symbol: '', intervals: [0, 4, 7] },
  { id: 'minor', symbol: 'm', intervals: [0, 3, 7] },
  { id: 'dim', symbol: 'dim', intervals: [0, 3, 6] },
  { id: 'aug', symbol: 'aug', intervals: [0, 4, 8] },
  { id: 'sus2', symbol: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', symbol: 'sus4', intervals: [0, 5, 7] },
  { id: 'add9', symbol: 'add9', intervals: [0, 4, 7, 14] },
  { id: 'six', symbol: '6', intervals: [0, 4, 7, 9] },
  { id: 'minor6', symbol: 'm6', intervals: [0, 3, 7, 9] },
  { id: 'dom7', symbol: '7', intervals: [0, 4, 7, 10] },
  { id: 'maj7', symbol: 'maj7', intervals: [0, 4, 7, 11] },
  { id: 'min7', symbol: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'min7b5', symbol: 'm7b5', intervals: [0, 3, 6, 10] },
  { id: 'dim7', symbol: 'dim7', intervals: [0, 3, 6, 9] },
  { id: 'sevenSus4', symbol: '7sus4', intervals: [0, 5, 7, 10] },
  { id: 'dom9', symbol: '9', intervals: [0, 4, 7, 10, 14] },
  { id: 'maj9', symbol: 'maj9', intervals: [0, 4, 7, 11, 14] },
  { id: 'min9', symbol: 'm9', intervals: [0, 3, 7, 10, 14] },
  { id: 'min11', symbol: 'm11', intervals: [0, 3, 7, 10, 14, 17] },
  { id: 'dom13', symbol: '13', intervals: [0, 4, 7, 10, 14, 21] },
  { id: 'maj13', symbol: 'maj13', intervals: [0, 4, 7, 11, 14, 21] },
  { id: 'min13', symbol: 'm13', intervals: [0, 3, 7, 10, 14, 17, 21] },
];
const QUALITY_BY_ID = Object.fromEntries(QUALITIES.map((q) => [q.id, q]));

const BASES = {
  '4,7,': '', '3,7,': 'm', '3,6,': 'dim', '4,8,': 'aug',
  '4,7,11': 'maj7', '4,7,10': '7', '3,7,10': 'm7', '3,6,10': 'm7b5', '3,6,9': 'dim7', '3,7,11': 'm(maj7)',
};
const TENSION_NAMES = { 13: 'b9', 14: '9', 15: '#9', 17: '11', 18: '#11', 20: 'b13', 21: '13' };
const NATURALS = new Set([14, 17, 21]);

/** @param {Chord} chord */
export function chordSymbol(chord) {
  if (chord.symbol !== undefined) return chord.symbol;
  const iv = new Set(chord.intervals);
  const third = iv.has(4) ? 4 : iv.has(3) ? 3 : '';
  const fifth = iv.has(7) ? 7 : iv.has(6) ? 6 : iv.has(8) ? 8 : '';
  const seventh = iv.has(11) ? 11 : iv.has(10) ? 10 : third === 3 && fifth === 6 && iv.has(9) ? 9 : '';
  let base = BASES[`${third},${fifth},${seventh}`] ?? '?';

  const absorbable = ['maj7', '7', 'm7'].includes(base);
  let absorbed = [];
  if (absorbable && iv.has(14)) {
    if (iv.has(21)) absorbed = [14, 17, 21];
    else if (iv.has(17)) absorbed = [14, 17];
    else absorbed = [14];
    const top = absorbed[absorbed.length - 1];
    base = base.slice(0, -1) + { 14: '9', 17: '11', 21: '13' }[top];
  }
  const rest = chord.intervals.filter((i) => i >= 13 && !absorbed.includes(i));
  if (!rest.length) return base;
  const names = rest.map((i) => TENSION_NAMES[i]);
  return rest.some((i) => NATURALS.has(i)) ? `${base}(${names.join(',')})` : base + names.join('');
}

/** @param {Chord} chord */
export const chordName = (chord) => pitchName(chord.root) + chordSymbol(chord);

/** @param {Chord} chord */
export const chordPitchClasses = (chord) =>
  new Set(chord.intervals.map((i) => (pitchClass(chord.root) + i) % 12));

/** @param {Chord} chord */
export function chordRoles(chord) {
  const iv = new Set(chord.intervals);
  const third = iv.has(4) ? 4 : iv.has(3) ? 3 : null;
  const seventh = iv.has(11) ? 11 : iv.has(10) ? 10 : iv.has(3) && iv.has(6) && iv.has(9) ? 9 : null;
  const top = Math.max(...chord.intervals);
  return { third, seventh, topExtension: top >= 13 ? top : null };
}

/**
 * @param {Key} key @param {number} degree 1..7 @param {number} ext one of EXTENSIONS
 * @param {'natural'|'dominant'} variant only affects degree 5 in minor keys
 * @returns {Chord}
 */
export function diatonicChord(key, degree, ext, variant = 'natural') {
  const notes = scale(key);
  if (key.mode === 'minor' && degree === 5 && variant === 'dominant') {
    notes[6] = { ...notes[6], acc: notes[6].acc + 1 };
  }
  const count = { 3: 3, 7: 4, 9: 5, 11: 6, 13: 7 }[ext];
  const root = notes[degree - 1];
  const rootPc = pitchClass(root);
  let intervals = [];
  for (let n = 0; n < count; n++) {
    const offset = n * 2;
    const p = notes[(degree - 1 + offset) % 7];
    intervals.push(((pitchClass(p) - rootPc + 12) % 12) + (offset >= 7 ? 12 : 0));
  }
  const iv = new Set(intervals);
  if (iv.has(4) && iv.has(17)) {
    intervals = iv.has(11) ? intervals.map((i) => (i === 17 ? 18 : i)) : intervals.filter((i) => i !== 17);
  }
  return { root, intervals: [...new Set(intervals)].sort((a, b) => a - b) };
}

/** @param {string} rootName @param {string} qualityId @returns {Chord} */
export function qualityChord(rootName, qualityId) {
  const q = QUALITY_BY_ID[qualityId];
  if (!q) throw new Error(`Unknown quality: ${qualityId}`);
  return { root: parsePitch(rootName), intervals: [...q.intervals], symbol: q.symbol };
}

export const isQuality = (id) => id in QUALITY_BY_ID;

/** @param {ChordRef} ref @param {Key} key @returns {Chord} */
export function resolveRef(ref, key) {
  return ref.kind === 'degree'
    ? diatonicChord(key, ref.degree, ref.ext, ref.variant)
    : qualityChord(ref.root, ref.quality);
}
