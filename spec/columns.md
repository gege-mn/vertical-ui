# Columns: collapsing, clipping and silent overflow

## Problem

A paragraph renders as one column and clips the rest. A vertical label grows
taller than the screen. A long word runs off the bottom of a card with no
scrollbar and no warning.

## Why

- A vertical block inside a horizontal parent is an *orthogonal flow*. It
  needs a definite line length (height); without one it grows to fit its
  content.
- A block of several columns with no definite width resolves to one column.
- A Mongolian word cannot break. Breaks happen only at spaces; MVS and FVS are
  not break points. When the longest word is longer than the column, it
  overflows downward, silently.

## Rules

1. **MUST** give every vertical block a definite block size on the line
   axis: a `height`, or a `max-height` from the space available.
2. **MUST** give multi-column blocks a width, preferably in `em`, so it
   follows the font size.
3. **MUST** cap type size by height as well as width (`min(…vw, …vh)` in a
   `clamp()`), so the longest word in that style still fits.
4. **SHOULD** use `minmax(0, 1fr)` in grids, so a column's minimum content
   can't push the row taller than the viewport.
5. **SHOULD** treat `line-height` as the gap between columns: about 1.7–1.9
   for body text, about 1.05–1.15 for display sizes. Space paragraphs with
   `gap` on a flex row, not margins.

## Code

```css
:root { --avail: calc(100dvh - 2 * var(--pad)); }
.label { max-height: var(--avail); }
.title { font-size: clamp(40px, min(10vw, 9.5vh), 150px); }
.body  { width: 30em; }
```

## Test

For every vertical block, `scrollHeight <= clientHeight` after
`document.fonts.ready`, at a narrow portrait phone, a landscape phone and a
laptop size.

## Status

Seen working on production sites in Chromium (2026-11). Firefox and Safari: **untested** here.
