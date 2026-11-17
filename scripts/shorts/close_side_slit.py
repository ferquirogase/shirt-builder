"""Closes the side slit at the hem of each leg of the shorts OBJ.

Each leg's hem is one open loop that climbs up the side seam (the slit), turns at an
apex and comes back down. This walks both sides of the slit from the apex, pairs their
vertices, moves each pair to its midpoint, points the faces of the second vertex at the
first one (so the seam is welded) and averages the normals there. The slit is also a thin
wedge in the UV layout; each pair's UVs go to their midpoint too, or the print inside the
wedge would go missing and a side stripe would narrow at the hem.

Run once: python scripts/shorts/close_side_slit.py public/models/gepe_shorts.obj
A second run finds no slit and leaves the file as it is.
"""
import sys
from collections import Counter, defaultdict

# The hem sways between 113.7 and 117.3; anything open above this is the slit.
HEM_TOP_Y = 118.0
LEGS_BELOW_Y = 150.0


def main(path):
    with open(path, encoding="utf-8", newline="") as fh:
        text = fh.read()
    eol = "\r\n" if "\r\n" in text else "\n"
    lines = text.split(eol)
    v_line, vt_line, vn_line, faces = [], [], [], []
    for i, line in enumerate(lines):
        if line.startswith("v "):
            v_line.append(i)
        elif line.startswith("vt "):
            vt_line.append(i)
        elif line.startswith("vn "):
            vn_line.append(i)
        elif line.startswith("f "):
            faces.append(i)

    def pos(v):
        return [float(x) for x in lines[v_line[v - 1]].split()[1:4]]

    def corners(i):
        return [[int(x) for x in t.split("/")] for t in lines[i].split()[1:]]

    edges = Counter()
    for i in faces:
        ids = [c[0] for c in corners(i)]
        for a, b in zip(ids, ids[1:] + ids[:1]):
            edges[(min(a, b), max(a, b))] += 1
    adj = defaultdict(list)
    for (a, b), n in edges.items():
        if n == 1:
            adj[a].append(b)
            adj[b].append(a)

    welds = {}  # dropped vertex -> kept vertex
    apexes = [
        v for v in adj
        if HEM_TOP_Y < pos(v)[1] < LEGS_BELOW_Y and all(pos(n)[1] < pos(v)[1] for n in adj[v])
    ]
    for apex in apexes:
        a_prev, b_prev = apex, apex
        a, b = adj[apex]
        while True:
            welds[b] = a
            if pos(a)[1] < HEM_TOP_Y and pos(b)[1] < HEM_TOP_Y:
                break
            a_prev, a = a, next(n for n in adj[a] if n != a_prev)
            b_prev, b = b, next(n for n in adj[b] if n != b_prev)
    if not welds:
        print("no slit found")
        return

    for drop, keep in welds.items():
        mid = [(p + q) / 2 for p, q in zip(pos(drop), pos(keep))]
        text = "v " + " ".join(f"{x:.6f}" for x in mid)
        lines[v_line[keep - 1]] = text
        lines[v_line[drop - 1]] = text  # left unused

    # UVs: each side of the slit uses one UV per vertex; both become their midpoint.
    uv_of = {}
    for i in faces:
        for c in corners(i):
            uv_of.setdefault(c[0], c[1])
    uv_welds = {}
    for drop, keep in welds.items():
        a, b = (lines[vt_line[uv_of[v] - 1]].split()[1:3] for v in (keep, drop))
        text = "vt " + " ".join(f"{(float(p) + float(q)) / 2:.6f}" for p, q in zip(a, b))
        lines[vt_line[uv_of[keep] - 1]] = text
        lines[vt_line[uv_of[drop] - 1]] = text  # left unused
        uv_welds[uv_of[drop]] = uv_of[keep]

    # Normals: every normal used at a welded vertex (or an apex) becomes their average.
    groups = defaultdict(set)
    for i in faces:
        for c in corners(i):
            v = welds.get(c[0], c[0])
            if v in welds.values() or v in apexes:
                groups[v].add(c[2])
    for v, normals in groups.items():
        vecs = [[float(x) for x in lines[vn_line[n - 1]].split()[1:4]] for n in normals]
        s = [sum(c) for c in zip(*vecs)]
        length = sum(c * c for c in s) ** 0.5
        text = "vn " + " ".join(f"{c / length:.4f}" for c in s)
        for n in normals:
            lines[vn_line[n - 1]] = text

    for i in faces:
        cs = corners(i)
        for c in cs:
            c[0] = welds.get(c[0], c[0])
            c[1] = uv_welds.get(c[1], c[1])
        lines[i] = "f " + " ".join("/".join(str(x) for x in c) for c in cs)

    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(eol.join(lines))
    print(f"welded {len(welds)} vertex pairs at {len(apexes)} slits:", welds)


if __name__ == "__main__":
    main(sys.argv[1])
