import * as THREE from "three";

export const FABRIC_TEXTURE_SIZE = 256;
// Threads per tile along each axis. Integer so the pattern tiles seamlessly.
const THREADS = 24;

// Fixed (frequency, phase) pairs for the low-frequency "cloth drift" that
// stops the weave from looking like a perfectly regular grid. Integer
// frequencies keep the tile seamless.
const DRIFT: ReadonlyArray<readonly [number, number, number, number]> = [
  [2, 1, 0.3, 1.1],
  [3, 2, 2.1, 0.4],
  [1, 3, 4.0, 2.6],
  [5, 4, 1.2, 5.1],
];

/**
 * Height field of a fine polyester jersey weave, in [0,1]. Deterministic and
 * tileable. A fine knit grid carries most of the energy; a faint low-frequency
 * drift breaks up the regularity.
 */
export function generateFabricHeight(size: number): Float32Array {
  const height = new Float32Array(size * size);
  const tau = 2 * Math.PI;
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Interlocking threads: rows offset by half a thread on alternate columns.
      const warp = Math.sin(tau * THREADS * u) * 0.5 + 0.5;
      const weft = Math.sin(tau * THREADS * v + Math.PI * Math.sin(tau * THREADS * u) * 0.5) * 0.5 + 0.5;
      let h = warp * 0.45 + weft * 0.55;
      let drift = 0;
      for (const [fu, fv, pu, pv] of DRIFT) drift += Math.sin(tau * fu * u + pu) * Math.sin(tau * fv * v + pv);
      h += drift * 0.12;
      height[y * size + x] = h;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }

  const range = max - min || 1;
  for (let i = 0; i < height.length; i++) height[i] = Math.min(1, Math.max(0, (height[i] - min) / range));
  return height;
}

/** Converts a height field to tangent-space normal-map RGBA, wrapping at the edges. */
export function heightToNormalRGBA(height: Float32Array, size: number, strength: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(size * size * 4);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      out[o] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round(((dy / len) * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

/** Tileable weave normal map. `repeat` is how many tiles span the UV range. */
export function createFabricNormalTexture(repeat: number, strength = 1.6): THREE.DataTexture {
  const size = FABRIC_TEXTURE_SIZE;
  return tiledTexture(heightToNormalRGBA(generateFabricHeight(size), size, strength), size, repeat);
}

export type BlendOptions = {
  /** How many times the detail tile repeats across the base. */
  repeat: number;
  /** The base's green channel points down (DirectX convention); flip it to OpenGL. */
  flipBaseY?: boolean;
  /** Scales the detail's tilt (1 = as authored). */
  detailStrength?: number;
};

/**
 * Combines two tangent-space normal maps ("whiteout" blend): the base is
 * sampled 1:1, the detail is tiled across it. Returns RGBA at the base's size.
 * Both are expected in the OpenGL convention, except that the base may be
 * flipped with `flipBaseY`.
 */
export function blendNormalMaps(
  base: Uint8ClampedArray,
  size: number,
  detail: Uint8ClampedArray,
  detailSize: number,
  { repeat, flipBaseY = false, detailStrength = 1 }: BlendOptions
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(size * size * 4);
  const decode = (v: number) => (v / 255) * 2 - 1;
  const encode = (v: number) => Math.round((v * 0.5 + 0.5) * 255);

  for (let y = 0; y < size; y++) {
    const dy = Math.floor((y * repeat * detailSize) / size) % detailSize;
    for (let x = 0; x < size; x++) {
      const dx = Math.floor((x * repeat * detailSize) / size) % detailSize;
      const o = (y * size + x) * 4;
      const d = (dy * detailSize + dx) * 4;

      const bx = decode(base[o]);
      const by = decode(base[o + 1]) * (flipBaseY ? -1 : 1);
      const bz = decode(base[o + 2]);
      const tx = decode(detail[d]) * detailStrength;
      const ty = decode(detail[d + 1]) * detailStrength;
      const tz = decode(detail[d + 2]);

      const nx = bx + tx;
      const ny = by + ty;
      const nz = bz * tz;
      const len = Math.hypot(nx, ny, nz) || 1;
      out[o] = encode(nx / len);
      out[o + 1] = encode(ny / len);
      out[o + 2] = encode(nz / len);
      out[o + 3] = 255;
    }
  }
  return out;
}

/**
 * A normal map made of `baseImage` (e.g. wrinkles in the model's UV layout)
 * with the fine knit tiled over it. Returns a canvas texture, so it is
 * oriented like any loaded image (flipY on).
 */
export function createBlendedNormalTexture(
  baseImage: CanvasImageSource,
  options: BlendOptions & { size?: number; weaveStrength?: number }
): THREE.CanvasTexture {
  const size = options.size ?? 2048;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(baseImage, 0, 0, size, size);
  const base = ctx.getImageData(0, 0, size, size);

  const tile = FABRIC_TEXTURE_SIZE;
  const weave = heightToNormalRGBA(generateFabricHeight(tile), tile, options.weaveStrength ?? 1.6);
  const blended = blendNormalMaps(base.data, size, weave, tile, options);
  ctx.putImageData(new ImageData(blended, size, size), 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

function tiledTexture(data: Uint8ClampedArray, size: number, repeat: number): THREE.DataTexture {
  const tex = new THREE.DataTexture(new Uint8Array(data.buffer), size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
