# vertical-ui

A public spec, CSS and web-component package for vertical-text interfaces,
Mongolian script first. Published as `@gege-mn/vertical-ui`.

## What goes where

- `spec/`: the knowledge base, one problem per page, in the fixed shape in
  `spec/README.md` (Problem, Why, Rules with MUST/SHOULD/MAY, Code, Test,
  Status). The code follows the spec; if they disagree, fix one in the same
  change.
- `src/`: zero runtime dependencies. Pure logic (`runs.ts`, `spine.ts`) is
  unit-tested; elements stay thin over it.
- The main entry (`src/index.ts`) must stay safe to import during server
  rendering: nothing touches `document`, `customElements` or `HTMLElement`
  at module load. Browser-only code goes in `elements`, `define` or `debug`.
- `bun run try-in <project>` puts the current build into another project's
  `node_modules` for testing before a release, without touching its
  package.json.
- `css/vertical-ui.css`: everything is prefixed `vui-`.
- `skills/vertical-ui/SKILL.md` and `llms.txt`: the agent-facing index. Keep
  them in step when a spec page is added or renamed.

## Rules for contributions

- **This is a public spec.** Write rules that hold for any site. A house
  style or one product's preference is at most a MAY with its options named.
  Don't cite private projects, people or internal paths.
- Mark measured facts with the font version, engine and date; mark the rest
  **untested**. Don't claim an engine was verified unless it was.
- **Never type invisible characters as literals** (MVS U+180E, NNBSP U+202F,
  FVS1–4, ZWJ/ZWNJ, nirugu U+180A, BOM): `\u` escapes in code, `U+XXXX` in
  prose. `test/no-invisible-literals.test.ts` checks every source and doc
  file. Tools that write files can turn escapes into literals, so run the
  tests after writing.
- Encoding questions belong to the `mongol-bichig` knowledge base; link to it.
- Elements use light DOM: `@font-face` and `::highlight()` don't reach into
  shadow roots.

## Commands

pnpm, with `pnpm-lock.yaml` committed. `pnpm test`, `pnpm typecheck`,
`pnpm lint`, `pnpm build`. Biome: 2-space indent, single quotes, width 100.

## Releases

Maintainers publish. An agent may bump the version, update CHANGELOG.md, run
build, typecheck and tests, check `pnpm pack --dry-run`, and report it ready.
`publishConfig.access` is public. `prepublishOnly` rebuilds, typechecks and
tests, so a publish never ships a stale `dist`.
