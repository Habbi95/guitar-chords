/** @typedef {{letter: string, acc: number}} Pitch  acc: -2..2 (flats negative) */

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const NATURAL_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** @param {string} name e.g. "C#", "Bb", "Ebb" @returns {Pitch} */
export function parsePitch(name) {
  const m = /^([A-G])(#{0,2}|b{0,2})$/.exec(name);
  if (!m) throw new Error(`Bad pitch name: ${name}`);
  const acc = m[2].startsWith('#') ? m[2].length : -m[2].length;
  return { letter: m[1], acc };
}

/** @param {Pitch} p */
export const pitchClass = (p) => (((NATURAL_PC[p.letter] + p.acc) % 12) + 12) % 12;

/** @param {Pitch} p */
export const pitchName = (p) => p.letter + (p.acc >= 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc));

/** Spell pitch class `pc` using `letter`. */
export function spell(letter, pc) {
  let acc = (((pc - NATURAL_PC[letter]) % 12) + 12) % 12;
  if (acc > 6) acc -= 12;
  return { letter, acc };
}
