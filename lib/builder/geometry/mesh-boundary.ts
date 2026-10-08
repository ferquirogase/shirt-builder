export type Vec3 = [number, number, number];

// Positions closer than this are treated as the same vertex (OBJLoader emits
// non-indexed triangles, so every shared vertex is duplicated per face).
const WELD_PRECISION = 1000;

/**
 * Finds the open edge loops of a non-indexed triangle soup (9 floats per
 * triangle). An edge used by exactly one triangle is a boundary edge; the
 * boundary edges are chained into ordered loops of vertex positions.
 */
export function findBoundaryLoops(positions: ArrayLike<number>): Vec3[][] {
  const ids = new Map<string, number>();
  const points: Vec3[] = [];
  const vertexId = (i: number) => {
    const p: Vec3 = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const key = p.map((n) => Math.round(n * WELD_PRECISION)).join(",");
    let id = ids.get(key);
    if (id === undefined) {
      id = points.length;
      ids.set(key, id);
      points.push(p);
    }
    return id;
  };

  const edgeUses = new Map<string, number>();
  const triangleCount = Math.floor(positions.length / 9);
  for (let t = 0; t < triangleCount; t++) {
    const tri = [vertexId(t * 3), vertexId(t * 3 + 1), vertexId(t * 3 + 2)];
    for (let k = 0; k < 3; k++) {
      const a = tri[k];
      const b = tri[(k + 1) % 3];
      if (a === b) continue;
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
    }
  }

  const neighbours = new Map<number, number[]>();
  const link = (a: number, b: number) => {
    const list = neighbours.get(a);
    if (list) list.push(b);
    else neighbours.set(a, [b]);
  };
  for (const [key, uses] of edgeUses) {
    if (uses !== 1) continue;
    const [a, b] = key.split("_").map(Number);
    link(a, b);
    link(b, a);
  }

  const visited = new Set<number>();
  const loops: Vec3[][] = [];
  for (const start of neighbours.keys()) {
    if (visited.has(start)) continue;
    const loop: Vec3[] = [];
    let prev = -1;
    let current = start;
    while (!visited.has(current)) {
      visited.add(current);
      loop.push(points[current]);
      const next = neighbours.get(current)!.find((n) => n !== prev && !visited.has(n));
      if (next === undefined) break;
      prev = current;
      current = next;
    }
    loops.push(loop);
  }
  return loops;
}

/** The neckline is the open loop that sits highest on the garment. */
export function pickNeckLoop(loops: Vec3[][]): Vec3[] {
  const meanY = (loop: Vec3[]) => loop.reduce((s, p) => s + p[1], 0) / loop.length;
  return loops.reduce((best, loop) => (meanY(loop) > meanY(best) ? loop : best));
}
