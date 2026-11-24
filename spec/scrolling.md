# Scrolling a horizontal canvas

## Problem

The page holds columns that continue to the right, but a mouse wheel does
nothing, or scrolls a hidden vertical overflow.

## Why

A mouse wheel sends vertical deltas. A horizontal scroller ignores them
unless you map them. Trackpads and touchscreens already send horizontal
deltas and must be left alone.

## Rules

1. **MUST** map vertical wheel deltas to horizontal scrolling on the canvas,
   and leave mostly-horizontal deltas to the browser.
2. **MUST NOT** gate the mapping on `(pointer: fine)`: touchscreen laptops
   report coarse pointers and still have wheels.
3. **MUST** leave wheel and keys alone inside inputs, text areas, editable
   content, dialogs and popovers; leave keys alone on buttons, links and
   other controls that use them; and leave the wheel to a nested panel that
   can still scroll vertically.
4. **SHOULD** let the wheel pass through at the canvas's ends, so an outer
   page can scroll.
5. **SHOULD** map ↓/↑, Page Down/Up, Space, Home and End onto the canvas,
   without smooth scrolling under `prefers-reduced-motion`.
6. **SHOULD NOT** combine wheel mapping with CSS scroll snap: snap re-snaps
   after every small step and pins the scroll in place.
7. **MUST NOT** set `direction: rtl` on a Mongolian canvas.

## Code

```html
<vui-scroller>…panels…</vui-scroller>
```

## Test

Dispatch a `wheel` event with `deltaY: 100` and check that `scrollLeft`
increased and `scrollTop` did not.

## Status

The pattern: seen working on production sites in Chromium (2026-11).
`<vui-scroller>` itself: not yet used on a live site. Firefox and Safari:
**untested**.
