# Roadmap

## 0.1: layout core (released)

- Spec pages: terms, page model, spine, orientation, columns, logical
  directions, shaping-safe styling, fonts, scrolling, small screens.
- `vertical-ui.css`, `<vui-text>`, `<vui-scroller>`, `orientRuns()`,
  `measureSpine()`/`applySpine()`, `showSpines()`.

## 0.2

- `examples/`: one minimal page per spec page, which doubles as the geometry
  test fixture.
- Geometry tests in Chromium, Firefox and WebKit (Playwright).
- A Svelte action that centres a label on its spine with no global setup.

## Next

- **Controls and components**: buttons, inputs, select, checkbox and radio
  on the spine, menus, tooltips, tabs, tables as columns, charts with
  upright figures. Native form controls with vertical `writing-mode` are
  recent in every engine and still need testing.
- **Accessibility**: screen readers read Mongolian script poorly. A
  hidden same-language twin in Cyrillic or Latin, accessible names, focus
  order across columns, arrow-key navigation.
- **Testing helpers**: Playwright assertions (`toBeOnSpine`,
  `toNotOverflowColumn`, `toBeUpright`), run after `document.fonts.ready`.
- **Svelte wrappers**, then React: thin components over the same core, so
  frameworks that own their children don't fight `<vui-text>`.
- **CJK** (`vertical-rl`): ruby, emphasis marks, tate-chu-yoko, kinsoku,
  right-to-left canvas.
- **Outside the browser**: share cards, SVG, canvas, PDF and print. Shape
  horizontally, rotate a quarter turn, turn upright runs back.
- **Text input**: caret, selection and hit-testing in columns, IME, paste
  normalization. The hardest part; it may become its own package.
- **Other scripts**: Todo, Manchu, Sibe, Ali Gali.
- **Lint rules**: a stylelint plugin that flags `vertical-rl` on Mongolian,
  `upright` on Mongolian, `text-combine-upright` on long runs, and rotated
  text.
- **Pages beside other languages**: a vertical Mongolian mode next to
  horizontal languages on one site: routing, metadata, share cards.
