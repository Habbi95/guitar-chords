/** @typedef {'down'|'up'|'mute'|'bass'|'rest'} Stroke */
/** @typedef {{stroke: Stroke, accent: boolean}} Step */
/** @typedef {{id: string, name: string, grid: string, steps: Step[]}} Pattern */

export const GRIDS = { eighths: 8, sixteenths: 16, triplets: 12, sextuplets: 24 };
export const GRID_LABELS = { eighths: '8ths', sixteenths: '16ths', triplets: 'Triplets', sextuplets: 'Sextuplets' };
export const STROKES = ['down', 'up', 'mute', 'bass', 'rest'];
export const GLYPH = { down: '↓', up: '↑', mute: '✕', bass: 'B', rest: '·' };
const CHAR = { D: 'down', U: 'up', X: 'mute', B: 'bass', '.': 'rest' };

export const nextStroke = (s) => STROKES[(STROKES.indexOf(s) + 1) % STROKES.length];

let counter = 0;
/** Unique id; randomUUID only exists on https/localhost, so fall back elsewhere. */
export const newId = () => (typeof globalThis.crypto?.randomUUID === 'function'
  ? globalThis.crypto.randomUUID()
  : `id-${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

/** @returns {Pattern} */
export function parsePattern(name, grid, notation, id = newId()) {
  const steps = [];
  let accent = false;
  for (const ch of notation) {
    if (ch === '>') { accent = true; continue; }
    if (!(ch in CHAR)) throw new Error(`Bad notation char: ${ch}`);
    steps.push({ stroke: CHAR[ch], accent });
    accent = false;
  }
  if (steps.length !== GRIDS[grid]) throw new Error(`${name}: ${steps.length} steps, grid ${grid} needs ${GRIDS[grid]}`);
  return { id, name, grid, steps };
}

/** @returns {Pattern} */
export function blankPattern(grid) {
  const steps = Array.from({ length: GRIDS[grid] }, (_, i) => ({ stroke: i === 0 ? 'down' : 'rest', accent: false }));
  return { id: newId(), name: `Blank ${GRID_LABELS[grid]}`, grid, steps };
}

/** @param {Pattern} p @returns {Pattern} */
export const copyPattern = (p, name = p.name) => ({ ...structuredClone(p), id: newId(), name });
