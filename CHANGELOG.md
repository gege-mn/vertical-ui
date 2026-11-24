# Changelog

## Unreleased

- `--vui-font-mongolian` defaults to `sans-serif`; set it to your font. The
  spec no longer names specific fonts.

## 0.1.0 — 2026-11-24

First release: the layout core for vertical Mongolian script.

- Spec pages: terms, page model, spine, orientation, columns, logical
  directions, shaping-safe styling, fonts, scrolling, small screens.
- Spine: `measureSpine()` / `applySpine()` measure any font's spine from five
  U+180A at run time and write `--vui-spine`; `spineEm` overrides a font with
  no nirugu. CSS classes `vui-spine-centered` (text inside a box) and
  `vui-on-spine` (an item beside text).
- Orientation: `segment()`, `orient()`, `orientRuns()`, with separate
  thresholds for digits, Latin and Cyrillic.
- Elements (`/elements`, `/define`): `<vui-text>`, `<vui-scroller>`.
- `/debug`: `showSpines()` draws every vertical Mongolian column's spine.
- `vertical-ui.css` in `@layer vui`; the main entry is safe to import during
  server rendering.
