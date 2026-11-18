import { makeBar, defaultProgression, clampBpm } from './rhythm/progression.js';
import { copyPattern, nextStroke, newId } from './rhythm/pattern.js';
import { makeKey } from './theory/key.js';

/** All state changes. Each mutates `state` (the app re-renders and saves afterwards). */

const bars = (s) => s.progression.bars;
const find = (s, id) => bars(s).findIndex((b) => b.id === id);
const bar = (s, id) => bars(s)[find(s, id)];

export function addBar(s) {
  const src = bars(s).at(-1) ?? defaultProgression().bars[0];
  bars(s).push(makeBar(src.chord, src.pattern));
}
export function duplicateBar(s, id) {
  const i = find(s, id);
  if (i >= 0) bars(s).splice(i + 1, 0, makeBar(bars(s)[i].chord, bars(s)[i].pattern));
}
export function deleteBar(s, id) {
  const i = find(s, id);
  if (i >= 0) bars(s).splice(i, 1);
}
export function moveBar(s, id, delta) {
  const i = find(s, id), j = i + delta;
  if (i < 0 || j < 0 || j >= bars(s).length) return;
  const [b] = bars(s).splice(i, 1);
  bars(s).splice(j, 0, b);
}
export const setChord = (s, id, ref) => { bar(s, id).chord = structuredClone(ref); };
export const setKey = (s, tonic, mode) => { s.progression.key = makeKey(tonic, mode); };
export const setBpm = (s, n) => { s.progression.bpm = clampBpm(n); };
export const setPattern = (s, id, pattern) => { bar(s, id).pattern = copyPattern(pattern); };
export function cycleStep(s, id, i) {
  const st = bar(s, id).pattern.steps[i];
  st.stroke = nextStroke(st.stroke);
}
export function toggleAccent(s, id, i) {
  const st = bar(s, id).pattern.steps[i];
  st.accent = !st.accent;
}
export function saveAsMyPattern(s, id, name) {
  const p = copyPattern(bar(s, id).pattern, name);
  s.myPatterns.push(p);
  return p;
}
export const deleteMyPattern = (s, patternId) => { s.myPatterns = s.myPatterns.filter((p) => p.id !== patternId); };
export function applyPatternToAll(s, id) {
  const p = bar(s, id).pattern;
  for (const b of bars(s)) if (b.id !== id) b.pattern = { ...copyPattern(p), id: newId() };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const QUALITY = { major: ['M', 'm', 'm', 'M', 'M', 'm', 'd'], minor: ['m', 'd', 'M', 'm', 'm', 'M', 'M'] };
/** Roman numeral for a degree in a key; the minor-key dominant V is upper case. */
export function degreeLabel(key, degree, variant = 'natural') {
  let q = QUALITY[key.mode][degree - 1];
  if (key.mode === 'minor' && degree === 5 && variant === 'dominant') q = 'M';
  const r = ROMAN[degree - 1];
  return q === 'M' ? r : q === 'm' ? r.toLowerCase() : `${r.toLowerCase()}°`;
}
