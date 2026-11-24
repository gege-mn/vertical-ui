// Invisible format characters typed as literals get silently lost or changed by editors,
// clipboards and language models, and the bug they cause is invisible too.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** MVS, NNBSP, FVS1–4, ZWNJ, ZWJ, BOM, nirugu. */
const INVISIBLE = /\u202F|\u180E|\u180B|\u180C|\u180D|\u180F|\u200C|\u200D|\uFEFF|\u180A/;
const SKIP = new Set(['node_modules', 'dist', '.git']);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|md|css|html|txt|svelte)$/.test(name) ? [path] : [];
  });
}

describe('no invisible literals', () => {
  const files = walk(ROOT);

  it.each(files.map((f) => [f.slice(ROOT.length), f] as const))('%s', (_name, path) => {
    const offenders = readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, i) => (INVISIBLE.test(line) ? [i + 1] : []));
    expect(offenders, `invisible literal on line(s) ${offenders.join(', ')}`).toEqual([]);
  });
});
