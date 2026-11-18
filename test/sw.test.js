import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const appFiles = () => {
  const out = ['index.html', 'manifest.webmanifest'];
  const walk = (d) => { for (const f of readdirSync(join(root, d))) { const p = join(d, f); statSync(join(root, p)).isDirectory() ? walk(p) : out.push(p); } };
  for (const d of ['js', 'css', 'icons']) walk(d);
  return out.sort();
};
const cached = () => {
  const src = readFileSync(join(root, 'sw.js'), 'utf8');
  return JSON.parse(/const FILES = (\[[\s\S]*?\]);/.exec(src)[1]).filter((f) => f !== './').sort();
};

test('service worker caches every app file, and only files that exist', () => {
  assert.deepEqual(cached(), appFiles());
  for (const f of cached()) assert.ok(existsSync(join(root, f)), f);
});
test('manifest is installable', () => {
  const m = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.orientation, 'portrait');
  assert.ok(m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.sizes === '192x192'));
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), i.src);
});
test('index links manifest and apple touch icon', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon" href="icons\/apple-touch-icon.png"/);
});
