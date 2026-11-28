// Local-only tool: renders the README's before/after GIF of spine-centred buttons.
// Usage: pnpm run build && node tools/demo-gif/render.ts <font> <font> <font> [out.gif]
// Needs ffmpeg and a Chromium (set CHROME, or it looks in the usual places).
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const WIDTH = 720;
const HEIGHT = 360;
const FPS = 20;
// Seconds: hold before, move, hold after, move back.
const TIMELINE = [1.4, 0.6, 2.0, 0.6];

const args = process.argv.slice(2);
const fonts = args.filter((a) => /\.(ttf|otf|woff2?)$/i.test(a)).map((a) => resolve(a));
const out = resolve(
  args.find((a) => a.endsWith('.gif')) ?? join(ROOT, 'docs/media/spine-centred.gif'),
);
if (fonts.length !== 3) {
  console.error('Pass exactly three Mongolian font files, each with a different spine offset.');
  process.exit(1);
}
if (!existsSync(join(ROOT, 'dist/index.js'))) {
  console.error('Run `pnpm run build` first.');
  process.exit(1);
}

function findChrome(): string {
  if (process.env.CHROME) return process.env.CHROME;
  const playwright = join(homedir(), 'Library/Caches/ms-playwright');
  const shells = existsSync(playwright)
    ? readdirSync(playwright)
        .filter((d) => d.startsWith('chromium_headless_shell'))
        .sort()
        .reverse()
        .flatMap((d) => {
          const dir = join(playwright, d);
          return readdirSync(dir).map((sub) => join(dir, sub, 'chrome-headless-shell'));
        })
    : [];
  const found = [
    ...shells,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
  ].find(existsSync);
  if (!found) throw new Error('No Chromium found; set CHROME to its binary.');
  return found;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
};

const server = createServer((req, res) => {
  const path = new URL(req.url ?? '/', 'http://x').pathname;
  const font = /^\/font\/(\d)$/.exec(path);
  const file = font
    ? fonts[Number(font[1])]
    : path === '/'
      ? join(import.meta.dirname, 'index.html')
      : /^\/(dist|css)\/[\w./-]+$/.test(path) && !path.includes('..')
        ? join(ROOT, path)
        : undefined;
  if (!file || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const profile = mkdtempSync(join(tmpdir(), 'vui-gif-'));
const chrome = spawn(findChrome(), [
  '--headless',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  '--hide-scrollbars',
  '--font-render-hinting=none',
  'about:blank',
]);
const browserWs = await new Promise<string>((done, fail) => {
  let log = '';
  chrome.stderr.on('data', (chunk: Buffer) => {
    log += chunk;
    const m = /DevTools listening on (ws:\/\/\S+)/.exec(log);
    if (m) done(m[1]);
  });
  chrome.on('exit', () => fail(new Error(`Chromium exited:\n${log}`)));
});

const debugPort = new URL(browserWs).port;
const targets = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()) as {
  type: string;
  webSocketDebuggerUrl: string;
}[];
const page = targets.find((t) => t.type === 'page');
if (!page) throw new Error('No page target.');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done) => ws.addEventListener('open', done, { once: true }));
let nextId = 0;
const pending = new Map<number, { done: (v: unknown) => void; fail: (e: Error) => void }>();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(String(e.data));
  const call = pending.get(msg.id);
  if (!call) return;
  pending.delete(msg.id);
  if (msg.error) call.fail(new Error(msg.error.message));
  else call.done(msg.result);
});
function send<T = Record<string, unknown>>(method: string, params = {}): Promise<T> {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((done, fail) => pending.set(id, { done: done as (v: unknown) => void, fail }));
}
async function evaluate(expression: string): Promise<void> {
  const r = await send<{ exceptionDetails?: { exception?: { description?: string } } }>(
    'Runtime.evaluate',
    { expression, awaitPromise: true },
  );
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? expression);
}

await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH,
  height: HEIGHT,
  deviceScaleFactor: 2,
  mobile: false,
});
await send('Page.enable');
const loaded = new Promise((done) =>
  ws.addEventListener('message', (e) => {
    if (JSON.parse(String(e.data)).method === 'Page.loadEventFired') done(undefined);
  }),
);
await send('Page.navigate', { url: origin });
await loaded;
await evaluate('window.ready');

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2);
const [holdBefore, move, holdAfter, moveBack] = TIMELINE.map((s) => Math.round(s * FPS));
const ts = [
  ...Array(holdBefore).fill(0),
  ...Array.from({ length: move }, (_, i) => ease((i + 1) / move)),
  ...Array(holdAfter).fill(1),
  ...Array.from({ length: moveBack }, (_, i) => 1 - ease((i + 1) / moveBack)),
];

const frames = mkdtempSync(join(tmpdir(), 'vui-frames-'));
for (const [i, t] of ts.entries()) {
  await evaluate(`setT(${t})`);
  const { data } = await send<{ data: string }>('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(frames, `${String(i).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
}
ws.close();
chrome.kill();
server.close();

mkdirSync(dirname(out), { recursive: true });
// Kept at 2x: the README shows it at half size, so it stays sharp on high-density screens.
const ffmpeg = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    join(frames, '%04d.png'),
    '-vf',
    `split[a][b];[a]palettegen=stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
    '-loop',
    '0',
    out,
  ],
  { stdio: 'inherit' },
);
rmSync(frames, { recursive: true, force: true });
rmSync(profile, { recursive: true, force: true });
if (ffmpeg.status !== 0) process.exit(ffmpeg.status ?? 1);
console.log(`${out} (${ts.length} frames)`);
