# Extracts the owners' shirt moldes from ESTAMPAS WEB.pdf into recolorable artwork for the builder.
#
# Each molde is three pieces (front, back, sleeve). For each piece:
#   - the artwork is every drawing under a clip whose centre is inside the piece (logos and seam marks
#     sit under the page clip, so they are left out); inner clips are kept as SVG clipPaths, the piece's
#     own outline clip is not (the design runs past the outline, so the seams show no gap);
#   - the sleeve's cuff band (a full-width band at the cuff) is taken out: the builder paints it in the
#     cuff color, from `cuffFrom` (share of the sleeve image, cap -> cuff along x) to the edge;
#   - colors become roles by the area they really cover (measured by rasterizing), the largest first;
#     a color that covers next to nothing is an artifact and takes the role of the nearest gray.
# A molde whose SVG is light is written as SVG (`data-color-slot` / `data-stroke-slot` roles). A heavy one
# is written as a color mask PNG: red, green and blue are the coverage of roles 2, 3 and 4, and what is
# left is role 1; the browser mixes the user's colors from it.
#
# usage: python scripts/moldes/extract_moldes.py "ESTAMPAS WEB.pdf"
#        (writes public/patterns/moldes/ and lib/builder/catalog/moldes.generated.ts)
import io
import json
import os
import sys

import numpy as np
import pymupdf
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "public", "patterns", "moldes")
OUT_TS = os.path.join(ROOT, "lib", "builder", "catalog", "moldes.generated.ts")
COUNT = 20
ROLES = ["primary", "secondary", "accent", "quaternary"]
BACK_RATIO = 0.7732  # back panel width / front panel width on the 3D model (GEPE_UV_REGIONS)
SVG_SIZE = 512
MASK_SIZE = {"front": 1024, "back": 1024, "sleeve": 512}
THUMB_SIZE = 192
# A molde whose three SVGs weigh more than this is written as masks.
SVG_BUDGET = 260_000
# A color covering less than this share of the molde is an artifact.
MIN_SHARE = 0.004
BLACK = "#231f20"
# Keys the masks are drawn with: role 1 is black, roles 2-4 are pure red, green and blue.
MASK_KEYS = {"primary": "#000000", "secondary": "#ff0000", "accent": "#00ff00", "quaternary": "#0000ff"}


def hexof(c):
    return "#%02x%02x%02x" % tuple(round(v * 255) for v in c)


def luma(h):
    return 0.299 * int(h[1:3], 16) + 0.587 * int(h[3:5], 16) + 0.114 * int(h[5:7], 16)


def fmt(v):
    return ("%.1f" % v).rstrip("0").rstrip(".")


def path_d(items):
    out, cur = [], None
    for it in items:
        op = it[0]
        if op == "l":
            p1, p2 = it[1], it[2]
            if cur is None or abs(cur.x - p1.x) > 0.01 or abs(cur.y - p1.y) > 0.01:
                out.append(f"M{fmt(p1.x)} {fmt(p1.y)}")
            out.append(f"L{fmt(p2.x)} {fmt(p2.y)}")
            cur = p2
        elif op == "c":
            p1, c1, c2, p2 = it[1], it[2], it[3], it[4]
            if cur is None or abs(cur.x - p1.x) > 0.01 or abs(cur.y - p1.y) > 0.01:
                out.append(f"M{fmt(p1.x)} {fmt(p1.y)}")
            out.append(f"C{fmt(c1.x)} {fmt(c1.y)} {fmt(c2.x)} {fmt(c2.y)} {fmt(p2.x)} {fmt(p2.y)}")
            cur = p2
        elif op == "re":
            r = it[1]
            out.append(f"M{fmt(r.x0)} {fmt(r.y0)}H{fmt(r.x1)}V{fmt(r.y1)}H{fmt(r.x0)}Z")
            cur = None
        elif op == "qu":
            q = it[1]
            out.append(
                f"M{fmt(q.ul.x)} {fmt(q.ul.y)}L{fmt(q.ur.x)} {fmt(q.ur.y)}L{fmt(q.lr.x)} {fmt(q.lr.y)}L{fmt(q.ll.x)} {fmt(q.ll.y)}Z"
            )
            cur = None
    return "".join(out)


class Clip:
    def __init__(self, n, drawing):
        self.id = f"c{n}"
        self.rect = drawing["scissor"]
        self.d = path_d(drawing["items"])
        self.even_odd = bool(drawing.get("even_odd"))


def scan(page):
    """Piece-sized clips and outline strokes, and every drawing with the chain of clips it is under."""
    dr = page.get_drawings(extended=True)
    full = page.rect
    clips, outlines, fills, page_fills, stack = [], [], [], [], []
    n = 0
    for x in dr:
        lvl = x["level"]
        while stack and stack[-1][0] >= lvl:
            stack.pop()
        if x["type"] == "clip":
            r = x["scissor"]
            is_page = r.width > full.width * 0.9 or r.is_empty
            n += 1
            stack.append((lvl, None if is_page else Clip(n, x)))
            if not is_page and r.width > 150 and r.height > 150:
                clips.append(r)
        elif x["type"] == "group":
            # Blend modes (molde 16's Overlay bands) are ignored: each band is a color of its own.
            stack.append((lvl, None))
        else:
            chain = [c for _, c in stack if c is not None]
            if x["type"] == "s" and x.get("color") and hexof(x["color"]) == BLACK and len(x["items"]) >= 10 and x["rect"].width > 150:
                outlines.append(x["rect"])
            elif chain and x["type"] in ("f", "fs", "s"):
                fills.append((chain, x))
            elif x["type"] in ("f", "fs"):
                page_fills.append(x)
    return clips, outlines, fills, page_fills


def piece_rects(page_scan):
    """[(front, back, sleeve)] rects per molde slot, top to bottom (the first sleeve when there are two)."""
    clips, outlines, _, _ = page_scan
    boxes = outlines + clips
    fronts, backs, sleeves = [], [], []
    for b in boxes:
        # Fronts start at the left margin and backs in the middle column; the sleeve column (x > 800) has
        # body-sized clips too, which are not backs.
        if 380 < b.width < 420 and b.height > 500 and b.x0 < 700:
            group = fronts if b.x0 < 200 else backs
            if not any(abs(g.y0 - b.y0) < 30 and abs(g.x0 - b.x0) < 30 for g in group):
                group.append(b)
        elif b.x0 > 830 and 300 < b.width < 360 and 150 < b.height < 220:
            if not any(abs(g.y0 - b.y0) < 30 for g in sleeves):
                sleeves.append(b)
    fronts.sort(key=lambda r: r.y0)
    out = []
    for f in fronts:
        back = min(backs, key=lambda b: abs(b.y0 - f.y0)) if backs else None
        if back is None or abs(back.y0 - f.y0) > 60:
            back = pymupdf.Rect(f.x0 + 405.5, f.y0, f.x1 + 405.5, f.y1 + 32)
        sleeve = min((s_ for s_ in sleeves if f.y0 - 200 < s_.y0 < f.y1), key=lambda s_: s_.y0)
        out.append((f, back, sleeve))
    return out


def near(a, b, tol=15):
    return abs(a.x0 - b.x0) < tol and abs(a.y0 - b.y0) < tol and abs(a.x1 - b.x1) < tol and abs(a.y1 - b.y1) < tol


class Piece:
    def __init__(self, page_scan, kind, r):
        _, _, fills, page_fills = page_scan
        self.kind, self.r = kind, r
        self.page_fills = page_fills
        self.fills = []
        for chain, x in fills:
            inner = chain[-1].rect
            if not r.contains(pymupdf.Point((inner.x0 + inner.x1) / 2, (inner.y0 + inner.y1) / 2)):
                continue
            # The piece's own outline is not kept: the design runs on past it.
            kept = [c for c in chain if not near(c.rect, r) and c.rect.width < r.width * 1.5]
            self.fills.append((kept, x))
        self.base = (1.0, 1.0, 1.0)
        for x in page_fills:
            if near(x["rect"], r, 8) and x.get("fill"):
                self.base = x["fill"]
        inner = pymupdf.Rect(r.x0 + 2, r.y0 + 2, r.x1 - 2, r.y1 - 2)
        for chain, x in self.fills:
            if x["type"] != "s" and not chain and x["rect"].contains(inner):
                self.base = x["fill"]
        self.cuff = None

    def take_cuff(self):
        """Takes the cuff band out of a sleeve: a plain full-width band resting on the cuff edge."""
        r = self.r

        def is_band(x):
            return (
                x["type"] != "s"
                and len(x["items"]) == 1
                and x["rect"].width > r.width * 0.85
                and x["rect"].height < r.height * 0.3
                and x["rect"].y1 >= r.y1 - 4
                and x["rect"].y0 > r.y1 - r.height * 0.3
                and x["rect"].x0 > r.x0 - 30
                and x["rect"].x1 < r.x1 + 30
            )

        bands = [(chain, x) for chain, x in self.fills if is_band(x)]
        # Molde 19 draws its cuff outside the sleeve's clip.
        loose = [x for x in self.page_fills if is_band(x)]
        if not bands and not loose:
            return
        top = min(x["rect"].y0 for x in [x for _, x in bands] + loose)
        self.cuff = {"from": (top - r.y0) / r.height}
        self.fills = [f for f in self.fills if f not in bands]

    def colors(self):
        out = [hexof(self.base)]
        for _, x in self.fills:
            out.append(hexof(x["color"] if x["type"] == "s" else x["fill"]))
        return out


def body_view(piece, front_rect):
    W, H = front_rect.width, front_rect.height
    if piece.kind == "front":
        vx = front_rect.x0
    else:
        bc = (piece.r.x0 + piece.r.x1) / 2
        vx = bc - (1 - BACK_RATIO / 2) * W
    return vx, front_rect.y0, W, H


def transform(piece, front_rect, size):
    """The matrix from PDF space to the piece's image, `size` px square."""
    if piece.kind == "sleeve":
        r = piece.r
        # The model's sleeve image runs shoulder -> cuff along x and round the arm along y.
        return (0, size / r.width, size / r.height, 0, -r.y0 * size / r.height, -r.x0 * size / r.width)
    vx, vy, vw, vh = body_view(piece, front_rect)
    return (size / vw, 0, 0, size / vh, -vx * size / vw, -vy * size / vh)


def svg_markup(piece, front_rect, size, paint, attrs):
    """The piece as SVG. `paint(hex)` gives the color key for a PDF color; `attrs` whether to write roles
    (data-color-slot) or plain fills (for rasterizing)."""
    m = transform(piece, front_rect, size)
    defs, body = {}, []
    open_chain = []
    run = {"key": None, "d": []}

    def flush():
        if run["d"]:
            kind, color, rule, width = run["key"]
            d = "".join(run["d"])
            if kind == "s":
                body.append(f'<path {attrs(color, True)} fill="none" stroke-width="{fmt(width)}" d="{d}"/>')
            else:
                r = ' fill-rule="evenodd"' if rule else ""
                body.append(f'<path {attrs(color, False)}{r} d="{d}"/>')
        run["d"] = []

    for chain, x in piece.fills:
        k = 0
        while k < len(open_chain) and k < len(chain) and open_chain[k] is chain[k]:
            k += 1
        if k != len(open_chain) or k != len(chain):
            flush()
            run["key"] = None
            for _ in range(len(open_chain) - k):
                body.append("</g>")
            for c in chain[k:]:
                defs[c.id] = c
                body.append(f'<g clip-path="url(#{c.id})">')
            open_chain = list(chain)
        if x["type"] == "s":
            key = ("s", paint(hexof(x["color"])), False, x.get("width") or 1)
        else:
            key = ("f", paint(hexof(x["fill"])), bool(x.get("even_odd")), 0)
        if key != run["key"]:
            flush()
            run["key"] = key
        run["d"].append(path_d(x["items"]))
    flush()
    body += ["</g>"] * len(open_chain)

    clip_defs = "".join(
        f'<clipPath id="{c.id}"><path{" clip-rule=\"evenodd\"" if c.even_odd else ""} d="{c.d}"/></clipPath>'
        for c in defs.values()
    )
    mat = " ".join("%.6f" % v for v in m)
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">',
            f'<rect {attrs(paint(hexof(piece.base)), False)} x="0" y="0" width="{size}" height="{size}"/>',
            f'<g transform="matrix({mat})">',
            f"<defs>{clip_defs}</defs>" if clip_defs else "",
            *body,
            "</g>",
            "</svg>",
        ]
    )


def rasterize(markup, aa=True):
    pymupdf.TOOLS.set_aa_level(8 if aa else 0)
    doc = pymupdf.open(stream=markup.encode(), filetype="svg")
    pix = doc[0].get_pixmap(alpha=False)
    return np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)[:, :, :3]


def measure(pieces, front_rect, colors):
    """Area each PDF color really covers, over the three pieces (the sleeve without its cuff)."""
    keys = {c: "#%02x%02x%02x" % (i * 9 + 3, (i * 37) % 256, (i * 71) % 256) for i, c in enumerate(colors)}
    lookup = {tuple(int(k[j : j + 2], 16) for j in (1, 3, 5)): c for c, k in keys.items()}
    area = {c: 0 for c in colors}
    size = 256
    for p in pieces:
        img = rasterize(svg_markup(p, front_rect, size, lambda h: keys[h], lambda col, s: f'{"stroke" if s else "fill"}="{col}"'), aa=False)
        if p.kind == "sleeve" and p.cuff:
            img = img[:, : int(p.cuff["from"] * size)]
        flat = img.reshape(-1, 3)
        uniq, counts = np.unique(flat, axis=0, return_counts=True)
        for u, n in zip(uniq, counts):
            c = lookup.get(tuple(int(v) for v in u))
            if c:
                area[c] += int(n)
    return area


def main():
    pdf = sys.argv[1]
    os.makedirs(OUT_DIR, exist_ok=True)
    doc = pymupdf.open(pdf)
    scans = {}
    entries = []
    for n in range(1, COUNT + 1):
        pi = (n - 1) // 4
        if pi not in scans:
            scans[pi] = scan(doc[pi])
        rf, rb, rs = piece_rects(scans[pi])[(n - 1) % 4]
        front, back, sleeve = Piece(scans[pi], "front", rf), Piece(scans[pi], "back", rb), Piece(scans[pi], "sleeve", rs)
        sleeve.take_cuff()
        pieces = [front, back, sleeve]
        colors = list(dict.fromkeys(c for p in pieces for c in p.colors()))
        area = measure(pieces, rf, colors)
        total = sum(area.values()) or 1
        kept = sorted((c for c in colors if area[c] / total >= MIN_SHARE), key=lambda c: -area[c])[: len(ROLES)]
        role_of = {c: ROLES[i] for i, c in enumerate(kept)}
        for c in colors:
            if c not in role_of:
                role_of[c] = role_of[min(kept, key=lambda k: abs(luma(k) - luma(c)))]

        name = f"molde-{n:02d}"
        roles_attr = lambda col, s: f'data-{"stroke" if s else "color"}-slot="{col}"'
        svgs = {p.kind: svg_markup(p, rf, SVG_SIZE, lambda h: role_of[h], roles_attr) for p in pieces}
        weight = sum(len(s) for s in svgs.values())
        fmt_ = "svg" if weight <= SVG_BUDGET else "png"
        for old in os.listdir(OUT_DIR):
            if old.startswith(name + "-"):
                os.remove(os.path.join(OUT_DIR, old))
        for p in pieces:
            path = os.path.join(OUT_DIR, f"{name}-{p.kind}.{fmt_}")
            if fmt_ == "svg":
                with open(path, "w", encoding="utf-8", newline="\n") as f:
                    f.write(svgs[p.kind] + "\n")
            else:
                size = MASK_SIZE[p.kind]
                markup = svg_markup(p, rf, size, lambda h: MASK_KEYS[role_of[h]], lambda col, s: f'{"stroke" if s else "fill"}="{col}"')
                img = Image.fromarray(np.ascontiguousarray(rasterize(markup)), "RGB")
                img = img.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                img.save(path, optimize=True)
                if p.kind == "front":
                    # The Design panel shows every molde at once: a small mask is enough for its thumbnail.
                    thumb = rasterize(svg_markup(p, rf, THUMB_SIZE, lambda h: MASK_KEYS[role_of[h]], lambda col, s: f'{"stroke" if s else "fill"}="{col}"'))
                    thumb_img = Image.fromarray(np.ascontiguousarray(thumb), "RGB")
                    thumb_img = thumb_img.quantize(colors=32, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                    thumb_img.save(os.path.join(OUT_DIR, f"{name}-thumb.png"), optimize=True)
        entries.append(
            {
                "id": name,
                "format": fmt_,
                "roles": ROLES[: len(kept)],
                "cuffFrom": round(sleeve.cuff["from"], 4) if sleeve.cuff else None,
                "pdfColors": {role_of[c]: c for c in reversed(kept)},
                "share": {role_of[c]: round(area[c] / total, 3) for c in kept},
            }
        )
        print(name, fmt_, round(weight / 1000), "KB svg", entries[-1]["roles"], "cuff", entries[-1]["cuffFrom"], entries[-1]["share"], flush=True)

    lines = [
        "// Generated by scripts/moldes/extract_moldes.py from the owners' ESTAMPAS WEB.pdf: do not edit by hand.",
        'import type { PatternRole } from "../texture/svg-recolor";',
        "",
        "export type MoldeData = {",
        "  id: string;",
        '  /** "svg": artwork with roles; "png": color mask (red, green, blue = roles 2-4, the rest role 1). */',
        '  format: "svg" | "png";',
        "  /** Roles the molde uses, the one covering the most first. */",
        "  roles: PatternRole[];",
        "  /** Where the cuff band starts along the sleeve image (cap -> cuff), or null when it has none. */",
        "  cuffFrom: number | null;",
        "};",
        "",
        "export const MOLDES_DATA: MoldeData[] = [",
    ]
    for e in entries:
        roles = ", ".join(json.dumps(r) for r in e["roles"])
        lines.append(f'  {{ id: "{e["id"]}", format: "{e["format"]}", roles: [{roles}], cuffFrom: {json.dumps(e["cuffFrom"])} }},')
    lines.append("];")
    with open(OUT_TS, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
