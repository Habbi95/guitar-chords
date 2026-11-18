import { parsePattern } from './pattern.js';

export const PRESETS = [
  parsePattern('Funky', 'sixteenths', '>D.XU.UX>D.XUDXU.U', 'preset-funky'),
  parsePattern('Country', 'eighths', 'B.DUB.DU', 'preset-country'),
  parsePattern('Straight 8ths', 'eighths', 'DDDDDDDD', 'preset-straight8'),
  parsePattern('Triplet shuffle', 'triplets', 'D.UD.UD.UD.U', 'preset-shuffle'),
];
