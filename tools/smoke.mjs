// Browser smoke test: serves nothing itself; pass the base URL. Usage: node tools/smoke.mjs http://localhost:8000/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const url = process.argv[2] ?? 'http://localhost:8000/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  window.__starts = [];
  const orig = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (when = 0, offset = 0) {
    if (this.buffer && this.buffer.length > 1) window.__starts.push({ when, len: this.buffer.length, sr: this.buffer.sampleRate, peak: Math.max(...this.buffer.getChannelData(0).slice(0, 4000).map(Math.abs)) });
    return orig.call(this, when, offset);
  };
});
await page.goto(url);
await page.click(process.env.PLAY_SELECTOR ?? '#play');
await page.waitForTimeout(Number(process.env.WAIT_MS ?? 3500));
const starts = await page.evaluate(() => window.__starts);
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
await browser.close();
const gaps = starts.slice(1, 9).map((s, i) => +(s.when - starts[i].when).toFixed(4));
console.log(JSON.stringify({ errors, count: starts.length, firstGaps: gaps, audible: starts.every((s) => s.peak > 0.01) }));
