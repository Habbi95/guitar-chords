import { AudioEngine } from './audio/engine.js';
import { Transport } from './audio/transport.js';
import { defaultProgression, clampBpm } from './rhythm/progression.js';

const state = { progression: defaultProgression() };
const engine = new AudioEngine();
const transport = new Transport(engine, () => state.progression, () => {});
engine.onInterrupt = () => { transport.stop(); render(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { transport.stop(); render(); } });

const app = document.getElementById('app');
function render() {
  app.innerHTML = '';
  const play = document.createElement('button');
  play.id = 'play';
  play.textContent = transport.isPlaying ? 'Stop' : 'Play';
  play.onclick = async () => { transport.isPlaying ? transport.stop() : await transport.play(); render(); };
  const bpm = (d) => { const b = document.createElement('button'); b.textContent = d > 0 ? '›' : '‹'; b.onclick = () => { state.progression.bpm = clampBpm(state.progression.bpm + d); render(); }; return b; };
  const label = document.createElement('span');
  label.id = 'bpm';
  label.textContent = `${state.progression.bpm} BPM`;
  app.append(bpm(-1), label, bpm(1), play);
}
render();
