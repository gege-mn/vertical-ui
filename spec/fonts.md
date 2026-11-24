# Fonts: coverage, weight and vertical metrics

## Problem

Latin letters, hyphens or quotes inside Mongolian text appear in a different
font at the wrong weight. Bold Mongolian looks smeared. Upright marks (？！《）
sit low and collide with the next word. Text renders differently on Android,
Windows and macOS.

## Why

- Mongolian fonts often cover Mongolian and little else. Some web builds have
  no ASCII, digits, Cyrillic, «» or hyphen (U+002D), so those fall back to
  another family.
- Few Mongolian fonts have a bold; browsers synthesize one, which thickens the
  joins unevenly.
- Upright glyphs need vertical metrics (`vhea`/`vmtx` tables). Without them,
  or with wrong ones, they sit at the wrong height in the column. Different
  builds of one font can differ here: one may carry `vhea`/`vmtx` while
  another has none.
- Android ships no Mongolian font, and system copies elsewhere are old
  versions that shape differently.

## Rules

1. **SHOULD** self-host a pinned font version, with the version in the file
   name so long cache lifetimes are safe.
2. **MUST** check coverage for every character the interface uses, and choose
   characters the font has (《》 instead of «», U+1806 instead of `-`).
3. **MUST NOT** let the browser synthesize bold: `font-synthesis: none`, and
   declare only the weights the font has.
4. **MUST** serve a build that has `vhea`/`vmtx` if any upright punctuation is
   used.
5. **SHOULD** preload the font, and remeasure layout (spine offset, column
   lengths, scroll positions) after `document.fonts.ready`.
6. **MAY** use `font-display: block` on pages that are mostly Mongolian (a
   first paint in a fallback face is worse than a short wait) or `swap`
   elsewhere.

## Code

```css
@font-face {
  font-family: 'My Mongolian';
  src: url('/fonts/my-mongolian-1.000.woff2') format('woff2');
  font-weight: 400;
}
```

```sh
# Which code points below U+1800 does the font cover?
python3 -c "from fontTools.ttLib import TTFont; print(sorted(hex(c) for c in TTFont('font.ttf').getBestCmap() if c < 0x1800))"
```

## Test

For each UI string, every code point is in the served font's cmap, or the
string is styled with a font that covers it.

## Status

Coverage and metrics facts: checked against the fonts in common web use,
2026-11. Check your own font; it is the only one that matters.
