// Pre-release only: puts the current build into another project's node_modules
// without touching its package.json or lockfile, so nothing local-only gets committed.
// Usage: bun run try-in ../some-project
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const target = process.argv[2];
if (!target) throw new Error('usage: bun run try-in <project dir>');

const root = resolve(import.meta.dir, '..');
const run = (cmd: string[], cwd = root) => {
  const p = Bun.spawnSync(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' });
  if (p.exitCode !== 0) throw new Error(`${cmd.join(' ')} failed`);
};

run(['bun', 'run', 'build']);
const tmp = mkdtempSync(join(tmpdir(), 'vertical-ui-'));
run(['bun', 'pm', 'pack', '--destination', tmp, '--quiet']);
const tarball = [...new Bun.Glob('*.tgz').scanSync(tmp)][0];
if (!tarball) throw new Error('pack produced no tarball');

const dest = join(resolve(target), 'node_modules/@gege-mn/vertical-ui');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
run(['tar', '-xzf', join(tmp, tarball), '-C', dest, '--strip-components=1']);
rmSync(tmp, { recursive: true, force: true });
// Vite pre-bundles dependencies once; without this it keeps serving the old copy.
rmSync(join(resolve(target), 'node_modules/.vite'), { recursive: true, force: true });
console.log(`installed into ${dest} — restart its dev server: Vite keeps the old copy in memory`);
