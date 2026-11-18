/** Web Audio output: one context, a master chain, and one-shot buffer sources started at exact times. */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sources = new Set();
    this.wakeLock = null;
    this.onInterrupt = null;
    this.active = false;
  }

  get sampleRate() { return this.ctx ? this.ctx.sampleRate : 48000; }

  /** Must be called from a user gesture (iOS). */
  async unlock() {
    try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -6;
      comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp).connect(this.ctx.destination);
      this.ctx.onstatechange = () => {
        if (this.active && this.ctx.state !== 'running') this.onInterrupt?.();
      };
    }
    if (this.ctx.state !== 'running') await this.ctx.resume();
    const blip = this.ctx.createBufferSource();
    blip.buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
    blip.connect(this.ctx.destination);
    blip.start();
    this.active = true;
  }

  nowFrame() { return this.ctx ? Math.round(this.ctx.currentTime * this.ctx.sampleRate) : 0; }

  /** @param {Float32Array} samples @param {number} frame absolute context frame */
  schedule(samples, frame) {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buf.copyToChannel(samples, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.master);
    const when = frame / ctx.sampleRate;
    const late = Math.max(0, ctx.currentTime - when);
    if (late >= buf.duration) return;
    src.start(when + late, late);
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  stopAll() {
    this.active = false;
    for (const s of this.sources) { try { s.stop(); } catch { /* already stopped */ } }
    this.sources.clear();
  }

  async requestWakeLock() {
    try { if ('wakeLock' in navigator) this.wakeLock = await navigator.wakeLock.request('screen'); } catch { /* not allowed */ }
  }

  releaseWakeLock() {
    try { this.wakeLock?.release(); } catch { /* ignore */ }
    this.wakeLock = null;
  }
}
