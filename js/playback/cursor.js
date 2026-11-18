import { barFrames, stepOffset } from './timing.js';

/** Which bar to schedule next, and when. Reads tempo and bars at take() time so edits land on the next bar. */
export class PlaybackCursor {
  constructor(startFrame) { this.nextIndex = 0; this.nextStart = startFrame; }

  static lookahead(barFr, sr) { return Math.max(Math.floor(barFr / 2), Math.round(0.2 * sr)); }

  isDue(nowFrame, p, sr) {
    if (!p.bars.length) return false;
    return this.nextStart - nowFrame <= PlaybackCursor.lookahead(barFrames(p.bpm, sr), sr);
  }

  /** @returns {{barIndex: number, start: number, barFrames: number} | null} */
  take(p, sr) {
    if (!p.bars.length) return null;
    if (this.nextIndex >= p.bars.length) this.nextIndex = 0;
    const bf = barFrames(p.bpm, sr);
    const out = { barIndex: this.nextIndex, start: this.nextStart, barFrames: bf };
    this.nextIndex = (this.nextIndex + 1) % p.bars.length;
    this.nextStart += bf;
    return out;
  }
}

/** Maps an audio frame back to the (bar, step) being heard. */
export class PlayheadTracker {
  constructor() { this.records = []; }
  record(barIndex, start, barFrames, steps) {
    this.records.push({ barIndex, start, barFrames, steps });
    if (this.records.length > 4) this.records.shift();
  }
  position(frame) {
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (frame >= r.start && frame < r.start + r.barFrames) {
        let step = Math.floor(((frame - r.start) * r.steps) / r.barFrames);
        while (step + 1 < r.steps && stepOffset(step + 1, r.steps, r.barFrames) <= frame - r.start) step++;
        return { bar: r.barIndex, step };
      }
    }
    return null;
  }
  reset() { this.records = []; }
}
