import { defaultProgression, MIN_BPM, MAX_BPM } from './rhythm/progression.js';
import { GRIDS, STROKES } from './rhythm/pattern.js';
import { parsePitch } from './theory/pitch.js';
import { isQuality, EXTENSIONS } from './theory/chord.js';

export const STORAGE_KEY = 'guitarChords.v1';

/** @typedef {{version: 1, progression: import('./rhythm/progression.js').Progression, myPatterns: import('./rhythm/pattern.js').Pattern[]}} State */

/** @returns {State} */
export const defaultState = () => ({ version: 1, progression: defaultProgression(), myPatterns: [] });

/** @param {{getItem(k: string): string|null}} storage @returns {State} */
export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (validState(s)) return s;
    }
  } catch { /* fall through to defaults */ }
  return defaultState();
}

/** @param {{setItem(k: string, v: string): void}} storage @param {State} state */
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full or blocked: keep running */ }
}

const validPitch = (name) => { try { parsePitch(name); return true; } catch { return false; } };
const validPattern = (p) => p && typeof p.id === 'string' && typeof p.name === 'string' && p.grid in GRIDS
  && Array.isArray(p.steps) && p.steps.length === GRIDS[p.grid]
  && p.steps.every((s) => s && STROKES.includes(s.stroke) && typeof s.accent === 'boolean');
const validRef = (r) => r && (r.kind === 'degree'
  ? Number.isInteger(r.degree) && r.degree >= 1 && r.degree <= 7 && EXTENSIONS.includes(r.ext) && ['natural', 'dominant'].includes(r.variant)
  : r.kind === 'fixed' && typeof r.root === 'string' && validPitch(r.root) && isQuality(r.quality));

function validState(s) {
  const p = s?.progression;
  return s.version === 1 && p && p.key && ['major', 'minor'].includes(p.key.mode)
    && p.key.tonic && validPitch(p.key.tonic.letter + (p.key.tonic.acc > 0 ? '#'.repeat(p.key.tonic.acc) : 'b'.repeat(-p.key.tonic.acc)))
    && Number.isInteger(p.bpm) && p.bpm >= MIN_BPM && p.bpm <= MAX_BPM
    && Array.isArray(p.bars) && p.bars.every((b) => b && typeof b.id === 'string' && validRef(b.chord) && validPattern(b.pattern))
    && Array.isArray(s.myPatterns) && s.myPatterns.every(validPattern);
}
