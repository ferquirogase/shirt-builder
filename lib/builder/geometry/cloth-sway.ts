import * as THREE from "three";

// A cheap stand-in for cloth: the sleeves and the hem swing a little behind the
// camera when it orbits. Each vertex gets a weight (0 = fixed to the body, 1 =
// swings fully) and a damped spring turns the orbit speed into a sway amount;
// the vertex shader (see cloth-sway-shader) does the actual displacement.
//
// All numbers are in the OBJ's own units (the shirt is ~131 wide, ~128 tall).

// Hem: fixed from the waist up, fully free at the bottom edge.
const HEM_FIXED_Y = 225;
const HEM_FREE_Y = 167;
// Sleeves: fixed within the torso's width, fully free at the cuff.
const SLEEVE_FIXED_X = 42;
const SLEEVE_FREE_X = 65;

/** Largest sway of a fully free vertex. */
export const MAX_SWAY = 7;
// Sway per rad/s of orbit speed.
const SWAY_GAIN = 3;
// Underdamped on purpose (damping ratio ~0.4) so the cloth overshoots and wobbles.
const STIFFNESS = 90;
const DAMPING = 7.5;
const MAX_FRAME = 0.1;
const SUBSTEP = 1 / 120;

export const SWAY_ATTRIBUTE = "swayWeight";

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function swayWeight(x: number, y: number): number {
  const hem = smoothstep(HEM_FIXED_Y, HEM_FREE_Y, y);
  const sleeve = smoothstep(SLEEVE_FIXED_X, SLEEVE_FREE_X, Math.abs(x));
  return Math.max(hem, sleeve);
}

/** Adds the per-vertex `swayWeight` attribute, computed from the positions. */
export function addSwayWeights(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute("position");
  const weights = new Float32Array(position.count);
  for (let i = 0; i < position.count; i++) {
    weights[i] = swayWeight(position.getX(i), position.getY(i));
  }
  geometry.setAttribute(SWAY_ATTRIBUTE, new THREE.BufferAttribute(weights, 1));
}

/** Where the spring wants to be for an orbit speed in rad/s: behind the motion. */
export function swayTarget(orbitSpeed: number): number {
  const target = -orbitSpeed * SWAY_GAIN;
  return Math.max(-MAX_SWAY, Math.min(MAX_SWAY, target));
}

export type SpringState = { value: number; velocity: number };

/** One frame of a damped spring toward `target`, in small steps so a slow frame can't blow it up. */
export function stepSpring(state: SpringState, target: number, dt: number): SpringState {
  let { value, velocity } = state;
  let remaining = Math.min(dt, MAX_FRAME);
  while (remaining > 1e-9) {
    const h = Math.min(SUBSTEP, remaining);
    velocity += (STIFFNESS * (target - value) - DAMPING * velocity) * h;
    value += velocity * h;
    remaining -= h;
  }
  return { value, velocity };
}
