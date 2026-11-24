# Small screens, notches and landscape phones

## Problem

Columns are cut off by the browser's toolbars, hidden behind a notch in
landscape, or too short to hold one word on a landscape phone.

## Why

Vertical text spends the viewport's height, the dimension phones have least of
in landscape and that toolbars eat. In landscape the notch sits on the left or
right edge, where a horizontal canvas starts and ends.

## Rules

1. **MUST** size by dynamic viewport units (`dvh`), not `vh`.
2. **MUST** use `viewport-fit=cover` with `env(safe-area-inset-*)`, and pad
   the canvas's first panel by the left inset and its last by the right inset.
3. **SHOULD** derive fixed chrome's safe bands from its own size, never from
   another element's offset.
4. **SHOULD**, on short windows (under about 500px tall), move bottom
   navigation to the left edge.
5. **MUST** test at least a narrow portrait phone, a landscape phone, a small
   laptop and a large screen.

## Code

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.canvas > :first-child { padding-left: env(safe-area-inset-left); }
.canvas > :last-child  { padding-right: env(safe-area-inset-right); }
```

## Test

The geometry checks in [columns.md](columns.md), run at 320×568, 844×390,
1280×800 and 2560×1440.

## Status

Chromium device emulation: verified (2026-11). Real iOS Safari: **untested**.
