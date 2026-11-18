import { h, pressable } from './dom.js';
import { degreeLabel } from '../actions.js';
import { chordName, diatonicChord, qualityChord, resolveRef, QUALITIES, EXTENSIONS } from '../theory/chord.js';
import { ALL_TONICS } from '../theory/key.js';
import { GLYPH, GRIDS, GRID_LABELS, blankPattern } from '../rhythm/pattern.js';
import { PRESETS } from '../rhythm/presets.js';

const EXT_LABEL = { 3: 'Triad', 7: '7', 9: '9', 11: '11', 13: '13' };

/** Bottom sheet for one bar: Chord and Rhythm tabs. */
export function sheet({ state, ui, act, setUi, close }) {
  const p = state.progression;
  const index = p.bars.findIndex((b) => b.id === ui.sheet.barId);
  if (index < 0) return null;
  const bar = p.bars[index];
  const tab = ui.sheet.tab;
  const tabs = h('div', { class: 'seg' },
    ['chord', 'rhythm'].map((t) => h('button', { class: t === tab ? 'on' : '', onclick: () => setUi({ sheet: { ...ui.sheet, tab: t } }) }, t === 'chord' ? 'Chord' : 'Rhythm')));
  return h('div', { class: 'overlay', onclick: (e) => { if (e.target.classList.contains('overlay')) close(); } },
    h('section', { class: 'sheet', role: 'dialog', 'aria-label': `Bar ${index + 1}` },
      h('div', { class: 'sheet-head' },
        h('b', {}, `Bar ${index + 1} · ${chordName(resolveRef(bar.chord, p.key))}`),
        h('button', { class: 'close', 'aria-label': 'Close', onclick: close }, '✕')),
      tabs,
      tab === 'chord' ? chordTab({ p, bar, ui, act, setUi }) : rhythmTab({ state, bar, act })));
}

function chordTab({ p, bar, ui, act, setUi }) {
  const mode = ui.sheet.chordMode ?? (bar.chord.kind === 'fixed' ? 'free' : 'key');
  const set = (ref) => act((A, s) => A.setChord(s, bar.id, ref));
  const modes = h('div', { class: 'seg small' },
    [['key', 'In key'], ['free', 'Free']].map(([m, label]) => h('button', { class: m === mode ? 'on' : '', onclick: () => setUi({ sheet: { ...ui.sheet, chordMode: m } }) }, label)));
  if (mode === 'key') {
    const ext = bar.chord.kind === 'degree' ? bar.chord.ext : 7;
    const same = (d, v) => bar.chord.kind === 'degree' && bar.chord.degree === d && (bar.chord.variant ?? 'natural') === v;
    const degBtn = (d, v = 'natural') => h('button', { class: `deg ${same(d, v) ? 'on' : ''}`, onclick: () => set({ kind: 'degree', degree: d, variant: v, ext }) },
      h('small', {}, degreeLabel(p.key, d, v)), h('span', {}, chordName(diatonicChord(p.key, d, ext, v))));
    const degs = [1, 2, 3, 4, 5, 6, 7].map((d) => degBtn(d));
    if (p.key.mode === 'minor') degs.splice(5, 0, degBtn(5, 'dominant'));
    return h('div', { class: 'pane' }, modes,
      h('div', { class: 'seg small' }, EXTENSIONS.map((e) => h('button', { class: e === ext ? 'on' : '', onclick: () => {
        if (bar.chord.kind === 'degree') set({ ...bar.chord, ext: e });
        else set({ kind: 'degree', degree: 1, variant: 'natural', ext: e });
      } }, EXT_LABEL[e]))),
      h('div', { class: 'grid-btns' }, degs));
  }
  const root = bar.chord.kind === 'fixed' ? bar.chord.root : 'C';
  const quality = bar.chord.kind === 'fixed' ? bar.chord.quality : 'major';
  return h('div', { class: 'pane' }, modes,
    h('div', { class: 'grid-btns roots' }, ALL_TONICS.map((r) => h('button', { class: r === root && bar.chord.kind === 'fixed' ? 'on' : '', onclick: () => set({ kind: 'fixed', root: r, quality }) }, r))),
    h('div', { class: 'grid-btns quals' }, QUALITIES.map((q) => h('button', { class: q.id === quality && bar.chord.kind === 'fixed' ? 'on' : '', onclick: () => set({ kind: 'fixed', root, quality: q.id }) },
      chordName(qualityChord(root, q.id))))));
}

function rhythmTab({ state, bar, act }) {
  const pat = bar.pattern;
  const per = GRIDS[pat.grid] / 4;
  const sources = [
    ['Presets', PRESETS.map((x) => [`p:${x.id}`, `${x.name} (${GRID_LABELS[x.grid]})`])],
    ['My patterns', state.myPatterns.map((x) => [`m:${x.id}`, `${x.name} (${GRID_LABELS[x.grid]})`])],
    ['Blank', Object.keys(GRIDS).map((g) => [`b:${g}`, `Blank ${GRID_LABELS[g]}`])],
  ];
  const pick = (v) => {
    const [kind, id] = [v.slice(0, 1), v.slice(2)];
    const src = kind === 'p' ? PRESETS.find((x) => x.id === id) : kind === 'm' ? state.myPatterns.find((x) => x.id === id) : blankPattern(id);
    if (src) act((A, s) => A.setPattern(s, bar.id, src));
  };
  const select = h('select', { class: 'source', 'aria-label': 'Load a pattern', onchange: (e) => { pick(e.target.value); e.target.value = ''; } },
    h('option', { value: '', selected: true }, 'Load a pattern…'),
    sources.filter(([, opts]) => opts.length).map(([label, opts]) => h('optgroup', { label }, opts.map(([v, t]) => h('option', { value: v }, t)))));
  const cells = h('div', { class: `steps n${GRIDS[pat.grid]}` }, [0, 1, 2, 3].map((beat) => h('div', { class: 'beatgrp' },
    h('small', {}, String(beat + 1)),
    h('div', { class: 'cells' }, pat.steps.slice(beat * per, beat * per + per).map((st, j) => {
      const i = beat * per + j;
      return pressable(h('button', { class: `cell ${st.stroke}${st.accent ? ' acc' : ''}`, 'data-step': i, 'aria-label': `Step ${i + 1}: ${st.stroke}${st.accent ? ', accented' : ''}` }, GLYPH[st.stroke]), {
        onTap: () => act((A, s) => A.cycleStep(s, bar.id, i)),
        onLong: () => act((A, s) => A.toggleAccent(s, bar.id, i)),
      });
    })))));
  return h('div', { class: 'pane' },
    h('div', { class: 'row' }, select, h('span', { class: 'gridname' }, GRID_LABELS[pat.grid])),
    cells,
    h('p', { class: 'hint' }, 'Tap a step: ↓ → ↑ → ✕ mute → B bass → · rest. Hold to accent.'),
    h('div', { class: 'row' },
      h('button', { onclick: () => { const n = prompt('Name this pattern', 'My pattern'); if (n) act((A, s) => A.saveAsMyPattern(s, bar.id, n.trim() || 'My pattern')); } }, 'Save as my pattern'),
      h('button', { onclick: () => act((A, s) => A.applyPatternToAll(s, bar.id)) }, 'Apply to all bars')),
    state.myPatterns.length ? h('ul', { class: 'mine' }, state.myPatterns.map((m) => h('li', {},
      h('span', {}, `${m.name} · ${GRID_LABELS[m.grid]}`),
      h('button', { 'aria-label': `Delete ${m.name}`, onclick: () => act((A, s) => A.deleteMyPattern(s, m.id)) }, '✕')))) : null);
}
