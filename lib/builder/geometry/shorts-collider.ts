import type * as THREE from "three";
import { JERSEY_BOTTOM_Y } from "./jersey-model";

// The shirt's hem hangs over the shorts' waist with only a few units of air, and
// the cloth sway can swing it further than that. So the shirt is not allowed into
// the shorts: at each height the shorts' cross-section is measured as a radius in
// COLLIDER_BINS directions around its centre, and any shirt vertex that ends up
// inside it is pushed back out. The shader does the same maths as pushOutside
// (see cloth-sway-shader).
//
// All numbers are in the OBJ's own units.

// The shorts barely change from one height to the next, but their corners are tight,
// so the directions are many and the heights few. 7 x 56 radii is 98 vec4 of shader
// uniforms (a phone's vertex stage has at least 256). With 24 directions a hem vertex
// that is not touching the shorts was pushed out by 3 units.
/** Heights the cross-section is measured at. */
export const COLLIDER_SAMPLES = 7;
/** Directions around the centre. A multiple of 4: the shader packs 4 radii per vec4. */
export const COLLIDER_BINS = 56;
/** How far outside the shorts' surface the shirt is kept. */
export const COLLIDER_MARGIN = 0.4;
/** A height takes the vertices within this many steps of it (1 = the neighbouring heights too). */
export const COLLIDER_BAND = 1;
/** The collider starts this far under the shirt's hem: its lowest vertices lie a hair below JERSEY_BOTTOM_Y. */
export const COLLIDER_LEAD = 1;

const TWO_PI = Math.PI * 2;

/** The cross-section at one height: its centre and the radius at angle -PI + k * 2PI/COLLIDER_BINS. */
export type ColliderSample = { cx: number; cz: number; radii: number[] };
export type ShortsCollider = { yMin: number; yMax: number; samples: ColliderSample[] };

// Empty directions take a straight line between the nearest ones that have a radius.
function fillEmptyBins(radii: (number | null)[]): number[] | null {
  const bins = radii.length;
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
    const span = (after - before + bins) % bins || bins;
    const t = ((k - before + bins) % bins) / span;
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
  count = COLLIDER_SAMPLES,
  band = COLLIDER_BAND,
  bins = COLLIDER_BINS
): ShortsCollider {
  const binWidth = TWO_PI / bins;
  const position = geometry.getAttribute("position");
  const step = (yMax - yMin) / (count - 1);

  const measured = Array.from({ length: count }, (_, i) => {
    const y = yMin + i * step;
    const near: { x: number; z: number }[] = [];
    for (let v = 0; v < position.count; v++) {
      if (Math.abs(position.getY(v) - y) <= step * band) near.push({ x: position.getX(v), z: position.getZ(v) });
    }
    if (near.length === 0) return null;

    const xs = near.map((p) => p.x);
    const zs = near.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const reach: (number | null)[] = Array.from({ length: bins }, () => null);
    for (const { x, z } of near) {
      // A vertex counts for both directions on either side of it, so the radius blended
      // between two directions can never fall short of a vertex that lies between them.
      const u = (Math.atan2(z - cz, x - cx) + Math.PI) / binWidth;
      const radius = Math.hypot(x - cx, z - cz);
      for (const bin of [Math.floor(u) % bins, (Math.floor(u) + 1) % bins]) {
        reach[bin] = Math.max(reach[bin] ?? 0, radius);
      }
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
    return { cx: 0, cz: 0, radii: Array.from({ length: bins }, () => 0) };
  });
  return { yMin, yMax, samples };
}

/** The collider the shirt must stay out of: the shorts, from just under the shirt's hem to their waist. */
export function buildKitCollider(shorts: THREE.BufferGeometry): ShortsCollider {
  const position = shorts.getAttribute("position");
  let top = -Infinity;
  for (let v = 0; v < position.count; v++) top = Math.max(top, position.getY(v));
  return buildShortsCollider(shorts, JERSEY_BOTTOM_Y - COLLIDER_LEAD, top);
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
  const bins = lo.radii.length;
  const u = (Math.atan2(dz, dx) + Math.PI) / (TWO_PI / bins);
  const k0 = Math.floor(u) % bins;
  const k1 = (k0 + 1) % bins;
  const fk = u - Math.floor(u);
  const radius = mix(mix(lo.radii[k0], lo.radii[k1], fk), mix(hi.radii[k0], hi.radii[k1], fk), t) + margin;

  if (dist >= radius) return { x, z };
  // Dead on the centre there is no direction: go to the front.
  const ux = dist > 1e-4 ? dx / dist : 0;
  const uz = dist > 1e-4 ? dz / dist : 1;
  return { x: cx + ux * radius, z: cz + uz * radius };
}
