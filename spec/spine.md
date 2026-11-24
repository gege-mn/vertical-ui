# Aligning to the spine

## Problem

An icon next to a word, a bullet before a list item, a checkbox beside a label
or a badge inside a line sits visibly off the text, even though both boxes are
centred.

## Why

Horizontal text aligns on a baseline, and ascenders and descenders hang off
it. Mongolian has a spine instead: a stem that runs down the whole word, with
letters reaching out on both sides. The eye aligns things to the spine.

Mongolian fonts are designed horizontally and turned a quarter turn clockwise
for vertical text. So in a column:

- the font's ascent faces right and its descent faces left;
- the line box is centred on the content area (ascent + descent), not on the
  ink;
- the spine sits wherever the type designer put the stem, which is rarely the
  middle of the content area, and differs from font to font.

So centring a box beside a column centres it on the font's reserved space, not
on the spine. How far off depends on the font: among 157 Mongolian fonts measured
(2026-11), offsets range from −0.18em to +0.38em, and two versions of the
same font can differ. A font can be re-centred by editing its vertical metrics,
but then it is a modified font and must be renamed; shifting by the measured
offset leaves the font alone.

The offset also depends on the platform. Browsers on Windows may take ascent
and descent from different font tables (OS/2 `usWin*`) than macOS and Linux
(`hhea`), which moves the line's middle. The spine's height above the
baseline does not change. So the font-specific number to record is the
**spine height**, and the line's middle is read from the browser at run time.

## Rules

1. **MUST** treat the spine offset as a property of the font, its version and
   the platform, never as a constant.
2. **SHOULD** measure the spine from a run of five U+180A MONGOLIAN NIRUGU,
   which shapes like the stem inside a word. A lone nirugu can be drawn
   differently (up to 0.011em off in the fonts measured; the run is within
   0.006em).
3. **SHOULD** align by centring both boxes on the cross axis, then shifting
   by the spine offset: move the **text** when it sits inside a visible box
   (a button, pill or tab, whose border is centred too), and move the
   **item** (icon, bullet) when it sits beside free-standing text.
4. **SHOULD** position decorations (rules, highlights, focus rings, carets) by
   the spine and ink, not by the text's box.
5. **MAY** draw connecting lines (timelines, tree lines) on the spine, so they
   read as a continuation of the stem.

## Code

The offset in em, from the middle of the line box, toward the right:

```
offset = spineHeight − (ascent − descent) / 2
```

`spineHeight` is the middle of the ink of five nirugus, above the baseline.
`ascent` and `descent` are the browser's own content area. `measureSpine()`
reads both from one canvas `measureText()` call, so it works for any font,
including ones nobody has measured, and matches the platform it runs on. A
font with no nirugu returns null; pass its spine height as `spineEm`.

`data/spine-offsets.json` (made by `tools/spine-tuner/auto.py`) records the
measured values for known fonts. It is test data for the measurement, not a
lookup table the runtime needs.

```ts
import { applySpine } from '@gege-mn/vertical-ui';
await document.fonts.ready;
await applySpine(); // sets --vui-spine on :root for --vui-font-mongolian
await applySpine(el, 'Some Font', { spineEm: 0.4 }); // a font with no nirugu
```

```css
.item { display: flex; flex-direction: column; align-items: center; }
.item > .icon { translate: var(--vui-spine) 0; }  /* class="vui-on-spine" */
.button > .label { translate: calc(-1 * var(--vui-spine)) 0; }  /* class="vui-spine-centered" */
```

`em` in `--vui-spine` resolves against the element that uses it, so shift an
icon only if it has the text's font size, or convert to px.

For a self-hosted, pinned font, seed `--vui-spine` in CSS with its measured
value, so the first paint is already right; `applySpine()` then confirms or
corrects it after the font loads.

## Test

After `document.fonts.ready`, the horizontal centre of the icon's box equals
the horizontal centre of the nirugu's ink in the column (Range rects of a
probe), within 1px.

## Status

Spine heights: measured from the font files for 157 fonts with HarfBuzz
14.4 and checked on rendered contact sheets (2026-11). Seven decorative or
outline faces are marked for a human look. Whether each engine's canvas
`fontBoundingBox*` matches the metrics it uses for layout: **untested**.
