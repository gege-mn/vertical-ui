# vertical-ui

A public spec, CSS and web-component package for vertical-text interfaces,
Mongolian script first. Published as `@gege-mn/vertical-ui`.

## Commands

`pnpm run build` · `pnpm run typecheck` · `pnpm run test` · `pnpm run lint`.
`pnpm run try-in <project dir>` puts the current build into another project's
`node_modules` before a release. Biome: 2-space indent, single quotes, width 100.

## Rules

- **This is a public spec.** Write rules that hold for any site. A house
  style or one product's preference is at most a MAY with its options named.
  Don't cite private projects, people or internal paths, and the library and
  its docs name no fonts.
- The code follows `spec/`; if they disagree, fix one in the same change. Keep
  `skills/vertical-ui/SKILL.md` and `llms.txt` in step when a spec page is
  added or renamed.
- Mark measured facts with the font version, engine and date; mark the rest
  **untested**. Don't claim an engine was verified unless it was.
- **Never type invisible characters as literals** (MVS U+180E, NNBSP U+202F,
  FVS1–4, ZWJ/ZWNJ, nirugu U+180A, BOM): `\u` escapes in code, `U+XXXX` in
  prose. `test/no-invisible-literals.test.ts` checks every source and doc
  file. Tools that write files can turn escapes into literals, so run the
  tests after writing.
- `src/` has zero runtime dependencies, and `src/index.ts` stays safe to import
  during server rendering: browser-only code goes in `elements`, `define` or
  `debug`.
- Elements use light DOM: `@font-face` and `::highlight()` don't reach into
  shadow roots. CSS is prefixed `vui-`.
- Encoding questions belong to the `mongol-bichig` knowledge base; link to it.
- Maintainers publish. An agent may prepare a release and report it ready
  (`docs/development.md`).

## Docs

- `docs/development.md` — what goes where, what ships to npm, the try-in and spine-tuner tools, preparing a release
- `spec/README.md` — the shape every spec page follows and the MUST/SHOULD/MAY levels; read before writing a spec page
- `ROADMAP.md` — what is released and what comes next
