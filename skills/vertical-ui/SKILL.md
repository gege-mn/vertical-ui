---
name: vertical-ui
description: Rules for laying out user interfaces in vertical text on the web, starting with traditional Mongolian script (Mongol bichig) - spine alignment of icons and controls, upright vs sideways runs (Latin, digits, CJK, emoji, punctuation), column sizing and silent overflow, logical properties in vertical-lr, styling without breaking letter shapes, fonts, horizontal scrolling and small screens. Use when building, reviewing or debugging a page or component that sets text with writing-mode vertical-lr or vertical-rl, or lang mn-Mong.
---

# vertical-ui

The full rules are in the package's `spec/` folder, one page per problem.
Read the page for the problem at hand.

## The short version

1. Mongolian is `writing-mode: vertical-lr` with `text-orientation: mixed`,
   never `vertical-rl`, `upright` or a rotated horizontal block.
2. Keep the page horizontal; make text blocks vertical; scroll one canvas
   sideways and map the mouse wheel onto it.
3. Align icons and controls to the font's **spine**, not the text's box:
   centre, then shift by `--vui-spine` (measured per font).
4. Height is line length, width is column count, line-height is the gap
   between columns. Give vertical blocks a definite height; cap type by height
   too, because a word can't break and overflow is silent.
5. Logical properties turn with the text: `margin-block-start` is left,
   `text-align: center` is the vertical middle.
6. Never split a word across elements; highlight with the CSS Custom
   Highlight API or overlays; fade with `opacity`.
7. CJK and emoji stay upright, Latin and Cyrillic lie sideways. Choose
   orientation per run at render time; `text-combine-upright` only for 1–2
   characters; fullwidth upright punctuation.
8. Check font coverage for every character; no synthesized bold; serve a
   build with vertical metrics; remeasure after `document.fonts.ready`.
9. Prove layout with geometry tests, not by eye.

| Problem | Page |
|---|---|
| Words: spine, column, line axis, block axis | `spec/terms.md` |
| Column direction, what scrolls | `spec/page-model.md` |
| Icons and boxes off the text | `spec/spine.md` |
| Something faces the wrong way | `spec/orientation.md` |
| Columns collapse, clip or overflow | `spec/columns.md` |
| Margins and alignment turn sideways | `spec/logical-directions.md` |
| Styling changes letter shapes | `spec/shaping-safe-styling.md` |
| Missing glyphs, fake bold, upright marks | `spec/fonts.md` |
| Mouse wheel doesn't scroll | `spec/scrolling.md` |
| Phones, notches, landscape | `spec/small-screens.md` |
