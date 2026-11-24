# Page model: which way columns go, and what scrolls

## Problem

Columns go right to left, the page opens at the wrong end, or the whole page
is rotated and nothing but the Mongolian reads correctly.

## Why

Mongolian stacks glyphs top to bottom like CJK but advances columns **left to
right**, the opposite of Japanese and Chinese. Layouts copied from CJK
vertical sites run backwards. Rotating a horizontal page with `transform`
turns every script on it, including the ones that should stand upright.

| Script | Glyphs | Columns advance | `writing-mode` | Page reveals |
|---|---|---|---|---|
| Mongolian | top to bottom | left to right | `vertical-lr` | rightward |
| CJK | top to bottom | right to left | `vertical-rl` | leftward |

## Rules

1. **MUST** set Mongolian with `writing-mode: vertical-lr`, never
   `vertical-rl`, and never by rotating horizontal text.
2. **MUST** use `text-orientation: mixed` on Mongolian. `upright` stands
   every letter up and breaks the joins.
3. **SHOULD** keep the page itself horizontal and make only text blocks
   vertical: one horizontally scrolling canvas holds panels, and panels hold
   vertical islands. A vertical root makes every component library, form
   control and third-party widget turn sideways with it.
4. **SHOULD** put persistent chrome (navigation, back link, logo) on the left,
   the edge reading starts from.
5. **MUST** mark Mongolian with `lang="mn-Mong"`, which selects the font's
   Mongolian language system, and other-script spans with their own `lang`.

## Code

```css
html, body { height: 100%; overflow: hidden; }
.canvas { position: fixed; inset: 0; display: flex; overflow: auto hidden; }
.vui-mongolian { writing-mode: vertical-lr; text-orientation: mixed; }
```

`<vui-scroller>` is the canvas; `.vui-mongolian` and `<vui-text>` are the
islands. Scrolling is in [scrolling.md](scrolling.md).

## Test

The first column's left edge is left of the second's. The canvas's
`scrollLeft` starts at 0 and grows as you read.

## Status

Seen working on production sites in Chromium (2026-11). Firefox and Safari: **untested** here.
