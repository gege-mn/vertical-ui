export type RunKind = 'mongolian' | 'latin' | 'cyrillic' | 'digits' | 'upright' | 'other';

export interface Run {
  kind: RunKind;
  text: string;
  /** UTF-16 offsets into the source string. */
  start: number;
  end: number;
}

/**
 * Characters that stand upright in vertical text by default (UAX #50 `vo=U`
 * and the CJK punctuation that has vertical forms). Many of them have
 * Script=Common, so they are tested before the Common/Inherited merge.
 */
const UPRIGHT =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}　-〿！-｠￠-￦]/u;
const DIGIT = /[0-9]/;
/** Separators that stay inside a number when a digit follows: 3.5, 1,000, 12:30. */
const NUMBER_JOINER = /[.,:]/;
const MONGOLIAN = /\p{Script=Mongolian}/u;
const LATIN = /\p{Script=Latin}/u;
const CYRILLIC = /\p{Script=Cyrillic}/u;
/** Spaces, punctuation, joiners, variation selectors: they belong to the run around them. */
const NEUTRAL = /[\p{Script=Common}\p{Script=Inherited}]/u;

function classify(ch: string): RunKind | null {
  if (UPRIGHT.test(ch)) return 'upright';
  if (DIGIT.test(ch)) return 'digits';
  if (MONGOLIAN.test(ch)) return 'mongolian';
  if (LATIN.test(ch)) return 'latin';
  if (CYRILLIC.test(ch)) return 'cyrillic';
  if (NEUTRAL.test(ch)) return null;
  return 'other';
}

/**
 * Splits text into script runs, so each run can be given its own orientation
 * while the stored string stays byte-identical. Neutral characters join the
 * run before them (or the first run, at the start), so a run boundary never
 * falls inside a Mongolian word or between a letter and its FVS.
 */
export function segment(text: string): Run[] {
  const runs: Run[] = [];
  const chars = Array.from(text);
  let offset = 0;
  let pending = '';
  let pendingStart = 0;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] as string;
    let kind = classify(ch);
    let last = runs.at(-1);

    if (
      kind === null &&
      last?.kind === 'digits' &&
      NUMBER_JOINER.test(ch) &&
      DIGIT.test(chars[i + 1] ?? '')
    ) {
      kind = 'digits';
    }

    // A number touching a letter belongs to the word: H2O, MP3, 3D.
    const prev = chars[i - 1] ?? '';
    if (last && pending === '') {
      if (
        kind === 'digits' &&
        (last.kind === 'latin' || last.kind === 'cyrillic') &&
        /\p{L}/u.test(prev)
      ) {
        kind = last.kind;
      } else if (
        (kind === 'latin' || kind === 'cyrillic') &&
        last.kind === 'digits' &&
        DIGIT.test(prev)
      ) {
        last.kind = kind;
        const before = runs.at(-2);
        if (before?.kind === kind && before.end === last.start) {
          before.text += last.text;
          before.end = last.end;
          runs.pop();
          last = before;
        }
      }
    }

    if (kind === null) {
      // After a number, punctuation and spaces go forward instead, so "12, " doesn't combine as one box.
      if (last && last.kind !== 'digits' && pending === '') {
        last.text += ch;
        last.end = offset + ch.length;
      } else {
        if (pending === '') pendingStart = offset;
        pending += ch;
      }
    } else if (last && last.kind === kind && pending === '') {
      last.text += ch;
      last.end = offset + ch.length;
    } else {
      // Neutrals never lead a number either: they become their own run.
      if (pending && kind === 'digits') {
        runs.push({ kind: 'other', text: pending, start: pendingStart, end: offset });
        pending = '';
      }
      runs.push({
        kind,
        text: pending + ch,
        start: pending ? pendingStart : offset,
        end: offset + ch.length,
      });
      pending = '';
    }
    offset += ch.length;
  }

  if (pending) runs.push({ kind: 'other', text: pending, start: pendingStart, end: offset });
  return runs;
}

/**
 * - `native`: leave it to `text-orientation: mixed` (Mongolian, and CJK/emoji,
 *   which mixed already sets upright).
 * - `combine`: `text-combine-upright: all`, one em box; only sane for 1–2 characters.
 * - `upright`: each character stacked upright.
 * - `horizontal`: a small horizontal-tb island, read like a label.
 */
export type Orientation = 'native' | 'combine' | 'upright' | 'horizontal';

export interface OrientationPolicy {
  /** Digit runs of at most this many characters are combined. Default 2. */
  combineDigits: number;
  /** What longer digit runs become. Default `native` (sideways, like Latin). */
  longDigits: Orientation;
  /** Latin runs of at most this many letters stand upright. Default 0 (never). */
  uprightLatin: number;
  /** Cyrillic runs of at most this many letters stand upright. Default 0 (never). */
  uprightCyrillic: number;
}

export const defaultPolicy: OrientationPolicy = {
  combineDigits: 2,
  longDigits: 'native',
  uprightLatin: 0,
  uprightCyrillic: 0,
};

export function orient(run: Run, policy: OrientationPolicy = defaultPolicy): Orientation {
  const length = Array.from(run.text.trim()).length;
  switch (run.kind) {
    case 'digits':
      return length <= policy.combineDigits ? 'combine' : policy.longDigits;
    case 'latin':
      return length <= policy.uprightLatin ? 'upright' : 'native';
    case 'cyrillic':
      return length <= policy.uprightCyrillic ? 'upright' : 'native';
    default:
      return 'native';
  }
}

export interface OrientedRun {
  text: string;
  orientation: Orientation;
}

/**
 * Runs ready to render: whitespace at a turned run's edges stays outside it
 * (an upright space takes a full em), and neighbouring `native` text is merged
 * into one piece, so it is shaped as one.
 */
export function orientRuns(text: string, policy: OrientationPolicy = defaultPolicy): OrientedRun[] {
  const out: OrientedRun[] = [];
  const push = (t: string, orientation: Orientation) => {
    if (!t) return;
    const last = out.at(-1);
    if (last && orientation === 'native' && last.orientation === 'native') last.text += t;
    else out.push({ text: t, orientation });
  };
  for (const run of segment(text)) {
    const o = orient(run, policy);
    if (o === 'native') {
      push(run.text, o);
      continue;
    }
    const [, lead = '', core = '', trail = ''] = /^(\s*)([\s\S]*?)(\s*)$/.exec(run.text) ?? [];
    push(lead, 'native');
    push(core, o);
    push(trail, 'native');
  }
  return out;
}
