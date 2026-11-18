import { LETTERS, parsePitch, pitchClass, pitchName, spell } from './pitch.js';

/** @typedef {import('./pitch.js').Pitch} Pitch */
/** @typedef {{tonic: Pitch, mode: 'major'|'minor'}} Key */

export const ALL_TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const STEPS = { major: [2, 2, 1, 2, 2, 2, 1], minor: [2, 1, 2, 2, 1, 2, 2] };

/** @returns {Key} */
export const makeKey = (tonicName, mode) => ({ tonic: parsePitch(tonicName), mode });

/** @param {Key} key @returns {Pitch[]} */
export function scale(key) {
  const start = LETTERS.indexOf(key.tonic.letter);
  let pc = pitchClass(key.tonic);
  const out = [];
  for (let i = 0; i < 7; i++) {
    out.push(spell(LETTERS[(start + i) % 7], pc));
    pc += STEPS[key.mode][i];
  }
  return out;
}

/** @param {Key} key */
export const keyName = (key) => `${pitchName(key.tonic)} ${key.mode}`;
