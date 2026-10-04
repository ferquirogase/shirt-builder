import type { Vec3 } from "./mesh-boundary";

// Source models tend to ship a neckline that is both too wide for the garment
// and a square scoop. Real crew necks are narrow and round.
//
// Each point of the opening is moved onto a target ellipse (narrower, and with
// a deeper scoop at the front than at the back). The fabric around the edge
// follows by a distance-weighted blend of those movements, fading to nothing
// at FADE_DISTANCE so the shoulders and chest are left alone.
const FADE_DISTANCE = 24; // model units (~cm) from the edge over which the displacement fades out
const WEIGHT_POWER = 3; // inverse-distance exponent; higher keeps each loop point's influence local
const EPSILON = 1e-3;

export type NecklineOptions = {
  /** Scale of the opening in plan view (1 = original size). */
  width?: number;
  /** Front scoop depth relative to the original (1 = original depth). */
  depth?: number;
  /** Back scoop depth relative to the original; defaults to `depth`. */
  backDepth?: number;
};

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Returns a point-wise warp that narrows and rounds the given neckline loop.
 * Apply it to every vertex of the garment (and to the loop itself) so the
 * surface and its open edge stay in agreement.
 */
export function createNecklineRounding(neck: Vec3[], options: NecklineOptions = {}): (p: Vec3) => Vec3 {
  const { width = 1, depth = 1, backDepth = depth } = options;

  const xs = neck.map((p) => p[0]);
  const zs = neck.map((p) => p[2]);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cz = (Math.max(...zs) + Math.min(...zs)) / 2;
  const halfX = (Math.max(...xs) - Math.min(...xs)) / 2;
  const halfZ = (Math.max(...zs) - Math.min(...zs)) / 2;
  const topY = Math.max(...neck.map((p) => p[1]));
  const frontY = Math.min(...neck.filter((p) => p[2] >= cz).map((p) => p[1]), topY);
  const backY = Math.min(...neck.filter((p) => p[2] < cz).map((p) => p[1]), topY);
  const frontDrop = (topY - frontY) * depth;
  const backDrop = (topY - backY) * backDepth;

  // Where each point of the opening should end up, as a displacement.
  const displacements = neck.map(([x, y, z]): Vec3 => {
    const angle = Math.atan2((z - cz) / halfZ, (x - cx) / halfX);
    const sin = Math.sin(angle);
    const target: Vec3 = [
      cx + halfX * width * Math.cos(angle),
      topY - (sin >= 0 ? frontDrop : backDrop) * Math.abs(sin),
      cz + halfZ * width * sin,
    ];
    return [target[0] - x, target[1] - y, target[2] - z];
  });

  return ([x, y, z]) => {
    let nearest = Infinity;
    let weightSum = 0;
    let dx = 0;
    let dy = 0;
    let dz = 0;
    for (let i = 0; i < neck.length; i++) {
      const q = neck[i];
      const d = Math.hypot(x - q[0], y - q[1], z - q[2]);
      if (d < nearest) nearest = d;
      const w = 1 / (d + EPSILON) ** WEIGHT_POWER;
      weightSum += w;
      dx += w * displacements[i][0];
      dy += w * displacements[i][1];
      dz += w * displacements[i][2];
    }
    const fade = 1 - smoothstep(0, FADE_DISTANCE, nearest);
    if (fade === 0) return [x, y, z];
    const k = fade / weightSum;
    return [x + dx * k, y + dy * k, z + dz * k];
  };
}
