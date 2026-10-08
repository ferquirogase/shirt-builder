import { NeutralToneMapping } from "three";

// Khronos PBR Neutral keeps the colors the user picks true. R3F's default, ACES
// Filmic, bends saturated reds toward orange once a surface is overexposed.
export const TONE_MAPPING = NeutralToneMapping;
export const TONE_MAPPING_EXPOSURE = 1;

export const AMBIENT_INTENSITY = 1.4;
export const KEY_LIGHT_INTENSITY = 1.7;
export const KEY_LIGHT_POSITION: [number, number, number] = [2, 4, 3];

// How bright a surface that faces the key light head-on gets, as a multiple of
// its own color (diffuse only; three.js divides irradiance by PI for Lambert).
// Above 1 the brightest cloth is overexposed and its colors clip.
export function peakDiffuseGain(): number {
  return (AMBIENT_INTENSITY + KEY_LIGHT_INTENSITY) / Math.PI;
}

// Where the key light goes for a camera at (cameraX, cameraZ) around the shirt:
// KEY_LIGHT_POSITION turned about the vertical axis by the camera's azimuth, so
// the light keeps the same place relative to the view. With the camera at the
// front it is KEY_LIGHT_POSITION itself; at the back it is on the back side, so
// the back is lit like the front.
export function keyLightPositionFor(cameraX: number, cameraZ: number): [number, number, number] {
  const [ox, oy, oz] = KEY_LIGHT_POSITION;
  const azimuth = Math.atan2(cameraX, cameraZ); // 0 = front, PI = back
  const cos = Math.cos(azimuth);
  const sin = Math.sin(azimuth);
  return [ox * cos + oz * sin, oy, -ox * sin + oz * cos];
}
