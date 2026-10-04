import { describe, it, expect } from "vitest";
import { blendNormalMaps, generateFabricHeight, heightToNormalRGBA } from "@/lib/builder/fabric-texture";

describe("generateFabricHeight", () => {
  it("is deterministic and normalized to [0,1]", () => {
    const a = generateFabricHeight(64);
    const b = generateFabricHeight(64);
    expect(a).toEqual(b);
    expect(a.length).toBe(64 * 64);
    expect(Math.min(...a)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...a)).toBeLessThanOrEqual(1);
  });

  it("has real variation (not flat)", () => {
    const a = generateFabricHeight(64);
    expect(Math.max(...a) - Math.min(...a)).toBeGreaterThan(0.3);
  });

  it("tiles seamlessly: wrapping neighbours are as close as inner neighbours", () => {
    const size = 64;
    const h = generateFabricHeight(size);
    let wrap = 0, inner = 0;
    for (let y = 0; y < size; y++) {
      wrap += Math.abs(h[y * size] - h[y * size + size - 1]);
      inner += Math.abs(h[y * size + 31] - h[y * size + 32]);
    }
    expect(wrap).toBeLessThan(inner * 3 + 1);
  });
});

describe("heightToNormalRGBA", () => {
  it("encodes a flat surface as the straight-up normal (128,128,255)", () => {
    const flat = new Float32Array(16).fill(0.5);
    const px = heightToNormalRGBA(flat, 4, 2);
    for (let i = 0; i < 16; i++) {
      expect([px[i * 4], px[i * 4 + 1], px[i * 4 + 2], px[i * 4 + 3]]).toEqual([128, 128, 255, 255]);
    }
  });

  it("tilts the normal against a slope", () => {
    const size = 4;
    const ramp = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) ramp[y * size + x] = x / size;
    const px = heightToNormalRGBA(ramp, size, 2);
    expect(px[(1 * size + 1) * 4]).toBeLessThan(128); // rising to +x -> normal leans to -x
  });
});

function solid(size: number, r: number, g: number, b: number): Uint8ClampedArray {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) px.set([r, g, b, 255], i * 4);
  return px;
}

describe("blendNormalMaps", () => {
  const flat = (size: number) => solid(size, 128, 128, 255);

  it("keeps a flat surface flat", () => {
    const out = blendNormalMaps(flat(4), 4, flat(2), 2, { repeat: 2 });
    for (let i = 0; i < 16; i++) expect(Array.from(out.slice(i * 4, i * 4 + 4))).toEqual([128, 128, 255, 255]);
  });

  it("passes the base through when the detail is flat", () => {
    const base = solid(4, 38, 128, 218); // a unit-length normal leaning toward -x
    const out = blendNormalMaps(base, 4, flat(2), 2, { repeat: 2 });
    expect(Math.abs(out[0] - 38)).toBeLessThanOrEqual(2);
    expect(Math.abs(out[1] - 128)).toBeLessThanOrEqual(2);
  });

  it("adds the detail's tilt on top of a flat base", () => {
    const out = blendNormalMaps(flat(4), 4, solid(2, 60, 128, 230), 2, { repeat: 2 });
    expect(out[0]).toBeLessThan(110);
  });

  it("can flip the base normal's green channel (DirectX -> OpenGL)", () => {
    const base = solid(4, 128, 200, 200);
    const plain = blendNormalMaps(base, 4, flat(2), 2, { repeat: 2 });
    const flipped = blendNormalMaps(base, 4, flat(2), 2, { repeat: 2, flipBaseY: true });
    expect(plain[1] - 128).toBeGreaterThan(20);
    expect(flipped[1] - 128).toBeCloseTo(-(plain[1] - 128), -1);
    expect(flipped[0]).toBe(plain[0]);
  });

  it("scales the detail with detailStrength", () => {
    const detail = solid(2, 60, 128, 230);
    const weak = blendNormalMaps(flat(4), 4, detail, 2, { repeat: 2, detailStrength: 0.25 });
    const strong = blendNormalMaps(flat(4), 4, detail, 2, { repeat: 2, detailStrength: 1 });
    expect(128 - weak[0]).toBeLessThan(128 - strong[0]);
  });

  it("tiles the detail `repeat` times across the base", () => {
    const detail = new Uint8ClampedArray([
      60, 128, 230, 255, 200, 128, 230, 255,
      128, 128, 255, 255, 128, 128, 255, 255,
    ]);
    const out = blendNormalMaps(flat(8), 8, detail, 2, { repeat: 4 });
    // pixel (0,0) and (2,0) land on the same detail texel
    expect(out[0]).toBe(out[2 * 4]);
    expect(out[0]).not.toBe(out[1 * 4]);
  });
});
