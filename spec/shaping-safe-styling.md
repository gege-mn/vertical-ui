# Styling without changing letter shapes

## Problem

Highlighting, linking or colouring part of a word changes the letters around
it. Faded text shows dark seams at the joins. An underline reads as a stray
stroke.

## Why

Mongolian letters take a different shape at the start, middle and end of a
word. A shaper decides the shape from the letter's neighbours **within one
run**. An element boundary inside a word can split the run, and each piece is
shaped as if it were its own word. Joined letters also overlap slightly at the
joins, so per-glyph transparency paints the overlap twice.

## Rules

1. **MUST NOT** split a word across elements to style part of it. Widen the
   element to the whole word, or paint over the text instead: the CSS Custom
   Highlight API, or an overlay positioned from Range rects.
2. **MUST** fade joined text with `opacity` on the element, not with a
   translucent `color`.
3. **SHOULD NOT** underline links in vertical Mongolian text; mark them
   another way (colour, weight of a side rule, an icon).
4. **MUST** make a drop cap a whole word, never a sliced glyph.
5. **SHOULD** use U+1801 MONGOLIAN ELLIPSIS for an ellipsis that stacks in the
   column, and U+1806 MONGOLIAN TODO SOFT HYPHEN for a hyphen that sits on the
   spine.

## Code

```ts
const range = new Range();
range.setStart(textNode, start);
range.setEnd(textNode, end);
CSS.highlights.set('find', new Highlight(range));
```

```css
::highlight(find) { background-color: #ffe08a; }
```

## Test

Compare glyph widths of a word with and without the style applied. Any
difference means the run was split.

## Status

Seen working on production sites in Chromium (2026-11). Firefox and Safari: **untested** here.
