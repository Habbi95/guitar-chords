import { h } from './dom.js';
import { GLYPH, GRIDS, GRID_LABELS } from '../rhythm/pattern.js';
import { chordName, resolveRef } from '../theory/chord.js';

/** Glyph row for a pattern, grouped by beat. */
export function glyphs(pattern) {
  const per = GRIDS[pattern.grid] / 4;
  return h('div', { class: 'glyphs' }, [0, 1, 2, 3].map((beat) => h('span', { class: 'beat' },
    pattern.steps.slice(beat * per, beat * per + per).map((s, i) => h('i', { class: `${s.stroke}${s.accent ? ' acc' : ''}`, 'data-step': beat * per + i }, GLYPH[s.stroke])))));
}

export function barList({ state, ui, act, openSheet, toggleMenu }) {
  const p = state.progression;
  const rows = p.bars.map((bar, i) => h('li', { class: 'bar', 'data-bar': i },
    h('button', { class: 'bar-main', onclick: () => openSheet(bar.id) },
      h('span', { class: 'num' }, String(i + 1)),
      h('span', { class: 'chord' }, chordName(resolveRef(bar.chord, p.key))),
      h('span', { class: 'grid' }, GRID_LABELS[bar.pattern.grid]),
      glyphs(bar.pattern)),
    h('button', { class: 'more', 'aria-label': 'Bar actions', onclick: () => toggleMenu(bar.id) }, '⋯'),
    ui.menuBar === bar.id && h('div', { class: 'menu' },
      h('button', { onclick: () => act((A, s) => A.duplicateBar(s, bar.id)) }, 'Duplicate'),
      h('button', { disabled: i === 0, onclick: () => act((A, s) => A.moveBar(s, bar.id, -1)) }, 'Move up'),
      h('button', { disabled: i === p.bars.length - 1, onclick: () => act((A, s) => A.moveBar(s, bar.id, 1)) }, 'Move down'),
      h('button', { class: 'danger', onclick: () => act((A, s) => A.deleteBar(s, bar.id)) }, 'Delete'))));
  return h('main', {},
    rows.length ? h('ol', { class: 'bars' }, rows) : h('p', { class: 'empty' }, 'No bars yet. Add one to start.'),
    h('button', { class: 'add', onclick: () => act((A, s) => A.addBar(s)) }, '+ Add bar'));
}
