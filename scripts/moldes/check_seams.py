# Checks that the moldes' front and back images meet at the side seams and over the shoulders, as the PDF's
# pieces do. Run it after extract_moldes.py.
#
#   - Side seams: the model's cloth is cut there (front and back are separate vertices at the same place),
#     so each pair of seam vertices is looked up in both images: the colors must be the same.
#   - Shoulders: front and back share the shoulder seam's vertices (UV v 0.5), so the front image's top row
#     and the back image's top row (it is drawn turned 180deg) must match wherever the cloth is.
#
# A molde whose PDF pieces do not meet at the side seam (a band on the front only, a camouflage) shows the
# same difference here: compare with how the PDF itself is drawn before calling it a bug.
#
# usage: python scripts/moldes/check_seams.py
import os
from collections import defaultdict

import numpy as np
from PIL import Image

from extract_moldes import COUNT, MODEL_OBJ, OUT_DIR, PATTERN_RECTS


def seam_pairs():
    """(front uv, back uv) for every 3D point of the side seams."""
    positions, uvs, by_point = [], [], defaultdict(set)
    for line in open(MODEL_OBJ):
        a = line.split()
        if not a:
            continue
        if a[0] == "v":
            positions.append(tuple(round(float(x), 3) for x in a[1:4]))
        elif a[0] == "vt":
            uvs.append((float(a[1]), float(a[2])))
        elif a[0] == "f":
            for p in a[1:]:
                v, t = p.split("/")[:2]
                by_point[positions[int(v) - 1]].add(int(t) - 1)
    pairs = []
    for ts in by_point.values():
        pts = [uvs[t] for t in ts]
        for f in (p for p in pts if p[1] < 0.499):
            # The back's v is the front's mirrored: this leaves out the sleeves, which touch the armholes.
            for b in (p for p in pts if p[1] > 0.501 and abs(p[1] - (1 - f[1])) < 0.01):
                pairs.append((f, b))
    return pairs


def pixel(img, kind, u, v):
    u0, v0, u1, v1 = PATTERN_RECTS[kind]
    s = img.shape[0]
    if kind == "front":
        x, y = (u - u0) / (u1 - u0) * s, (v1 - v) / (v1 - v0) * s
    else:
        x, y = (u1 - u) / (u1 - u0) * s, (v - v0) / (v1 - v0) * s
    return img[min(int(y), s - 1), min(int(x), s - 1)].astype(float)


def main():
    pairs = seam_pairs()
    for n in range(1, COUNT + 1):
        name = f"molde-{n:02d}"
        front = np.asarray(Image.open(os.path.join(OUT_DIR, f"{name}-front.png")).convert("RGB"))
        back = np.asarray(Image.open(os.path.join(OUT_DIR, f"{name}-back.png")).convert("RGB"))
        side = sum(1 for f, b in pairs if np.abs(pixel(front, "front", *f) - pixel(back, "back", *b)).max() > 128)
        # The shoulder seam spans u 0.359..0.641.
        s = front.shape[0]
        fu0, _, fu1, _ = PATTERN_RECTS["front"]
        bu0, _, bu1, _ = PATTERN_RECTS["back"]
        u = np.linspace(0.365, 0.635, 200)
        fx = ((u - fu0) / (fu1 - fu0) * s).astype(int)
        bx = ((bu1 - u) / (bu1 - bu0) * s).astype(int)
        shoulder = int((np.abs(front[0, fx].astype(float) - back[0, bx].astype(float)).max(axis=1) > 128).sum())
        print(f"{name}: side seams {side} of {len(pairs)} points differ, shoulders {shoulder} of {len(u)}")


if __name__ == "__main__":
    main()
