export type ViewSide = "front" | "back";

// The jersey front faces +z and the camera starts on +z, so azimuth 0 is the
// front and PI is the back.
export const VIEW_AZIMUTH: Record<ViewSide, number> = { front: 0, back: Math.PI };

// Default camera pose (see Viewer3D): height above the jersey center and
// horizontal distance from it. "Restablecer vista" eases back to these.
export const DEFAULT_CAMERA_HEIGHT = 1.0;
export const DEFAULT_CAMERA_RADIUS = 2.6;

// How far the view can be panned (scene units, from the default centre). The
// kit is about 1.8 tall and the shirt 1.3 wide with its sleeves, so the box
// reaches a bit past them: you can bring any corner to the middle, never lose
// the garment. Tune from screenshots.
export const PAN_LIMIT = { x: 0.9, y: 1.1, z: 0.4 };

export type Point3 = { x: number; y: number; z: number };

export function clampPanTarget(target: Point3): Point3 {
  const hold = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
  return { x: hold(target.x, PAN_LIMIT.x), y: hold(target.y, PAN_LIMIT.y), z: hold(target.z, PAN_LIMIT.z) };
}

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

// One easing step of a plain number toward `target`; snaps when close.
export function stepToward(current: number, target: number, factor: number, epsilon = 0.002): number {
  const delta = target - current;
  if (Math.abs(delta) < epsilon) return target;
  return current + delta * factor;
}

export function azimuthOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

export function offsetAt(radius: number, azimuth: number): { x: number; z: number } {
  return { x: radius * Math.sin(azimuth), z: radius * Math.cos(azimuth) };
}
