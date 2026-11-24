# Terms

**Column.** One line of vertical text. In Mongolian, letters stack top to
bottom and columns advance left to right.

**Line axis.** The direction text runs along a column: vertical. CSS calls its
size the *inline size*, so a column's `height` is its line length.

**Block axis.** The direction columns advance: horizontal. A block's `width`
is how many columns it holds.

**Column advance.** The distance from one column to the next: the used
`line-height`, not leading.

**Spine.** The vertical stem that joins Mongolian letters in a word. Letters
hang off it on both sides, so it, not a baseline, is what the eye aligns to.
Its position inside the column differs from font to font. See
[spine.md](spine.md).

**Em box and ink.** The em box is the space the font reserves; the ink is what
is drawn. In a Mongolian column the ink is usually off-centre in the box.

**Content area.** The box an inline run takes up: the font's ascent plus
descent. The line box is centred on it.

**Run.** A stretch of text in one script that gets one orientation.

**Sideways / upright.** Under `text-orientation: mixed`, Mongolian, Latin and
Cyrillic glyphs are drawn sideways (turned a quarter turn clockwise); CJK,
kana, Hangul, emoji and fullwidth forms stand upright (Unicode UAX #50).

**Canvas.** The horizontally scrolling surface that holds a vertical page.
