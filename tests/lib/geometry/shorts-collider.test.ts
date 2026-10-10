import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { JERSEY_BOTTOM_Y } from "@/lib/builder/geometry/jersey-model";
import {
  COLLIDER_BINS,
  COLLIDER_MARGIN,
  COLLIDER_SAMPLES,
  buildShortsCollider,
  pushOutside,
  type ShortsCollider,
} from "@/lib/builder/geometry/shorts-collider";

function geometryOf(points: number[][]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
  return geometry;
}

// Rings of `segments` points at each height, on the ellipse (a, b) around (cx, cz).
function rings(heights: number[], a: number, b: number, cx = 0, cz = 0, segments = 96): THREE.BufferGeometry {
  const points: number[][] = [];
  for (const y of heights) {
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      points.push([cx + a * Math.cos(angle), y, cz + b * Math.sin(angle)]);
    }
  }
  return geometryOf(points);
}

// A collider that is a circle of the given radius at each of its evenly spaced heights.
function circles(yMin: number, yMax: number, radii: number[]): ShortsCollider {
  return {
    yMin,
    yMax,
    samples: radii.map((r) => ({ cx: 0, cz: 0, radii: Array.from({ length: COLLIDER_BINS }, () => r) })),
  };
}

function objVertices(path: string): number[][] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.startsWith("v "))
    .map((line) => line.trim().split(/\s+/).slice(1, 4).map(Number));
}

describe("buildShortsCollider", () => {
  it("measures the centre and the radius all around at each height", () => {
    const collider = buildShortsCollider(rings([100, 110, 120, 130, 140], 10, 10, 5, -3), 100, 140, 5);
    expect(collider.yMin).toBe(100);
    expect(collider.yMax).toBe(140);
    expect(collider.samples).toHaveLength(5);
    for (const sample of collider.samples) {
      expect(sample.cx).toBeCloseTo(5, 3);
      expect(sample.cz).toBeCloseTo(-3, 3);
      expect(sample.radii).toHaveLength(COLLIDER_BINS);
      for (const r of sample.radii) expect(r).toBeCloseTo(10, 1);
    }
  });

  it("takes COLLIDER_SAMPLES heights by default", () => {
    expect(buildShortsCollider(rings([100, 140], 10, 10), 100, 140).samples).toHaveLength(COLLIDER_SAMPLES);
  });

  it("fills a direction with no vertices from its neighbours, and a height with none from the nearest", () => {
    // Eight points around a circle of radius 2, at one height only: 16 of the 24 directions are empty.
    const { samples } = buildShortsCollider(rings([100], 2, 2, 0, 0, 8), 0, 100, 5);
    expect(samples).toHaveLength(5);
    for (const sample of samples) {
      for (const r of sample.radii) expect(r).toBeCloseTo(2, 1);
    }
  });
});

describe("pushOutside", () => {
  const margin = 0.5;
  const ramp = circles(0, 10, [1, 2, 3]);

  it("leaves a point that is already outside exactly where it is", () => {
    expect(pushOutside(ramp, 5, 5, 0, margin)).toEqual({ x: 5, z: 0 });
  });

  it("leaves a point outside the covered heights alone, however deep in the shape", () => {
    expect(pushOutside(ramp, 0.1, 50, 0.1, margin)).toEqual({ x: 0.1, z: 0.1 });
    expect(pushOutside(ramp, 0.1, -1, 0.1, margin)).toEqual({ x: 0.1, z: 0.1 });
  });

  it("pushes a point that went inside out to the surface plus the margin, along the same direction", () => {
    // At y=5 the radius is 2: the surface with margin is at 2.5. At y=2.5 it is 1.5, so 2.0.
    const pushed = pushOutside(ramp, 1, 5, 0, margin);
    expect(pushed.x).toBeCloseTo(2.5, 6);
    expect(pushed.z).toBeCloseTo(0, 6);
    const diagonal = pushOutside(ramp, 0.5, 5, 0.5, margin);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(2.5, 6);
    expect(diagonal.x).toBeCloseTo(diagonal.z, 6);
    expect(Math.hypot(...Object.values(pushOutside(ramp, 0.5, 2.5, 0, margin)))).toBeCloseTo(2, 6);
  });

  it("follows a shape that is not a circle: wide one way, narrow the other, off-centre", () => {
    const oval = buildShortsCollider(rings([0, 5, 10], 8, 4, 10, -4), 0, 10, 3);
    // On the long axis the surface is at 8 (+ margin) from the centre; on the short axis at 4.
    const along = pushOutside(oval, 10 + 7, 5, -4, margin);
    expect(along.x).toBeCloseTo(10 + 8.5, 1);
    const across = pushOutside(oval, 10, 5, -4 + 3.5, margin);
    expect(across.z).toBeCloseTo(-4 + 4.5, 1);
    // Just outside the short axis, where a bounding circle would have pushed it.
    expect(pushOutside(oval, 10, 5, -4 + 5, margin)).toEqual({ x: 10, z: 1 });
  });

  it("is idempotent: a pushed point stays where it is", () => {
    const once = pushOutside(ramp, 0.3, 7, -0.2, margin);
    const twice = pushOutside(ramp, once.x, 7, once.z, margin);
    expect(twice.x).toBeCloseTo(once.x, 9);
    expect(twice.z).toBeCloseTo(once.z, 9);
  });

  it("uses COLLIDER_MARGIN when no margin is given", () => {
    const pushed = pushOutside(ramp, 1, 5, 0);
    expect(pushed.x).toBeCloseTo(2 + COLLIDER_MARGIN, 6);
  });
});

describe("the real shorts", () => {
  const flat = objVertices("public/models/gepe_shorts.obj").flat();
  const shorts = new THREE.BufferGeometry();
  shorts.setAttribute("position", new THREE.Float32BufferAttribute(flat, 3));
  shorts.computeBoundingBox();
  const top = shorts.boundingBox!.max.y;
  const collider = buildShortsCollider(shorts, JERSEY_BOTTOM_Y, top);

  // Body only: the sleeves are far from the shorts.
  const shirtBody = objVertices("public/models/gepe_shirt.obj")
    .filter((v) => Math.abs(v[0]) < 45)
    .filter((v) => v[1] >= JERSEY_BOTTOM_Y && v[1] <= top);

  it("barely moves the shirt at rest: the shorts sit inside it", () => {
    expect(shirtBody.length).toBeGreaterThan(0);
    for (const [x, y, z] of shirtBody) {
      const pushed = pushOutside(collider, x, y, z);
      // The shorts already stick out 0.6 past the shirt's hem, plus the margin: about a unit.
      expect(Math.hypot(pushed.x - x, pushed.z - z)).toBeLessThan(1.5);
    }
  });

  it("keeps the shirt out of the shorts even when its hem is swung sideways by the largest sway", () => {
    for (const [x, y, z] of shirtBody) {
      for (const swing of [-7, 7]) {
        const once = pushOutside(collider, x + swing, y, z);
        // Out means pushing it again changes nothing.
        const again = pushOutside(collider, once.x, y, once.z);
        expect(Math.hypot(again.x - once.x, again.z - once.z)).toBeLessThan(1e-6);
      }
    }
  });
});
