/** Canvas `TextMetrics` values in px: ascents above the alphabetic baseline, descents below it, both positive. */
export interface SpineMetrics {
  fontAscent: number;
  fontDescent: number;
  spineAscent: number;
  spineDescent: number;
}

/**
 * Five MONGOLIAN NIRUGU: bare pieces of the stem, so their ink is the spine
 * band. A run shapes them joined, as the stem appears inside a word; a lone
 * nirugu can be drawn slightly differently (up to 0.011em off in measured
 * fonts, against 0.006em for the run).
 */
export const SPINE_PROBE = '\u180A'.repeat(5);

/**
 * Distance from the middle of a column's line box to the middle of the spine,
 * in em. Positive is toward line-over, which in `vertical-lr` is the physical
 * right, because sideways glyphs are turned a quarter turn clockwise.
 *
 * The line box is centred on the font's content area (half-leading is split
 * evenly), so its middle sits (ascent − descent) / 2 above the baseline. The
 * spine's middle sits (spineAscent − spineDescent) / 2 above it.
 */
export function spineOffsetEm(m: SpineMetrics, fontSize: number): number {
  const lineMiddle = (m.fontAscent - m.fontDescent) / 2;
  const spineMiddle = (m.spineAscent - m.spineDescent) / 2;
  return (spineMiddle - lineMiddle) / fontSize;
}

/** Offset from a known spine height (em above the baseline) and the browser's own content area. */
export function offsetFromSpineEm(
  spineEm: number,
  fontAscent: number,
  fontDescent: number,
  fontSize: number,
): number {
  return spineEm - (fontAscent - fontDescent) / 2 / fontSize;
}

/**
 * A 612-byte font whose only glyph is U+180A with zero advance. As the last
 * fallback it makes a missing nirugu measure 0 wide. Comparing against a
 * generic family doesn't work: on macOS the generics fall back to the
 * system's Mongolian font, which draws a nirugu too.
 */
const BLANK_FAMILY = 'vui-nirugu-blank';
const BLANK_FONT =
  'data:font/ttf;base64,AAEAAAAKAIAAAwAgT1MvMlzpWagAAAEoAAAAYGNtYXAADBhdAAABkAAAADRnbHlmAAAAAAAAAcwAAAABaGVhZC1sVEIAAACsAAAANmhoZWEDIf86AAAA5AAAACRobXR4AAAAAAAAAYgAAAAGbG9jYQAAAAAAAAHEAAAABm1heHAAAwACAAABCAAAACBuYW1llQHFNQAAAdAAAABmcG9zdG1nc80AAAI4AAAALAABAAAAAQAAhbigBF8PPPUAAwPoAAAAAOcrCbEAAAAA5ysJsQAAAAAAAAAAAAAAAwACAAAAAAAAAAEAAAMg/zgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAEAAAACAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAwAAAZAABQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAPz8/PwAAGAoYCgMg/zgAAAMgAMgAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAIAAAADAAAAFAADAAEAAAAUAAQAIAAAAAQABAABAAAYCv//AAAYCv//5/cAAQAAAAAAAAAAAAAAAAAAAAAAAAAEADYAAQAAAAAAAQAJAAAAAQAAAAAAAgAHAAkAAwABBAkAAQASABAAAwABBAkAAgAOACJ2dWktYmxhbmtSZWd1bGFyAHYAdQBpAC0AYgBsAGEAbgBrAFIAZQBnAHUAbABhAHIAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAECBWJsYW5r';
let blankReady: Promise<boolean> | undefined;

/** False when the page's Content-Security-Policy blocks `data:` fonts; the check is then skipped. */
function loadBlank(): Promise<boolean> {
  blankReady ??= new FontFace(BLANK_FAMILY, `url(${BLANK_FONT})`)
    .load()
    .then((face) => {
      document.fonts.add(face);
      return true;
    })
    .catch(() => false);
  return blankReady;
}

export interface SpineOptions {
  /** Overrides the measured spine height (em above the baseline), for a font that has no nirugu. */
  spineEm?: number;
}

/**
 * Measures a loaded font's spine with canvas text metrics: one `measureText`
 * call, cheap enough to run for every font on every page. Widths and bounds
 * are not affected by the canvas-readback noise some browsers add against
 * fingerprinting, unlike reading pixels.
 *
 * Returns null when the font has no nirugu, rather than measuring whichever
 * fallback font would draw it. A family list is measured as the page would
 * draw it, but the check then can't tell when the first family lacks a
 * nirugu and a fallback in the list draws it.
 *
 * Untested across engines: Firefox and Safari may take the content area from
 * different font tables than canvas reports.
 */
export async function measureSpine(
  family: string,
  { spineEm }: SpineOptions = {},
  fontSize = 100,
): Promise<number | null> {
  const font = `${fontSize}px ${family}`;
  const [, hasBlank] = await Promise.all([document.fonts.load(font, SPINE_PROBE), loadBlank()]);
  if (!document.fonts.check(font, SPINE_PROBE)) return null;

  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  if (hasBlank) {
    ctx.font = `${font}, ${BLANK_FAMILY}`;
    if (ctx.measureText(SPINE_PROBE).width === 0) return null;
  }

  ctx.font = font;
  const t = ctx.measureText(SPINE_PROBE);
  if (t.width === 0) return null;
  if (spineEm !== undefined) {
    return offsetFromSpineEm(spineEm, t.fontBoundingBoxAscent, t.fontBoundingBoxDescent, fontSize);
  }

  return spineOffsetEm(
    {
      fontAscent: t.fontBoundingBoxAscent,
      fontDescent: t.fontBoundingBoxDescent,
      spineAscent: t.actualBoundingBoxAscent,
      spineDescent: t.actualBoundingBoxDescent,
    },
    fontSize,
  );
}

/** Measures `family` and writes the result to `--vui-spine` on `el`. */
export async function applySpine(
  el: HTMLElement = document.documentElement,
  family = getComputedStyle(el).getPropertyValue('--vui-font-mongolian').trim(),
  options: SpineOptions = {},
): Promise<number | null> {
  const offset = await measureSpine(family, options);
  if (offset !== null) el.style.setProperty('--vui-spine', `${offset.toFixed(4)}em`);
  return offset;
}
