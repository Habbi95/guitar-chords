// UI behaviour check at iPhone size. Usage: node tools/ui-check.mjs http://localhost:8000/ [shotDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const url = process.argv[2] ?? 'http://localhost:8000/';
const shots = process.argv[3];
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const results = {};
const chords = () => page.$$eval('.bar .chord', (els) => els.map((e) => e.textContent));
await page.goto(url);
await page.evaluate(() => localStorage.clear());
await page.reload();
results.initial = await chords();
if (shots) await page.screenshot({ path: `${shots}/1-main.png` });

// fixed chord on bar 2 via Free tab
await page.click('.bar:nth-child(2) .bar-main');
await page.click('.pane .seg.small button:has-text("Free")');
await page.click('.roots button:text-is("D")');
await page.click('.quals button:text-is("Dm9")');
await page.click('.close');
await page.selectOption('select.key', 'C|major');
results.afterKeyChange = await chords();

// minor key shows dominant V
await page.selectOption('select.key', 'A|minor');
await page.click('.bar:nth-child(1) .bar-main');
results.degreeButtons = await page.$$eval('.deg small', (els) => els.map((e) => e.textContent));
if (shots) await page.screenshot({ path: `${shots}/2-chord-sheet.png` });

// rhythm edits
await page.click('.sheet .seg button:has-text("Rhythm")');
await page.selectOption('select.source', 'p:preset-funky');
await page.click('.cell[data-step="1"]');
const cell = await page.$('.cell[data-step="2"]');
const box = await cell.boundingBox();
await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
results.cellsAfterEdit = await page.$$eval('.cell', (els) => els.slice(0, 4).map((e) => e.className));
if (shots) await page.screenshot({ path: `${shots}/3-rhythm-sheet.png` });
await page.click('.close');

// playhead while playing
await page.click('#play');
await page.waitForTimeout(1500);
results.playingRow = await page.$eval('.bar.playing .num', (e) => e.textContent).catch(() => null);
results.nowGlyph = await page.$('.glyphs i.now') !== null;
await page.click('#play');

// persistence
await page.waitForTimeout(500);
await page.reload();
results.afterReload = await chords();
results.bar1GridAfterReload = await page.$eval('.bar:nth-child(1) .grid', (e) => e.textContent);

// delete all bars disables play
for (let i = 0; i < 4; i++) { await page.click('.bar:nth-child(1) .more'); await page.click('.menu .danger'); }
results.playDisabledWhenEmpty = await page.$eval('#play', (b) => b.disabled);
if (shots) await page.screenshot({ path: `${shots}/4-empty.png` });
results.errors = errors;
await browser.close();
console.log(JSON.stringify(results, null, 1));
