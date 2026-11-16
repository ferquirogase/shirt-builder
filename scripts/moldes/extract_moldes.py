# Extracts the owners' shirt moldes from ESTAMPAS WEB.pdf into recolorable artwork for the builder.
#
# Each molde is three pieces (front, back, sleeve). For each piece:
#   - the artwork is every drawing under a clip whose centre is inside the piece (logos and seam marks
#     sit under the page clip, so they are left out); inner clips are kept, the piece's own outline clip is
#     not (the design runs past the outline, so the seams show no gap);
#   - the sleeve's cuff band (a full-width band at the cuff) is taken out: the builder paints it in the
#     cuff color, from `cuffFrom` (share of the sleeve image, cap -> cuff along x) to the edge;
#   - colors become roles by the area they really cover (measured by rasterizing), the largest first;
#     a color that covers next to nothing is an artifact and takes the role of the nearest gray.
# Front and back are laid on the model's cloth outline to outline (see body_image), so the design meets
# itself over the shoulders and under the arms. Every piece is written as a color mask PNG: red, green and
# blue are the coverage of roles 2, 3 and 4, and what is left is role 1; the browser mixes the user's colors.
#
# usage: python scripts/moldes/extract_moldes.py "ESTAMPAS WEB.pdf"
#        (writes public/patterns/moldes/ and lib/builder/catalog/moldes.generated.ts)
import json
import os
import sys

import numpy as np
import pymupdf
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, "public", "patterns", "moldes")
OUT_TS = os.path.join(ROOT, "lib", "builder", "catalog", "moldes.generated.ts")
MODEL_OBJ = os.path.join(ROOT, "public", "models", "gepe_shirt.obj")
COUNT = 20
ROLES = ["primary", "secondary", "accent", "quaternary"]
# The rects the compositor draws the front and the back pattern images over: u0, v0, u1, v1. They must be
# GEPE_UV_REGIONS.bodyFrontPattern / bodyBackPattern (a test checks): the cloth's island, and a margin.
PATTERN_RECTS = {"front": (0.3037, 0.0476, 0.6963, 0.5), "back": (0.3296, 0.5, 0.6704, 0.9521)}
# On the model (front-equivalent v; the back's is 1 - v): the shoulder seam, the armpit (top of the side
# seam) and the hem at the side seam.
MODEL_SHOULDER, MODEL_ARMPIT_V, MODEL_HEM = 0.5, 0.355, 0.0576
# The PDF pieces are drawn flat at this many px per point, with this margin (points) round them.
SOURCE_RES = 4
SOURCE_MARGIN = 40
# Points kept inside a piece's outline when sampling it (see body_image): the outline's stroke hides the
# outermost ~2 pt of the PDF, where some designs stop short of the edge (molde 10's back).
EDGE_INSET = 2.5
MASK_SIZE = {"front": 1024, "back": 1024, "sleeve": 512}
# Rows at the top and bottom of the cloth's island whose edges are not trusted (see Island).
ISLAND_EDGE_ROWS = 3
# The cloth's edges and the piece's edges are smoothed up the body over this many image rows (Gaussian
# sigma, out of the mask's 1024) before one is laid on the other. At the armpit the model's UV island juts
# out in a small fin and the PDF outline turns a sharp corner a few rows away: followed exactly, they put
# little spikes in the stripes near the side seams.
EDGE_SMOOTH_ROWS = 32
THUMB_SIZE = 192
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


def outline_of(outline_drawings, r):
    """The black outline stroke of the body piece at `r`."""
    for x in outline_drawings:
        if abs(x["rect"].x0 - r.x0) < 5 and abs(x["rect"].y0 - r.y0) < 40 and abs(x["rect"].x1 - r.x1) < 5:
            return x
    raise SystemExit(f"no outline found for the piece at {r}")


def seam_span(outline, r):
    """(armpit, hem) page heights of a body piece's side seam: where its outline runs straight down its edge."""
    pts = [p for it in outline["items"] for p in it[1:] if isinstance(p, pymupdf.Point) and abs(p.x - r.x0) < 1.5]
    if not pts:
        raise SystemExit(f"no side seam found for the piece at {r}")
    return min(p.y for p in pts), max(p.y for p in pts)


def shoulder_tip(outline, r):
    """Page height of the shoulder tips: the outer ends of the two shoulder lines (long, gently sloped lines at
    the top of the piece), where the armholes begin."""
    tips = []
    for it in outline["items"]:
        if it[0] != "l":
            continue
        a, b = it[1], it[2]
        dx, dy = abs(b.x - a.x), abs(b.y - a.y)
        if dx > 60 and dy < 0.5 * dx and max(a.y, b.y) < r.y0 + 80:
            outer = a if abs(a.x - (r.x0 + r.x1) / 2) > abs(b.x - (r.x0 + r.x1) / 2) else b
            tips.append(outer.y)
    if len(tips) != 2:
        raise SystemExit(f"expected two shoulder lines for the piece at {r}, found {len(tips)}")
    return sum(tips) / 2


class Island:
    """Where the model's cloth is in a body pattern image, row by row: the image is the compositor's front or
    back pattern rect (see PATTERN_RECTS), as the compositor draws it (the back turned 180deg)."""

    _faces = None

    @classmethod
    def faces(cls):
        if cls._faces is None:
            T, F = [], []
            for line in open(MODEL_OBJ):
                a = line.split()
                if not a:
                    continue
                if a[0] == "vt":
                    T.append((float(a[1]), float(a[2])))
                elif a[0] == "f":
                    F.append([int(p.split("/")[1]) - 1 for p in a[1:]])
            parent = list(range(len(T)))

            def find(i):
                while parent[i] != i:
                    parent[i] = parent[parent[i]]
                    i = parent[i]
                return i

            for f in F:
                for k in f[1:]:
                    a, b = find(f[0]), find(k)
                    if a != b:
                        parent[a] = b
            T = np.array(T)
            start = int(np.argmin(np.abs(T[:, 0] - 0.5) + np.abs(T[:, 1] - 0.25)))
            root = find(start)
            cls._faces = [T[f] for f in F if find(f[0]) == root]
        return cls._faces

    def __init__(self, kind, size):
        u0, v0, u1, v1 = PATTERN_RECTS[kind]
        self.kind, self.size = kind, size
        mask = Image.new("L", (size, size), 0)
        draw = ImageDraw.Draw(mask)
        for tri in self.faces():
            cv = tri[:, 1].mean()
            if (kind == "front") != (cv < 0.5):
                continue
            pts = [self.to_px(u, v) for u, v in tri]
            draw.polygon(pts, fill=255)
        m = np.asarray(mask) > 0
        # The first and last rows are cut by the island's edge (the shoulder seam, the hem) and come out
        # short: they take the edges of the nearest whole row, or the shoulder seam shows as a line.
        rows = np.where(m.any(axis=1))[0][ISLAND_EDGE_ROWS:-ISLAND_EDGE_ROWS]
        left = np.full(size, np.nan)
        right = np.full(size, np.nan)
        for j in rows:
            cols = np.where(m[j])[0]
            left[j], right[j] = cols[0], cols[-1] + 1
        idx = np.arange(size)
        self.left = np.interp(idx, rows, left[rows])
        self.right = np.interp(idx, rows, right[rows])

    def to_px(self, u, v):
        u0, v0, u1, v1 = PATTERN_RECTS[self.kind]
        s = self.size
        if self.kind == "front":
            return ((u - u0) / (u1 - u0) * s, (v1 - v) / (v1 - v0) * s)
        return ((u1 - u) / (u1 - u0) * s, (v - v0) / (v1 - v0) * s)

    def row_v(self):
        """The front-equivalent v of each image row (the back's is mirrored, 1 - v)."""
        u0, v0, u1, v1 = PATTERN_RECTS[self.kind]
        j = np.arange(self.size) + 0.5
        if self.kind == "front":
            return v1 - j / self.size * (v1 - v0)
        return 1 - (v0 + j / self.size * (v1 - v0))


class PieceRaster:
    """A body piece drawn flat at SOURCE_RES px per point (with a margin, the design running on past its
    outline), and the piece's outline, row by row."""

    def __init__(self, piece, paint):
        r = piece.r
        self.x0, self.y0 = r.x0 - SOURCE_MARGIN, r.y0 - SOURCE_MARGIN
        w, h = int((r.width + 2 * SOURCE_MARGIN) * SOURCE_RES), int((r.height + 2 * SOURCE_MARGIN) * SOURCE_RES)
        m = (SOURCE_RES, 0, 0, SOURCE_RES, -self.x0 * SOURCE_RES, -self.y0 * SOURCE_RES)
        keyed = lambda col, s: f'{"stroke" if s else "fill"}="{col}"'
        self.img = rasterize(piece_svg(piece, m, w, h, paint, keyed)).astype(np.float32)
        shape = f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><rect width="{w}" height="{h}" fill="#ffffff"/><g transform="matrix({" ".join("%.6f" % v for v in m)})"><path fill="#000000" d="{path_d(piece.outline["items"])}"/></g></svg>'
        inside = rasterize(shape, aa=False)[:, :, 0] < 128
        rows = np.where(inside.any(axis=1))[0]
        left, right = np.zeros(h), np.zeros(h)
        for j in rows:
            cols = np.where(inside[j])[0]
            left[j], right[j] = cols[0], cols[-1] + 1
        idx = np.arange(h)
        # Rows past the outline (above the neck, below the hem) take the nearest row's edges.
        self.left = np.interp(idx, rows, left[rows]) / SOURCE_RES + self.x0
        self.right = np.interp(idx, rows, right[rows]) / SOURCE_RES + self.x0

    def edges_at(self, y):
        j = (y - self.y0) * SOURCE_RES
        idx = np.arange(len(self.left))
        return np.interp(j, idx, self.left), np.interp(j, idx, self.right)

    def sample(self, x, y):
        """Bilinear sample at page points (arrays)."""
        h, w = self.img.shape[:2]
        fx = np.clip((x - self.x0) * SOURCE_RES - 0.5, 0, w - 1.001)
        fy = np.clip((y - self.y0) * SOURCE_RES - 0.5, 0, h - 1.001)
        ix, iy = fx.astype(int), fy.astype(int)
        ax, ay = (fx - ix)[..., None], (fy - iy)[..., None]
        im = self.img
        top = im[iy, ix] * (1 - ax) + im[iy, ix + 1] * ax
        bottom = im[iy + 1, ix] * (1 - ax) + im[iy + 1, ix + 1] * ax
        return top * (1 - ay) + bottom * ay


def smooth(a, sigma):
    """Gaussian blur of a 1-D array, its ends held."""
    r = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    return np.convolve(np.pad(a, r, mode="edge"), k / k.sum(), mode="valid")


def body_image(piece, paint, size):
    """The body piece as the compositor's pattern image: the PDF piece's outline laid on the model's cloth,
    row by row. Up the body, the model's shoulder seam, armpit and hem land on the PDF piece's shoulder tips,
    armpit and side-seam hem; across each row, the cloth's edges land on the piece's edges (the side seams
    below the armpit, the armholes above it, the shoulder tips at the top). Front and back share the shoulder
    seam and the side seams, and so do their PDF pieces, so the design meets itself over the shoulders and
    under the arms."""
    island = Island(piece.kind, size)
    src = PieceRaster(piece, paint)
    v = island.row_v()
    arm, hem = piece.seam
    # v -> page y, piecewise straight through the three landmarks (and on past them at the end slopes).
    y = np.interp(-v, [-MODEL_SHOULDER, -MODEL_ARMPIT_V, -MODEL_HEM], [piece.tip, arm, hem])
    above = v > MODEL_SHOULDER
    y[above] = piece.tip - (v[above] - MODEL_SHOULDER) * (arm - piece.tip) / (MODEL_SHOULDER - MODEL_ARMPIT_V)
    below = v < MODEL_HEM
    y[below] = hem + (MODEL_HEM - v[below]) * (hem - arm) / (MODEL_ARMPIT_V - MODEL_HEM)
    # Below the side seam's hem the piece's edges are held: the back's hem curves down to its middle, and
    # followed inward it would round off the bottom of whatever runs down the side seam (a side panel).
    # (taken a little above it: on the hem's own row the outline has already turned the corner).
    xl, xr = src.edges_at(np.minimum(y, hem - EDGE_INSET))
    # Never past what the PDF shows inside the piece's outline: its edge is antialiased against what lies
    # outside, or stops short under the outline's stroke, and the side seam would show a hairline. Off the
    # cloth, the edge's color goes on (the image's padding).
    xl, xr = xl + EDGE_INSET, xr - EDGE_INSET
    # Smoothed alike (see EDGE_SMOOTH_ROWS): what a smoothed cloth edge leaves outside takes the edge's color.
    s = EDGE_SMOOTH_ROWS * size / 1024
    left, right = smooth(island.left, s), smooth(island.right, s)
    xl, xr = smooth(xl, s), smooth(xr, s)
    cols = np.arange(size) + 0.5
    t = np.clip((cols[None, :] - left[:, None]) / (right - left)[:, None], 0, 1)
    x = xl[:, None] + t * (xr - xl)[:, None]
    yy = np.repeat(y[:, None], size, axis=1)
    return np.clip(src.sample(x, yy), 0, 255).astype(np.uint8)


def sleeve_matrix(piece, size):
    r = piece.r
    # The model's sleeve image runs shoulder -> cuff along x and round the arm along y.
    return (0, size / r.width, size / r.height, 0, -r.y0 * size / r.height, -r.x0 * size / r.width)


def piece_svg(piece, m, width, height, paint, attrs):
    """The piece as SVG, drawn through the matrix `m`. `paint(hex)` gives the color for a PDF color and
    `attrs(color, is_stroke)` writes it."""
    layers = [(piece, 0, None)]
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
            # One path per drawing: drawings of one color joined into one path can wind against each other and
            # cut holes where they overlap (molde 12's side panel over its stripes of the same gray).
            flush()
            run["key"] = key
            run["d"].append(path_d(x["items"]))
        flush()
        body.extend(["</g>"] * (len(open_chain) + opened))

    mat = " ".join("%.6f" % v for v in m)
    return "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
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


def keyed(col, is_stroke):
    return f'{"stroke" if is_stroke else "fill"}="{col}"'


def flat_matrix(piece, size):
    r = piece.r
    return (size / r.width, 0, 0, size / r.height, -r.x0 * size / r.width, -r.y0 * size / r.height)


def measure(pieces, colors):
    """Area each PDF color really covers, over the three pieces (the sleeve without its cuff)."""
    keys = {c: "#%02x%02x%02x" % (i * 9 + 3, (i * 37) % 256, (i * 71) % 256) for i, c in enumerate(colors)}
    lookup = {tuple(int(k[j : j + 2], 16) for j in (1, 3, 5)): c for c, k in keys.items()}
    area = {c: 0 for c in colors}
    size = 256
    for p in pieces:
        m = sleeve_matrix(p, size) if p.kind == "sleeve" else flat_matrix(p, size)
        img = rasterize(piece_svg(p, m, size, size, lambda h: keys[h], keyed), aa=False)
        if p.kind == "sleeve" and p.cuff:
            img = img[:, : int(p.cuff["from"] * size)]
        uniq, counts = np.unique(img.reshape(-1, 3), axis=0, return_counts=True)
        for u, n in zip(uniq, counts):
            c = lookup.get(tuple(int(v) for v in u))
            if c:
                area[c] += int(n)
    return area


def save_mask(pixels, path, colors=64):
    img = Image.fromarray(np.ascontiguousarray(pixels), "RGB")
    img.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


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
        for body in (front, back):
            body.outline = outline_of(scans[pi][4], body.r)
            body.seam = seam_span(body.outline, body.r)
            body.tip = shoulder_tip(body.outline, body.r)
        pieces = [front, back, sleeve]
        colors = list(dict.fromkeys(c for p in pieces for c in p.colors()))
        area = measure(pieces, colors)
        total = sum(area.values()) or 1
        kept = sorted((c for c in colors if area[c] / total >= MIN_SHARE), key=lambda c: -area[c])[: len(ROLES)]
        role_of = {c: ROLES[i] for i, c in enumerate(kept)}
        for c in colors:
            if c not in role_of:
                role_of[c] = role_of[min(kept, key=lambda k: abs(luma(k) - luma(c)))]
        paint = lambda h: MASK_KEYS[role_of[h]]

        name = f"molde-{n:02d}"
        for old in os.listdir(OUT_DIR):
            if old.startswith(name + "-"):
                os.remove(os.path.join(OUT_DIR, old))
        for body in (front, back):
            pixels = body_image(body, paint, MASK_SIZE[body.kind])
            save_mask(pixels, os.path.join(OUT_DIR, f"{name}-{body.kind}.png"))
            if body.kind == "front":
                # The Design panel shows every molde at once: a small mask is enough for its thumbnail.
                thumb = np.asarray(Image.fromarray(pixels, "RGB").resize((THUMB_SIZE, THUMB_SIZE), Image.Resampling.BOX))
                save_mask(thumb, os.path.join(OUT_DIR, f"{name}-thumb.png"), colors=32)
        size = MASK_SIZE["sleeve"]
        save_mask(rasterize(piece_svg(sleeve, sleeve_matrix(sleeve, size), size, size, paint, keyed)), os.path.join(OUT_DIR, f"{name}-sleeve.png"))
        entries.append(
            {
                "id": name,
                "roles": ROLES[: len(kept)],
                "cuffFrom": round(sleeve.cuff["from"], 4) if sleeve.cuff else None,
                "share": {role_of[c]: round(area[c] / total, 3) for c in kept},
            }
        )
        print(name, entries[-1]["roles"], "cuff", entries[-1]["cuffFrom"], entries[-1]["share"], flush=True)

    lines = [
        "// Generated by scripts/moldes/extract_moldes.py from the owners' ESTAMPAS WEB.pdf: do not edit by hand.",
        'import type { PatternRole } from "../texture/svg-recolor";',
        "",
        "export type MoldeData = {",
        "  id: string;",
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
        lines.append(f'  {{ id: "{e["id"]}", roles: [{roles}], cuffFrom: {json.dumps(e["cuffFrom"])} }},')
    lines.append("];")
    with open(OUT_TS, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
