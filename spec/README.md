# The vertical-ui spec

Rules for drawing user interfaces in vertical text on the web. Traditional
Mongolian script (Mongol bichig) comes first, because its problems are the
least documented. CJK (`vertical-rl`) comes after and shares much of the model.

Each page is one problem, written the same way so a person or a code agent can
apply it without reading the rest:

1. **Problem**: what goes wrong, as you would see it on screen.
2. **Why**: the mechanism behind it.
3. **Rules**: numbered, each with a level (below).
4. **Code**: the smallest CSS or JS that applies the rules.
5. **Test**: how to prove it with geometry, not by eye.
6. **Status**: which engines it was verified in, and when.

## Levels

- **MUST**: ignoring it visibly breaks text (wrong letter shapes, clipped or
  overlapping columns, sideways CJK).
- **SHOULD**: the default. Depart from it only for a stated reason.
- **MAY**: a design choice. The spec names the options and doesn't pick one.

A house style is never a MUST. If a rule only says what a particular site
prefers, it is a MAY or it does not belong here.

## Pages

| Page | Problem | Release |
|---|---|---|
| [terms.md](terms.md) | Shared words: spine, column, line axis, block axis, run | 0.1 |
| [page-model.md](page-model.md) | Which way columns go, and what scrolls | 0.1 |
| [spine.md](spine.md) | Icons, bullets and boxes don't line up with the text | 0.1 |
| [orientation.md](orientation.md) | Latin, digits, CJK, emoji and punctuation lie the wrong way | 0.1 |
| [columns.md](columns.md) | Columns collapse, clip or overflow silently | 0.1 |
| [logical-directions.md](logical-directions.md) | Margins, alignment and grids turn sideways | 0.1 |
| [shaping-safe-styling.md](shaping-safe-styling.md) | Styling a word changes its letter shapes | 0.1 |
| [fonts.md](fonts.md) | Missing glyphs, fake bold, misplaced upright marks | 0.1 |
| [scrolling.md](scrolling.md) | A mouse wheel scrolls nowhere | 0.1 |
| [small-screens.md](small-screens.md) | Notches, landscape phones, short windows | 0.1 |

Planned pages are listed in [../ROADMAP.md](../ROADMAP.md).

## Writing a page

- Facts that were measured carry the font version, engine and date.
  Anything not yet tested is marked **untested**. Do not drop the mark until
  someone has checked it.
- Never type an invisible character (MVS U+180E, NNBSP U+202F, FVS1–4,
  ZWJ/ZWNJ, nirugu U+180A, BOM). Write `U+XXXX` in prose and `\u` escapes in
  code; the test suite fails on literals.
- Encoding questions (MVS vs NNBSP, FVS, suffixes) are out of scope: link to
  the `mongol-bichig` knowledge base instead.
