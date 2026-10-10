import type * as THREE from "three";

// The shirt's hem hangs over the shorts' waist with only a few units of air, and
// the cloth sway can swing it further than that. So the shirt is not allowed into
// the shorts: at each height the shorts' cross-section is measured as a radius in
// COLLIDER_BINS directions around its centre, and any shirt vertex that ends up
// inside it is pushed back out. The shader does the same maths as pushOutside
// (see cloth-sway-shader).
//
// All numbers are in the OBJ's own units.

/** Heights the cross-section is measured at. */
export const COLLIDER_SAMPLES = 16;
/** Directions around the centre. A multiple of 4: the shader packs 4 radii per vec4. */
export const COLLIDER_BINS = 24;
/** How far outside the shorts' surface the shirt is kept. */
export const COLLIDER_MARGIN = 0.4;

const TWO_PI = Math.PI * 2;
const BIN_WIDTH = TWO_PI / COLLIDER_BINS;

/** The cross-section at one height: its centre and the radius at angle -PI + k * 2PI/COLLIDER_BINS. */
export type ColliderSample = { cx: number; cz: number; radii: number[] };
export type ShortsCollider = { yMin: number; yMax: number; samples: ColliderSample[] };

// Empty directions take a straight line between the nearest ones that have a radius.
function fillEmptyBins(radii: (number | null)[]): number[] | null {
  const known = radii.flatMap((r, k) => (r === null ? [] : [k]));
  if (known.length === 0) return null;
  return radii.map((r, k) => {
    if (r !== null) return r;
    let before = known[known.length - 1];
    let after = known[0];
    for (const j of known) {
      if (j < k) before = j;
      if (j > k) {
        after = j;
        break;
      }
    }
    const span = (after - before + COLLIDER_BINS) % COLLIDER_BINS || COLLIDER_BINS;
    const t = ((k - before + COLLIDER_BINS) % COLLIDER_BINS) / span;
    return (radii[before] as number) * (1 - t) + (radii[after] as number) * t;
  });
}

/**
 * Measures the shorts' cross-section from `yMin` to `yMax` at `count` evenly
 * spaced heights: the centre of the vertices near each height and, in each
 * direction around it, how far the farthest of them reaches.
 */
export function buildShortsCollider(
  geometry: THREE.BufferGeometry,
  yMin: number,
  yMax: number,
  count = COLLIDER_SAMPLES
): ShortsCollider {
  const position = geometry.getAttribute("position");
  const step = (yMax - yMin) / (count - 1);

  const measured = Array.from({ length: count }, (_, i) => {
    const y = yMin + i * step;
    const near: { x: number; z: number }[] = [];
    for (let v = 0; v < position.count; v++) {
      if (Math.abs(position.getY(v) - y) <= step) near.push({ x: position.getX(v), z: position.getZ(v) });
    }
    if (near.length === 0) return null;

    const xs = near.map((p) => p.x);
    const zs = near.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const reach: (number | null)[] = Array.from({ length: COLLIDER_BINS }, () => null);
    for (const { x, z } of near) {
      const bin = Math.round((Math.atan2(z - cz, x - cx) + Math.PI) / BIN_WIDTH) % COLLIDER_BINS;
      reach[bin] = Math.max(reach[bin] ?? 0, Math.hypot(x - cx, z - cz));
    }
    const radii = fillEmptyBins(reach);
    return radii ? { cx, cz, radii } : null;
  });

  // A height with no vertices takes the nearest one that has some.
  const samples = measured.map((sample, i): ColliderSample => {
    if (sample) return sample;
    for (let d = 1; d < count; d++) {
      const near = measured[i - d] ?? measured[i + d];
      if (near) return near;
    }
    return { cx: 0, cz: 0, radii: Array.from({ length: COLLIDER_BINS }, () => 0) };
  });
  return { yMin, yMax, samples };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Keeps a point of the shirt out of the shorts: if (x, z) at height `y` is closer
 * to the centre than the shorts' radius in that direction plus `margin`, it moves
 * radially out to that distance.
 */
export function pushOutside(
  collider: ShortsCollider,
  x: number,
  y: number,
  z: number,
  margin = COLLIDER_MARGIN
): { x: number; z: number } {
  const { yMin, yMax, samples } = collider;
  if (y < yMin || y > yMax) return { x, z };

  const f = ((y - yMin) / (yMax - yMin)) * (samples.length - 1);
  const i = Math.min(Math.floor(f), samples.length - 2);
  const t = f - i;
  const lo = samples[i];
  const hi = samples[i + 1];
  const cx = mix(lo.cx, hi.cx, t);
  const cz = mix(lo.cz, hi.cz, t);

  const dx = x - cx;
  const dz = z - cz;
  const dist = Math.hypot(dx, dz);
  const u = (Math.atan2(dz, dx) + Math.PI) / BIN_WIDTH;
  const k0 = Math.floor(u) % COLLIDER_BINS;
  const k1 = (k0 + 1) % COLLIDER_BINS;
  const fk = u - Math.floor(u);
  const radius = mix(mix(lo.radii[k0], lo.radii[k1], fk), mix(hi.radii[k0], hi.radii[k1], fk), t) + margin;

  if (dist >= radius) return { x, z };
  // Dead on the centre there is no direction: go to the front.
  const ux = dist > 1e-4 ? dx / dist : 0;
  const uz = dist > 1e-4 ? dz / dist : 1;
  return { x: cx + ux * radius, z: cz + uz * radius };
}
