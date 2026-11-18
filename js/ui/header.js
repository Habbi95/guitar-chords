import { h } from './dom.js';
import { ALL_TONICS, keyName, makeKey } from '../theory/key.js';
import { pitchName } from '../theory/pitch.js';

/** Sticky header: key, tempo, play. */
export function header({ state, isPlaying, act, onPlay }) {
  const p = state.progression;
  const current = `${pitchName(p.key.tonic)}|${p.key.mode}`;
  const keySel = h('select', { class: 'key', 'aria-label': 'Key', onchange: (e) => { const [t, m] = e.target.value.split('|'); act((A, s) => A.setKey(s, t, m)); } },
    ['major', 'minor'].map((mode) => h('optgroup', { label: mode === 'major' ? 'Major' : 'Minor' },
      ALL_TONICS.map((t) => h('option', { value: `${t}|${mode}`, selected: `${t}|${mode}` === current }, keyName(makeKey(t, mode)))))));

  const nudge = (d) => {
    let rep = null, delay = null;
    const stop = () => { clearTimeout(delay); clearInterval(rep); };
    const b = h('button', { class: 'nudge', 'aria-label': d > 0 ? 'Faster' : 'Slower' }, d > 0 ? '›' : '‹');
    b.addEventListener('pointerdown', () => {
      act((A, s) => A.setBpm(s, s.progression.bpm + d));
      delay = setTimeout(() => { rep = setInterval(() => act((A, s) => A.setBpm(s, s.progression.bpm + d)), 100); }, 400);
    });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    return b;
  };
  const bpmValue = h('button', { class: 'bpm', 'aria-label': 'Tempo', onclick: () => {
    const v = prompt('Tempo (40–240 BPM)', String(p.bpm));
    if (v !== null && !Number.isNaN(Number(v))) act((A, s) => A.setBpm(s, Number(v)));
  } }, h('b', {}, String(p.bpm)), h('small', {}, 'BPM'));

  return h('header', { class: 'top' },
    keySel,
    h('div', { class: 'tempo' }, nudge(-1), bpmValue, nudge(1)),
    h('button', { id: 'play', class: `play ${isPlaying ? 'on' : ''}`, disabled: !p.bars.length, 'aria-label': isPlaying ? 'Stop' : 'Play', onclick: onPlay }, isPlaying ? '■' : '▶'));
}
