export type ViewSide = "front" | "back";

// The jersey front faces +z and the camera starts on +z, so azimuth 0 is the
// front and PI is the back.
export const VIEW_AZIMUTH: Record<ViewSide, number> = { front: 0, back: Math.PI };

const TWO_PI = Math.PI * 2;

// Normalizes into (-PI, PI].
export function normalizeAngle(angle: number): number {
  let result = angle % TWO_PI;
  if (result <= -Math.PI) result += TWO_PI;
  else if (result > Math.PI) result -= TWO_PI;
  return result;
}

export function shortestDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

// One easing step toward `target` along the short way round.
export function stepAzimuth(current: number, target: number, factor: number, epsilon = 0.002): number {
  const delta = shortestDelta(current, target);
  if (Math.abs(delta) < epsilon) return current + delta;
  return current + delta * factor;
}

export function azimuthOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

export function offsetAt(radius: number, azimuth: number): { x: number; z: number } {
  return { x: radius * Math.sin(azimuth), z: radius * Math.cos(azimuth) };
}
