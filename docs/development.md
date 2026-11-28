# Development

How the repository is laid out, the local tools, and how a release is
prepared.

## What goes where

- `spec/`: the knowledge base, one problem per page, in the fixed shape in
  `spec/README.md` (Problem, Why, Rules with MUST/SHOULD/MAY, Code, Test,
  Status). The code follows the spec; if they disagree, fix one in the same
  change.
- `src/`: zero runtime dependencies. Pure logic (`runs.ts`, `spine.ts`) is
  unit-tested in `test/`; the elements (`src/elements/`) stay thin over it.
- `src/index.ts`, the main entry, must stay safe to import during server
  rendering: nothing touches `document`, `customElements` or `HTMLElement` at
  module load. Browser-only code goes in `elements`, `define` or `debug`.
- `css/vertical-ui.css`: everything is prefixed `vui-` and sits in
  `@layer vui`.
- `skills/vertical-ui/SKILL.md` and `llms.txt`: the agent-facing index. Keep
  them in step when a spec page is added or renamed.
- `examples/`: one minimal page per spec page, planned (see `ROADMAP.md`).
- `ROADMAP.md`: what is released and what comes next.

`package.json` `files` ships `dist`, `src`, `css`, `spec`, `skills`,
`llms.txt`, `CHANGELOG.md` and `ROADMAP.md`. Nothing in `docs/`, `tools/`,
`scripts/` or `data/` is published.

## Tools

- `pnpm run try-in <project dir>` (`scripts/try-in.ts`): builds, packs, and
  unpacks the tarball into that project's `node_modules/@gege-mn/vertical-ui`,
  without touching its `package.json` or lockfile. It also clears the target's
  `node_modules/.vite` so Vite stops serving the old copy. For testing before a
  release only.
- `pnpm run tune` (`tools/spine-tuner/serve.ts`): a local-only page for tuning
  each installed font's spine offset by eye. Font paths come from the command
  line or `tools/spine-tuner/sources.local.txt` (gitignored, it describes one
  machine). `tools/spine-tuner/auto.py` measures the same offsets from the font
  files with the tuner server running. Results go to `data/spine-offsets.json`,
  which is gitignored: it names third-party fonts, and the library measures the
  spine at run time instead.
- `node tools/demo-gif/render.ts <font> <font> <font>` (after `pnpm run build`):
  renders the README's before/after GIF, `docs/media/spine-centred.gif`, with
  headless Chromium (or `CHROME=<binary>`) and ffmpeg. Pass three Mongolian
  fonts with clearly different spine offsets; the page measures each with
  `applySpine()`, and neither the GIF nor the page names them.

## Releases

Maintainers publish. An agent may bump the version, update `CHANGELOG.md`, run
build, typecheck and tests, check `pnpm pack --dry-run`, and report it ready.
`publishConfig.access` is public. `prepublishOnly` rebuilds, typechecks and
tests, so a publish never ships a stale `dist`.
