import { GRIDS } from '../rhythm/pattern.js';
import { resolveRef } from '../theory/chord.js';
import { voice } from '../theory/voicer.js';

/** @typedef {{barIndex: number, stepIndex: number, offset: number, stroke: string, accent: boolean, voicing: import('../theory/voicer.js').Voicing, ring: number}} Strike  offset/ring in frames */

export const MAX_RING_SECONDS = 2;

/** Frames in one 4/4 bar. */
export const barFrames = (bpm, sr) => Math.round((240 / bpm) * sr);

/** Frame offset of a step from the bar start; computed from the absolute start so it never drifts. */
export const stepOffset = (step, steps, barFr) => Math.floor((step * barFr) / steps);

/**
 * Strikes for one bar, each with how long it rings: until the next non-rest step
 * (walking into following bars and around the loop), capped at MAX_RING_SECONDS.
 * @param {number} index @param {import('../rhythm/progression.js').Progression} p @param {number} sr
 * @returns {Strike[]}
 */
export function planBar(index, p, sr) {
  const bar = p.bars[index];
  const bf = barFrames(p.bpm, sr);
  const cap = Math.round(MAX_RING_SECONDS * sr);
  const steps = GRIDS[bar.pattern.grid];
  const voicing = voice(resolveRef(bar.chord, p.key));
  const out = [];
  bar.pattern.steps.forEach((step, i) => {
    if (step.stroke === 'rest') return;
    const offset = stepOffset(i, steps, bf);
    out.push({ barIndex: index, stepIndex: i, offset, stroke: step.stroke, accent: step.accent, voicing, ring: ringFrom(index, i, offset, p, bf, cap) });
  });
  return out;
}

function ringFrom(barIdx, stepIdx, offset, p, bf, cap) {
  let b = barIdx, i = stepIdx + 1, barStart = 0;
  for (;;) {
    const steps = GRIDS[p.bars[b].pattern.grid];
    if (i >= steps) {
      barStart += bf;
      b = (b + 1) % p.bars.length;
      i = 0;
      if (barStart - offset >= cap) return cap;
      continue;
    }
    const at = barStart + stepOffset(i, steps, bf);
    if (at - offset >= cap) return cap;
    if (p.bars[b].pattern.steps[i].stroke !== 'rest') return at - offset;
    i++;
  }
}
