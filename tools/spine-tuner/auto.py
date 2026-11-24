"""Measures each font's spine from its files, so nobody has to tune 150 fonts by eye.

Run with the tuner server up (it decides which fonts exist and their ids):
    python3 tools/spine-tuner/auto.py [--sheets DIR]

Needs fontTools (+brotli for WOFF2), Pillow built with libraqm, and hb-shape.

Three spine estimates, all as the middle of the stem in em above the alphabetic baseline,
measured on horizontal text because browsers shape Mongolian horizontally and then turn it:
- letters: rows the stem runs through in real shaped words (what a reader sees as the spine);
- nirugu_context: the glyph U+180A becomes between two letters;
- nirugu_isolated: U+180A on its own.
"""

import hashlib
import json
import subprocess
import sys
import tempfile
import urllib.request
from datetime import date
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont, features

assert features.check("raqm"), "Pillow needs libraqm for Mongolian shaping"

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / "data" / "spine-offsets.json"
SERVER = "http://127.0.0.1:5177"


def cps(*xs):
    return "".join(chr(x) for x in xs)


NIRUGU = cps(0x180A)
A = cps(0x1820)
WORDS = [
    cps(0x182E, 0x1823, 0x1829, 0x182D, 0x1823, 0x182F),  # mongol
    cps(0x182A, 0x1822, 0x1834, 0x1822, 0x182D),  # bichig
    cps(0x182A, 0x1820, 0x1836, 0x1820, 0x1837, 0x182F, 0x1820, 0x182F, 0x1820),  # bayarlala
    cps(0x1830, 0x1820, 0x1822, 0x1828),  # sain
]
PX = 400  # render size for the letter scan
FOLLOW = [  # (fullName prefix, the font whose values it copies) — styles of one design share a spine
    ("Gege Pixel Mini", "Gege Pixel Mini Regular"),
    ("GegePixelMini", "Gege Pixel Mini Regular"),
    ("Gege Pixel", "Gege Pixel Regular"),
    ("GegePixel", "Gege Pixel Regular"),
]


def sources():
    lines = (HERE / "sources.local.txt").read_text().splitlines()
    return [Path(l.strip()).expanduser() for l in lines if l.strip() and not l.startswith("#")]


def font_paths():
    paths = {}
    for src in sources():
        files = [src] if src.is_file() else [p for p in src.rglob("*") if p.is_file()]
        for p in files:
            if p.suffix.lower() in {".ttf", ".otf", ".woff", ".woff2"}:
                paths.setdefault(hashlib.sha1(p.read_bytes()).hexdigest()[:12], p)
    return paths


def as_sfnt(path, tmp):
    """hb-shape and FreeType setups vary on WOFF2; hand them a plain sfnt."""
    if path.suffix.lower() not in {".woff", ".woff2"}:
        return path
    f = TTFont(path)
    f.flavor = None
    out = Path(tmp) / (path.stem + ".ttf")
    f.save(out)
    return out


def glyph_band(font, gid):
    name = font.getGlyphOrder()[gid]
    gs = font.getGlyphSet()
    pen = BoundsPen(gs)
    gs[name].draw(pen)
    if pen.bounds is None:
        return None
    upm = font["head"].unitsPerEm
    _, y0, _, y1 = pen.bounds
    return (y0 / upm, y1 / upm)


def shape(path, text):
    out = subprocess.run(
        ["hb-shape", "--no-glyph-names", "--output-format=json", "--script=Mong",
         "--language=mn", "--direction=ltr", str(path), text],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def run_band(font, path, text):
    """Union of the shaped glyphs' ink, in em: what canvas actualBoundingBox reports for the run."""
    upm = font["head"].unitsPerEm
    gs, order = font.getGlyphSet(), font.getGlyphOrder()
    lo = hi = None
    for g in shape(path, text):
        pen = BoundsPen(gs)
        gs[order[g["g"]]].draw(pen)
        if pen.bounds is None:
            continue
        a, b = pen.bounds[1] + g.get("dy", 0), pen.bounds[3] + g.get("dy", 0)
        lo = a if lo is None else min(lo, a)
        hi = b if hi is None else max(hi, b)
    return None if lo is None else (lo / upm, hi / upm)


def nirugu_bands(font, path):
    iso = shape(path, NIRUGU)
    ctx = shape(path, A + NIRUGU + A)
    iso_band = glyph_band(font, iso[0]["g"]) if iso and iso[0]["g"] else None
    clusters = sorted({g["cl"] for g in ctx})
    mid = [g for g in ctx if len(clusters) == 3 and g["cl"] == clusters[1]]
    ctx_band = glyph_band(font, mid[0]["g"]) if mid and mid[0]["g"] else None
    return iso_band, ctx_band


def letter_band(path):
    """The stem is the row band that runs almost the whole width of a shaped word."""
    font = ImageFont.truetype(str(path), PX, layout_engine=ImageFont.Layout.RAQM)
    mids, thick = [], []
    for word in WORDS:
        w = int(font.getlength(word, language="mn")) + PX
        h = PX * 3
        img = Image.new("L", (w, h), 0)
        base = PX * 2
        ImageDraw.Draw(img).text((PX // 2, base), word, font=font, fill=255, anchor="ls", language="mn")
        px = img.load()
        cols = [x for x in range(w) if any(px[x, y] > 127 for y in range(0, h, 2))]
        if len(cols) < PX // 4:
            continue
        x0, x1 = cols[0], cols[-1]
        cover = [sum(1 for x in range(x0, x1 + 1) if px[x, y] > 127) / (x1 - x0 + 1) for y in range(h)]
        peak = max(cover)
        if peak < 0.5:
            continue
        top = bottom = cover.index(peak)
        while top > 0 and cover[top - 1] >= 0.9 * peak:
            top -= 1
        while bottom < h - 1 and cover[bottom + 1] >= 0.9 * peak:
            bottom += 1
        mids.append((base - (top + bottom + 1) / 2) / PX)
        thick.append((bottom - top + 1) / PX)
    if not mids:
        return None
    mids.sort()
    return {"mid": mids[len(mids) // 2], "spread": mids[-1] - mids[0], "thickness": sorted(thick)[len(thick) // 2]}


def metrics(font):
    upm = font["head"].unitsPerEm
    os2 = font["OS/2"]
    hhea = font["hhea"]
    return {
        "hhea": [hhea.ascent / upm, -hhea.descent / upm],
        "typo": [os2.sTypoAscender / upm, -os2.sTypoDescender / upm],
        "win": [os2.usWinAscent / upm, os2.usWinDescent / upm],
        "useTypoMetrics": bool(os2.fsSelection & (1 << 7)),
    }


def offset(spine_mid, asc_desc):
    asc, desc = asc_desc
    return round(spine_mid - (asc - desc) / 2, 3)


def r3(x):
    return None if x is None else round(x, 3)


def main():
    sheets = Path(sys.argv[sys.argv.index("--sheets") + 1]) if "--sheets" in sys.argv else None
    listed = json.load(urllib.request.urlopen(f"{SERVER}/api/fonts"))["fonts"]
    paths = font_paths()
    saved = json.loads(OUT.read_text()) if OUT.exists() else {}
    by_name = {f["fullName"]: f for f in listed}
    results, rows = {}, []
    sheet_rows = 0
    today = date.today().isoformat()

    with tempfile.TemporaryDirectory() as tmp:
        for f in listed:
            path = paths.get(f["id"])
            leader = next((lead for pre, lead in FOLLOW if f["fullName"].startswith(pre)), None)
            entry = {k: f[k] for k in ("family", "fullName", "postscript", "version", "file")}
            if path is None:
                continue
            if leader and leader != f["fullName"]:
                entry.update(status="follows", follows=leader)
                results[f["id"]] = entry
                continue
            sfnt = as_sfnt(path, tmp)
            font = TTFont(sfnt)
            if 0x1820 not in font.getBestCmap():
                entry.update(status="skip", note="no Mongolian letters")
                results[f["id"]] = entry
                continue
            names = font["name"]
            for key, nid in (("family", 1), ("fullName", 4), ("postscript", 6), ("version", 5)):
                rec = names.getDebugName(nid)
                if rec:
                    entry[key] = rec.removeprefix("Version ").strip() if key == "version" else rec
            m = metrics(font)
            iso, ctx = nirugu_bands(font, sfnt)
            run = run_band(font, sfnt, NIRUGU * 5) if ctx else None
            try:
                letters = letter_band(sfnt)
            except OSError as err:  # some fonts' tables make FreeType refuse to render
                letters = None
                entry["note"] = f"render failed: {err}"
            # Five nirugus is what measureSpine() probes at run time; the joined nirugu and the
            # letter scan are cross-checks (the scan is fooled by heavy or decorated faces).
            spine = sum(run) / 2 if run else (letters["mid"] if letters else None)
            mids = {
                "letters": r3(letters["mid"]) if letters else None,
                "nirugu_context": r3(sum(ctx) / 2) if ctx else None,
                "nirugu_isolated": r3(sum(iso) / 2) if iso else None,
                "nirugu_run": r3(sum(run) / 2) if run else None,
            }
            flags = []
            if not ctx:
                flags.append("no joined nirugu")
            # Only a consistent letter scan is evidence against the nirugu.
            if letters and ctx and letters["spread"] <= 0.03 and abs(letters["mid"] - sum(ctx) / 2) > 0.02:
                flags.append(f"letters' stem at {letters['mid']:.3f}em, nirugu at {sum(ctx) / 2:.3f}em")
            notes = []
            if iso and ctx and abs(sum(iso) / 2 - sum(ctx) / 2) > 0.005:
                notes.append(f"isolated nirugu at {sum(iso) / 2:.3f}em, joined at {sum(ctx) / 2:.3f}em")
            entry.update(
                spineEm=r3(spine),
                stemEm=r3(letters["thickness"]) if letters else None,
                estimates=mids,
                metrics={k: ([r3(v) for v in val] if isinstance(val, list) else val) for k, val in m.items()},
                # Offset from the column's middle, toward the right in vertical-lr, per metrics source.
                offsetEm=offset(spine, m["hhea"]) if spine is not None else None,
                offsetByMetrics={k: offset(spine, m[k]) for k in ("hhea", "typo", "win")} if spine is not None else None,
                status="auto" if spine is not None and not flags else "odd",
                flags=flags,
                notes=notes,
                updated=today,
            )
            prev = saved.get(f["id"], {})
            if prev.get("status") == "ok":  # a human said ok: keep their number beside the measurement
                entry.update(status="ok", offsetEm=prev["offsetEm"], measuredOffsetEm=entry["offsetEm"])
            results[f["id"]] = entry
            rows.append((f["fullName"], spine, mids["nirugu_context"], flags))
            if sheets and (flags or f["fullName"] in REVIEW_ALWAYS):
                try:
                    render_row(sfnt, f["fullName"], spine, mids["letters"], sheets, sheet_rows + 1)
                    sheet_rows += 1
                except OSError:
                    print(f"cannot render {f['fullName']} for the sheet")

    for e in results.values():
        if e.get("status") == "follows":
            lead = next((r for r in results.values() if r["fullName"] == e["follows"]), None)
            if lead:
                for k in ("spineEm", "stemEm", "offsetEm", "offsetByMetrics", "metrics"):
                    if k in lead:
                        e[k] = lead[k]

    OUT.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n")
    counts = {}
    for e in results.values():
        counts[e["status"]] = counts.get(e["status"], 0) + 1
    print(json.dumps(counts))
    for name, _spine, _nir, flags in rows:
        if flags:
            print(f"ODD  {name}: {'; '.join(flags)}")
    _ = by_name


REVIEW_ALWAYS = {"Gege Pixel Regular", "Gege Pixel Mini Regular"}
ROW_H = 260
SHEET_ROWS = 12


def render_row(path, name, spine, other, sheets, n):
    """Contact sheet: words drawn horizontally, red = spine used, blue dashes = the letter scan."""
    sheets.mkdir(parents=True, exist_ok=True)
    sheet_no, row_no = divmod(n - 1, SHEET_ROWS)
    sheet_path = sheets / f"sheet-{sheet_no + 1:02d}.png"
    W = 1800
    img = Image.open(sheet_path) if sheet_path.exists() and row_no else Image.new("RGB", (W, ROW_H * SHEET_ROWS), "white")
    d = ImageDraw.Draw(img)
    size = 110
    font = ImageFont.truetype(str(path), size, layout_engine=ImageFont.Layout.RAQM)
    label = ImageFont.load_default(18)
    y_top = row_no * ROW_H
    base = y_top + 175
    d.text((10, y_top + 8), name, fill="black", font=label)
    text = " ".join(WORDS) + " " + A + NIRUGU + A + NIRUGU + A
    d.text((10, base), text, font=font, fill="black", anchor="ls", language="mn")
    if spine is not None:
        y = base - spine * size
        d.line([(0, y), (W, y)], fill=(229, 56, 59), width=1)
    if other is not None:
        y = base - other * size
        for x in range(0, W, 14):
            d.line([(x, y + 3), (x + 7, y + 3)], fill=(47, 111, 223), width=1)
    d.line([(0, y_top + ROW_H - 1), (W, y_top + ROW_H - 1)], fill=(220, 220, 220))
    img.save(sheet_path)


if __name__ == "__main__":
    main()
