# Orientation: what lies sideways and what stands up

## Problem

Inside Mongolian text, a Latin word, a number, a Chinese name, an emoji or a
question mark faces the wrong way: lying on its side when it should stand, or
squeezed into one box until it is unreadable.

## Why

Under `text-orientation: mixed`, each character's default comes from Unicode
UAX #50: Mongolian, Latin, Cyrillic and ASCII digits and punctuation lie
sideways; CJK, kana, Hangul, emoji and fullwidth forms stand upright. That
default is usually right. It goes wrong when:

- a page fakes vertical text by rotating horizontal text (`transform`, SVG,
  canvas, a native toolkit's rotated box). Rotation turns everything, so CJK
  and emoji lie down;
- someone sets `text-orientation: sideways` or `writing-mode: sideways-lr`
  to fix one script, and it breaks the upright ones;
- short numbers or codes need to read normally and are left sideways, or are
  forced into `text-combine-upright` when they are too long for it;
- ASCII punctuation (`? ! ( )`) lies sideways where an upright mark is wanted.

## Rules

1. **MUST** keep CJK, kana, Hangul and emoji upright. With real
   `writing-mode` and `mixed` this happens by itself; don't override it.
2. **MUST**, where text has to be rotated (canvas, SVG, images, toolkits
   without vertical text), split it into runs and turn the upright runs back.
3. **MUST NOT** use `text-combine-upright` on more than two characters: it
   squeezes the whole run into one em box.
4. **MUST** decide orientation per run at render time, so the stored string
   stays exactly as written.
5. **SHOULD** use fullwidth forms (U+FF01 ！, U+FF1F ？, U+FF08/9 （）) for
   upright punctuation, and **MUST NOT** use the legacy vertical presentation
   forms (U+FE10–FE4F).
6. **MAY** stand short numbers up (combine 1–2 digits), set longer ones as a
   small `horizontal-tb` island, or leave them sideways. Pick one per kind of
   number and keep to it: data and badges are often upright, running text
   often sideways.
7. **MAY** stand very short Latin or Cyrillic (codes, initials) upright.

## Code

```ts
import { defaultPolicy, orientRuns } from '@gege-mn/vertical-ui';
const runs = orientRuns(text, { ...defaultPolicy, uprightCyrillic: 3 });
// [{ text, orientation: 'native' | 'combine' | 'upright' | 'horizontal' }, …]
```

`orientRuns()` keeps whitespace at a turned run's edges outside it (an
upright space takes a full em) and merges neighbouring native text, so a
framework can render the list directly. `<vui-text text="…" combine-digits="2"
upright-latin="0" upright-cyrillic="0">` does the same for plain HTML.

## Test

For each run, compare its Range rect's aspect ratio with the expected
orientation. A combined run fits in one em box; a sideways run is taller than
wide.

## Status

`segment()` and `orientRuns()`: unit-tested. The rendering pattern: seen
working on production sites in Chromium (2026-11); the package code is not
yet on a live site. Firefox and Safari: **untested**.
