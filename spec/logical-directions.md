# Logical directions turn with the text

## Problem

An "indent" adds a gap on the left. `text-align: center` centres
vertically. A grid inside vertical text lays its rows out as columns. A
caption meant to sit under a picture has nowhere to go.

## Why

Logical properties follow the writing mode. In `vertical-lr`:

| Property | Means |
|---|---|
| `margin-block-start` / `padding-block-start` | left |
| `margin-inline-start` | top |
| `text-align: start / center / end` | top / middle / bottom |
| a grid's or flex row's inline direction | down |

## Rules

1. **MUST** read logical properties inside vertical text as rotated, and use
   physical ones (`left`, `top`) where you mean a fixed side.
2. **SHOULD** put captions and labels beside things, not under them, with
   `align-items: stretch` so both share top and bottom edges.
3. **SHOULD** turn rows into columns: a table row or list item is a column.
4. **SHOULD** point arrows along the reading direction: down along a
   column, right to the next column.
5. **MAY** use a grid inside a vertical box on purpose, so that every item in
   a list shares the same tracks.

## Code

```css
/* A button is a column: icon on top, word below. */
.button { display: flex; flex-direction: column; align-items: center; }
```

## Test

Assert rect order: in a row of items, each one's left edge is right of the
previous one's right edge.

## Status

Seen working on production sites in Chromium (2026-11). Firefox and Safari: **untested** here.
