import { PlaybackCursor, PlayheadTracker } from '../playback/cursor.js';
import { planBar } from '../playback/timing.js';
import { GRIDS } from '../rhythm/pattern.js';
import { RenderCache } from '../synth/renderer.js';

const TICK_MS = 25;
const START_DELAY = 0.1;

/** Lookahead loop: schedules whole bars just before they start, reading the progression each time. */
export class Transport {
  /**
   * @param {object} engine AudioEngine-like
   * @param {() => import('../rhythm/progression.js').Progression} getProgression
   * @param {(pos: {bar: number, step: number} | null) => void} onPlayhead
   */
  constructor(engine, getProgression, onPlayhead) {
    this.starting = false;
    this.engine = engine;
    this.getProgression = getProgression;
    this.onPlayhead = onPlayhead;
    this.isPlaying = false;
    this.tracker = new PlayheadTracker();
    this.cache = null;
    this.timer = null;
    this.raf = null;
  }

  async play() {
    if (this.isPlaying || this.starting || !this.getProgression().bars.length) return;
    this.starting = true;
    try { await this.engine.unlock(); } finally { this.starting = false; }
    if (this.isPlaying) return;
    const sr = this.engine.sampleRate;
    if (!this.cache || this.cache.sr !== sr) this.cache = new RenderCache(sr);
    // Render the first bar before fixing its start time, so a slow first render can't make it late.
    const p = this.getProgression();
    if (!p.bars.length) return;
    for (const s of planBar(0, p, sr)) this.cache.get(s);
    this.cursor = new PlaybackCursor(this.engine.nowFrame() + Math.round(START_DELAY * sr));
    this.isPlaying = true;
    this.tick();
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.engine.requestWakeLock?.();
    this.loopPlayhead();
  }

  tick() {
    if (!this.isPlaying) return;
    const p = this.getProgression();
    const sr = this.engine.sampleRate;
    if (!p.bars.length) { this.stop(); return; }
    let scheduled = false;
    while (this.cursor.isDue(this.engine.nowFrame(), p, sr)) {
      const bar = this.cursor.take(p, sr);
      for (const s of planBar(bar.barIndex, p, sr)) this.engine.schedule(this.cache.get(s), bar.start + s.offset);
      this.tracker.record(bar.barIndex, bar.start, bar.barFrames, GRIDS[p.bars[bar.barIndex].pattern.grid]);
      scheduled = true;
    }
    if (scheduled) this.prewarm(p, sr);
  }

  /** Render the next bar's strikes ahead of time so its tick is cheap. */
  prewarm(p, sr) {
    const idx = this.cursor.nextIndex % p.bars.length;
    setTimeout(() => {
      if (!this.isPlaying) return;
      try { for (const s of planBar(idx, this.getProgression(), sr)) this.cache.get(s); } catch { /* bar changed; tick renders it */ }
    }, 0);
  }

  loopPlayhead() {
    if (typeof requestAnimationFrame !== 'function') return;
    const step = () => {
      if (!this.isPlaying) return;
      this.onPlayhead(this.tracker.position(this.engine.nowFrame()));
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
    this.timer = this.raf = null;
    const was = this.isPlaying;
    this.isPlaying = false;
    if (was) this.engine.stopAll();
    this.engine.releaseWakeLock?.();
    this.tracker.reset();
    this.onPlayhead(null);
  }
}
