import * as Actions from './actions.js';
import { AudioEngine } from './audio/engine.js';
import { Transport } from './audio/transport.js';
import { loadState, saveState } from './store.js';
import { header } from './ui/header.js';
import { barList } from './ui/barlist.js';
import { sheet } from './ui/sheet.js';

const state = loadState(localStorage);
let ui = { sheet: null, menuBar: null };

const engine = new AudioEngine();
const transport = new Transport(engine, () => state.progression, showPlayhead);
engine.onInterrupt = () => { transport.stop(); render(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && transport.isPlaying) { transport.stop(); render(); } });

let saveTimer = null;
const saveNow = () => { clearTimeout(saveTimer); saveState(localStorage, state); };
window.addEventListener('pagehide', saveNow);

/** Apply a state change, re-render, save soon. */
function act(fn) {
  fn(Actions, state);
  if (!state.progression.bars.length && transport.isPlaying) transport.stop();
  render();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
const setUi = (patch) => { ui = { ...ui, ...patch }; render(); };

const app = document.getElementById('app');
function render() {
  const keepScroll = [...app.querySelectorAll('.steps')].map((el) => el.scrollLeft);
  const sheetScroll = app.querySelector('.sheet')?.scrollTop ?? 0;
  app.replaceChildren(
    header({ state, isPlaying: transport.isPlaying, act, onPlay: togglePlay }),
    barList({ state, ui, act, openSheet: (id) => setUi({ sheet: { barId: id, tab: 'chord' }, menuBar: null }), toggleMenu: (id) => setUi({ menuBar: ui.menuBar === id ? null : id }) }),
    ui.sheet ? sheet({ state, ui, act, setUi, close: () => setUi({ sheet: null }) }) : '');
  app.querySelectorAll('.steps').forEach((el, i) => { el.scrollLeft = keepScroll[i] ?? 0; });
  const sh = app.querySelector('.sheet'); if (sh) sh.scrollTop = sheetScroll;
  lastHead = null;
}

async function togglePlay() {
  if (transport.isPlaying) transport.stop();
  else await transport.play();
  render();
}

let lastHead = null;
function showPlayhead(pos) {
  const key = pos ? `${pos.bar}:${pos.step}` : '';
  if (key === lastHead) return;
  lastHead = key;
  app.querySelectorAll('.bar.playing').forEach((el) => el.classList.remove('playing'));
  app.querySelectorAll('.glyphs i.now').forEach((el) => el.classList.remove('now'));
  if (!pos) return;
  const row = app.querySelector(`.bar[data-bar="${pos.bar}"]`);
  row?.classList.add('playing');
  row?.querySelector(`.glyphs i[data-step="${pos.step}"]`)?.classList.add('now');
}

render();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
