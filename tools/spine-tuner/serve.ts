// Local-only tool: serves fonts from this machine to the tuning page and saves the results.
// Usage: node tools/spine-tuner/serve.ts [font files or folders…]
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUT = join(ROOT, 'data/spine-offsets.json');
const HOME = homedir();
// In shared system font folders, only files whose names look Mongolian are taken.
const MONGOLIAN_NAME = /mongol|bichig/i;
const SHARED_FOLDER = /\/Library\/Fonts|\/fonts$/i;
// One path per line, kept out of git because it describes this machine.
const SOURCES_FILE = join(import.meta.dirname, 'sources.local.txt');

interface FontEntry {
  id: string;
  path: string;
  file: string;
  family: string;
  fullName: string;
  postscript: string;
  version: string;
}

function walk(path: string, onlyMongolianNames: boolean): string[] {
  if (!existsSync(path)) return [];
  const st = statSync(path);
  if (st.isFile()) return /\.(ttf|otf|woff2?)$/i.test(path) ? [path] : [];
  return readdirSync(path).flatMap((name) => {
    if (name.startsWith('.') || name === 'node_modules') return [];
    const child = join(path, name);
    const isFile = statSync(child).isFile();
    if (isFile && onlyMongolianNames && !MONGOLIAN_NAME.test(name)) return [];
    return walk(child, onlyMongolianNames);
  });
}

/** Reads the sfnt `name` table (TTF/OTF only; WOFF is compressed). */
function readNames(buf: Buffer): Record<number, string> {
  const names: Record<number, string> = {};
  const tag = buf.toString('latin1', 0, 4);
  if (tag === 'wOFF' || tag === 'wOF2') return names;
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('latin1', rec, rec + 4) !== 'name') continue;
    const table = buf.readUInt32BE(rec + 8);
    const count = buf.readUInt16BE(table + 2);
    const strings = table + buf.readUInt16BE(table + 4);
    for (let j = 0; j < count; j++) {
      const r = table + 6 + j * 12;
      const platform = buf.readUInt16BE(r);
      const lang = buf.readUInt16BE(r + 4);
      const nameId = buf.readUInt16BE(r + 6);
      const length = buf.readUInt16BE(r + 8);
      const start = strings + buf.readUInt16BE(r + 10);
      const raw = buf.subarray(start, start + length);
      let value: string;
      if (platform === 3 || platform === 0) {
        value = Buffer.from(raw).swap16().toString('utf16le');
      } else if (platform === 1) {
        value = raw.toString('latin1');
      } else continue;
      // Prefer Windows English names; keep the first one seen otherwise.
      if (names[nameId] === undefined || (platform === 3 && lang === 0x409)) names[nameId] = value;
    }
  }
  return names;
}

function scan(sources: string[]): FontEntry[] {
  const seen = new Set<string>();
  const fonts: FontEntry[] = [];
  for (const source of sources) {
    const onlyMongolianNames = SHARED_FOLDER.test(source);
    for (const path of walk(source, onlyMongolianNames)) {
      const buf = readFileSync(path);
      const id = createHash('sha1').update(buf).digest('hex').slice(0, 12);
      if (seen.has(id)) continue;
      seen.add(id);
      let names: Record<number, string> = {};
      try {
        names = readNames(buf);
      } catch {}
      const stem = basename(path, extname(path));
      fonts.push({
        id,
        path,
        file: basename(path),
        family: names[16] ?? names[1] ?? stem,
        fullName: names[4] ?? stem,
        postscript: names[6] ?? stem,
        version: (names[5] ?? '').replace(/^Version\s*/i, ''),
      });
    }
  }
  // The same font is often installed as .ttf, .otf and .woff2: keep one per name and version,
  // and drop a WOFF whose file stem matches an sfnt's (its name table isn't readable here).
  const sfntKey = (f: FontEntry) => `${f.fullName}|${f.version}`;
  const isWoff = (f: FontEntry) => /\.woff2?$/i.test(f.file);
  const stems = new Set(
    fonts
      .filter((f) => !isWoff(f))
      .flatMap((f) => [basename(f.file, extname(f.file)), f.postscript]),
  );
  const keys = new Set<string>();
  const unique = fonts.filter((f) => {
    if (isWoff(f)) return !stems.has(basename(f.file, extname(f.file)));
    if (keys.has(sfntKey(f))) return false;
    keys.add(sfntKey(f));
    return true;
  });
  return unique.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

const sources =
  process.argv.length > 2
    ? process.argv.slice(2)
    : existsSync(SOURCES_FILE)
      ? readFileSync(SOURCES_FILE, 'utf8')
          .split('\n')
          .map((l) => l.trim().replace(/^~/, HOME))
          .filter((l) => l && !l.startsWith('#'))
      : [join(HOME, 'Library/Fonts'), '/Library/Fonts', '/System/Library/Fonts/Supplemental'];
const fonts = scan(sources);
const byId = new Map(fonts.map((f) => [f.id, f]));
const TYPES: Record<string, string> = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const PORT = Number(process.env.PORT ?? 5177);
const HOSTNAME = '127.0.0.1';

createServer(async (req, res) => {
  const reply = (status: number, body: string | Buffer, type = 'text/plain;charset=utf-8') => {
    res.writeHead(status, { 'content-type': type });
    res.end(body);
  };
  const json = (data: unknown) => reply(200, JSON.stringify(data), 'application/json');
  try {
    const url = new URL(req.url ?? '/', `http://${HOSTNAME}`);
    // Loopback alone doesn't stop other sites: DNS rebinding reaches it with a foreign Host,
    // and a page's no-cors POST arrives with a foreign Origin.
    const host = req.headers.host ?? '';
    const origin = req.headers.origin;
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return reply(403, 'forbidden');
    if (origin !== undefined && origin !== `http://${host}`) return reply(403, 'forbidden');
    if (url.pathname === '/')
      return reply(
        200,
        readFileSync(join(import.meta.dirname, 'index.html')),
        'text/html;charset=utf-8',
      );
    if (url.pathname === '/api/fonts') {
      const saved = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
      return json({
        fonts: fonts.map(({ path: _path, ...f }) => f),
        saved,
      });
    }
    if (url.pathname.startsWith('/font/')) {
      const font = byId.get(url.pathname.slice(6));
      if (!font) return reply(404, 'not found');
      return reply(
        200,
        readFileSync(font.path),
        TYPES[extname(font.path).toLowerCase()] ?? 'application/octet-stream',
      );
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk);
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`);
      return json({ ok: true, count: Object.keys(data).length });
    }
    return reply(404, 'not found');
  } catch (err) {
    console.error(err);
    reply(500, 'internal error');
  }
}).listen(PORT, HOSTNAME, () => {
  console.log(`${fonts.length} fonts — http://${HOSTNAME}:${PORT}/`);
});
