import { describe, expect, it } from 'vitest';
import { defaultPolicy, orient, orientRuns, segment } from '../src/runs.js';

const MONGOL = 'ᠮᠣᠩᠭᠣᠯ';
const MVS = '\u180E';
const FVS1 = '\u180B';

const kinds = (text: string) => segment(text).map((r) => [r.kind, r.text]);

describe('segment', () => {
  it('keeps a Mongolian word with its MVS, FVS and following space in one run', () => {
    const word = `${MONGOL}${FVS1}${MVS}ᠠ `;
    expect(kinds(`${word}${MONGOL}`)).toEqual([['mongolian', `${word}${MONGOL}`]]);
  });

  it('splits Latin, Cyrillic, digits and CJK out of Mongolian', () => {
    expect(kinds(`${MONGOL} PDF ${MONGOL} 12 漢字`)).toEqual([
      ['mongolian', `${MONGOL} `],
      ['latin', 'PDF '],
      ['mongolian', `${MONGOL} `],
      ['digits', '12'],
      ['upright', ' 漢字'],
    ]);
  });

  it('keeps separators inside numbers but not after them', () => {
    expect(kinds('3.5, 1,000')).toEqual([
      ['digits', '3.5'],
      ['other', ', '],
      ['digits', '1,000'],
    ]);
  });

  it('keeps numbers that touch letters inside the word', () => {
    expect(kinds('H2O MP3 3D')).toEqual([['latin', 'H2O MP3 3D']]);
    expect(kinds('\u0422\u04AE3')).toEqual([['cyrillic', '\u0422\u04AE3']]);
    expect(kinds('PDF 12')).toEqual([
      ['latin', 'PDF '],
      ['digits', '12'],
    ]);
  });

  it('treats fullwidth punctuation and emoji as upright', () => {
    expect(kinds('！👍🏽')).toEqual([['upright', '！👍🏽']]);
  });

  it('covers the source exactly', () => {
    const text = ` ${MONGOL}, abc 12 カナ。`;
    const runs = segment(text);
    expect(runs.map((r) => r.text).join('')).toBe(text);
    for (const r of runs) expect(text.slice(r.start, r.end)).toBe(r.text);
  });
});

describe('orient', () => {
  it('combines short numbers and leaves long ones sideways by default', () => {
    const [short, , long] = segment('12 2026');
    expect(short && orient(short)).toBe('combine');
    expect(long && orient(long)).toBe('native');
  });

  it('stands short Latin up only when asked', () => {
    const [run] = segment('OK');
    expect(run && orient(run)).toBe('native');
    expect(run && orient(run, { ...defaultPolicy, uprightLatin: 3 })).toBe('upright');
    expect(run && orient(run, { ...defaultPolicy, uprightCyrillic: 3 })).toBe('native');
  });
});

describe('orientRuns', () => {
  const policy = {
    ...defaultPolicy,
    combineDigits: 0,
    longDigits: 'upright' as const,
    uprightCyrillic: 3,
  };

  it('keeps spaces outside turned runs and merges native text', () => {
    expect(orientRuns(`CD ${MONGOL} 107.5 \u0424\u041C ${MONGOL}`, policy)).toEqual([
      { text: `CD ${MONGOL} `, orientation: 'native' },
      { text: '107.5', orientation: 'upright' },
      { text: ' ', orientation: 'native' },
      { text: '\u0424\u041C', orientation: 'upright' },
      { text: ` ${MONGOL}`, orientation: 'native' },
    ]);
  });

  it('reassembles the source exactly', () => {
    const text = `\u300A${MONGOL}\u300B 12, abc \uFF08${MONGOL}${MVS}\u1820\uFF09`;
    expect(
      orientRuns(text, policy)
        .map((r) => r.text)
        .join(''),
    ).toBe(text);
  });
});
