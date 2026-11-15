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
# Measured on public/models/gepe_shirt.obj. The side seam runs from the hem (v 0.0576) to the armpit (v 0.355),
# and the shoulder seam is at v 0.5: the armpit is this share of the panel's height down from the shoulder.
MODEL_ARMPIT = (0.5 - 0.355) / (0.5 - 0.0576)
# How wide the panels really are round the body: UV width x 3D length per UV unit along u.
MODEL_FRONT_W = 0.3536 * 296.9
MODEL_BACK_W = 0.2734 * 291.4
# How each molde goes round the body (see Geometry); the rest use DEFAULT_MODE.
DEFAULT_MODE = os.environ.get("MOLDE_MODE", "panel")
MODES = {}
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
    clips, outlines, fills, page_fills, stack, outline_drawings = [], [], [], [], [], []
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
                outline_drawings.append(x)
            elif chain and x["type"] in ("f", "fs", "s"):
                fills.append((chain, x))
            elif x["type"] in ("f", "fs"):
                page_fills.append(x)
    return clips, outlines, fills, page_fills, outline_drawings


def piece_rects(page_scan):
    """[(front, back, sleeve)] rects per molde slot, top to bottom (the first sleeve when there are two)."""
    clips, outlines = page_scan[0], page_scan[1]
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
        fills, page_fills = page_scan[2], page_scan[3]
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


class Geometry:
    """How a molde's PDF pieces go onto the model's front and back panels.

    Up the body, the side seam decides: the PDF's side seam, from the hem to the armpit, lands on the
    model's, so what reaches the line under the arm is what the PDF has there, on the front and the back
    alike (both pieces share their page heights). Round the body there are two ways, since the model's back
    is narrower than its front while the PDF's pieces are as wide as each other:
      - "panel": each PDF piece fills its own panel, seam to seam (the back comes out narrower);
      - "strip": one scale round the body, as a strip back | front | back, so the PDF's seam sits a little
        forward of the model's and the front shows the edges of the back."""

    def __init__(self, front, back, mode):
        self.front, self.back, self.mode = front, back, mode
        self.arm, self.hem = front.seam

    def matrix(self, kind, size):
        fr, rb = self.front.r, self.back.r
        sy = size * (1 - MODEL_ARMPIT) / (self.hem - self.arm)
        ty = size - self.hem * sy
        if self.mode == "panel":
            if kind == "front":
                sx = size / fr.width
                tx = -fr.x0 * sx
            else:
                # The compositor draws a front-wide back image turned 180deg, ending at the back panel's seam:
                # what lands on the cloth is the image's left BACK_RATIO. The whole PDF back goes there.
                sx = BACK_RATIO * size / rb.width
                tx = -rb.x0 * sx
        else:
            round_pdf = fr.width + rb.width
            round_model = MODEL_FRONT_W + MODEL_BACK_W
            if kind == "front":
                sx = size / (round_pdf * MODEL_FRONT_W / round_model)
                tx = size / 2 - (fr.x0 + fr.x1) / 2 * sx
            else:
                sx = BACK_RATIO * size / (round_pdf * MODEL_BACK_W / round_model)
                tx = BACK_RATIO / 2 * size - (rb.x0 + rb.x1) / 2 * sx
        return (sx, 0, 0, sy, tx, ty)

    def layers(self, kind):
        """(piece, dx, x-range it is cut to) drawn in the image of `kind`."""
        fr, rb = self.front.r, self.back.r
        if kind == "front":
            if self.mode == "strip":
                # The back goes on past both side seams: its right edge meets the front's left edge, and its
                # left edge the front's right edge.
                return [
                    (self.back, fr.x0 - rb.x1, (fr.x0 - rb.width - 50, fr.x0)),
                    (self.back, fr.x1 - rb.x0, (fr.x1, fr.x1 + rb.width + 50)),
                    (self.front, 0, (fr.x0, fr.x1)),
                ]
            return [(self.front, 0, None)]
        return [(self.back, 0, None)]


def seam_span(outline_drawings, r):
    """(armpit, hem) page heights of a body piece's side seam: where its outline runs straight down its edge."""
    pts = []
    for x in outline_drawings:
        if abs(x["rect"].x0 - r.x0) < 5 and abs(x["rect"].y0 - r.y0) < 40:
            for it in x["items"]:
                pts += [p for p in it[1:] if isinstance(p, pymupdf.Point) and abs(p.x - r.x0) < 1.5]
    if not pts:
        raise SystemExit(f"no side seam found for the piece at {r}")
    return min(p.y for p in pts), max(p.y for p in pts)


def sleeve_matrix(piece, size):
    r = piece.r
    # The model's sleeve image runs shoulder -> cuff along x and round the arm along y.
    return (0, size / r.width, size / r.height, 0, -r.y0 * size / r.height, -r.x0 * size / r.width)


def svg_markup(piece, geo, size, paint, attrs):
    """The piece as SVG. `paint(hex)` gives the color key for a PDF color; `attrs` whether to write roles
    (data-color-slot) or plain fills (for rasterizing)."""
    if piece.kind == "sleeve":
        m, layers = sleeve_matrix(piece, size), [(piece, 0, None)]
    else:
        m, layers = geo.matrix(piece.kind, size), geo.layers(piece.kind)
    defs, body = {}, []
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
        run["key"] = None

    for n, (layer, dx, cut) in enumerate(layers):
        opened = 0
        if cut is not None:
            cid = f"cut{n}"
            defs[cid] = f'<clipPath id="{cid}"><rect x="{fmt(cut[0])}" y="-10000" width="{fmt(cut[1] - cut[0])}" height="20000"/></clipPath>'
            body.append(f'<g clip-path="url(#{cid})">')
            opened += 1
        if dx:
            body.append(f'<g transform="translate({fmt(dx)} 0)">')
            opened += 1
        r = layer.r
        base = attrs(paint(hexof(layer.base)), False)
        body.append(f'<rect {base} x="{fmt(r.x0 - 2000)}" y="{fmt(r.y0 - 2000)}" width="{fmt(r.width + 4000)}" height="{fmt(r.height + 4000)}"/>')
        open_chain = []
        for chain, x in layer.fills:
            k = 0
            while k < len(open_chain) and k < len(chain) and open_chain[k] is chain[k]:
                k += 1
            if k != len(open_chain) or k != len(chain):
                flush()
                body.extend(["</g>"] * (len(open_chain) - k))
                for c in chain[k:]:
                    rule = ' clip-rule="evenodd"' if c.even_odd else ""
                    defs[c.id] = f'<clipPath id="{c.id}"><path{rule} d="{c.d}"/></clipPath>'
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
        body.extend(["</g>"] * (len(open_chain) + opened))

    mat = " ".join("%.6f" % v for v in m)
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">',
            f'<g transform="matrix({mat})">',
            f'<defs>{"".join(defs.values())}</defs>' if defs else "",
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


def measure(pieces, geo, colors):
    """Area each PDF color really covers, over the three pieces (the sleeve without its cuff)."""
    keys = {c: "#%02x%02x%02x" % (i * 9 + 3, (i * 37) % 256, (i * 71) % 256) for i, c in enumerate(colors)}
    lookup = {tuple(int(k[j : j + 2], 16) for j in (1, 3, 5)): c for c, k in keys.items()}
    area = {c: 0 for c in colors}
    size = 256
    for p in pieces:
        img = rasterize(svg_markup(p, geo, size, lambda h: keys[h], lambda col, s: f'{"stroke" if s else "fill"}="{col}"'), aa=False)
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
        front.seam = seam_span(scans[pi][4], rf)
        geo = Geometry(front, back, MODES.get(n, DEFAULT_MODE))
        pieces = [front, back, sleeve]
        colors = list(dict.fromkeys(c for p in pieces for c in p.colors()))
        area = measure(pieces, geo, colors)
        total = sum(area.values()) or 1
        kept = sorted((c for c in colors if area[c] / total >= MIN_SHARE), key=lambda c: -area[c])[: len(ROLES)]
        role_of = {c: ROLES[i] for i, c in enumerate(kept)}
        for c in colors:
            if c not in role_of:
                role_of[c] = role_of[min(kept, key=lambda k: abs(luma(k) - luma(c)))]

        name = f"molde-{n:02d}"
        roles_attr = lambda col, s: f'data-{"stroke" if s else "color"}-slot="{col}"'
        svgs = {p.kind: svg_markup(p, geo, SVG_SIZE, lambda h: role_of[h], roles_attr) for p in pieces}
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
                markup = svg_markup(p, geo, size, lambda h: MASK_KEYS[role_of[h]], lambda col, s: f'{"stroke" if s else "fill"}="{col}"')
                img = Image.fromarray(np.ascontiguousarray(rasterize(markup)), "RGB")
                img = img.quantize(colors=64, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
                img.save(path, optimize=True)
                if p.kind == "front":
                    # The Design panel shows every molde at once: a small mask is enough for its thumbnail.
                    thumb = rasterize(svg_markup(p, geo, THUMB_SIZE, lambda h: MASK_KEYS[role_of[h]], lambda col, s: f'{"stroke" if s else "fill"}="{col}"'))
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
