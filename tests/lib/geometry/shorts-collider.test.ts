import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { JERSEY_BOTTOM_Y } from "@/lib/builder/geometry/jersey-model";
import { MAX_SWAY, swayWeight } from "@/lib/builder/geometry/cloth-sway";
import {
  COLLIDER_BINS,
  COLLIDER_MARGIN,
  COLLIDER_SAMPLES,
  buildKitCollider,
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
    // The envelope takes the widest vertex within a direction either side, so it never undershoots.
    expect(across.z).toBeGreaterThanOrEqual(-4 + 4.5 - 1e-6);
    expect(across.z).toBeLessThan(-4 + 4.5 + 0.3);
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

// Möller–Trumbore: distance along the ray to the triangle, or null.
function rayHit(o: number[], d: number[], a: number[], b: number[], c: number[]): number | null {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const s = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv;
  if (u < 0 || u > 1) return null;
  const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-6 ? t : null;
}

describe("the real shorts", () => {
  const shortsVertices = objVertices("public/models/gepe_shorts.obj");
  const shorts = new THREE.BufferGeometry();
  shorts.setAttribute("position", new THREE.Float32BufferAttribute(shortsVertices.flat(), 3));
  const top = Math.max(...shortsVertices.map((v) => v[1]));
  const collider = buildKitCollider(shorts);

  // Triangles of the shorts around the shirt's hem, from the OBJ's faces.
  const faces = readFileSync("public/models/gepe_shorts.obj", "utf8")
    .split("\n")
    .filter((line) => line.startsWith("f "))
    .map((line) => line.trim().split(/\s+/).slice(1, 4).map((s) => Number(s.split("/")[0]) - 1));
  const hemTriangles = faces.map((f) => f.map((i) => shortsVertices[i])).filter((tri) => tri.some((p) => p[1] > 160));

  // Body only: the sleeves are far from the shorts.
  const shirtBody = objVertices("public/models/gepe_shirt.obj").filter((v) => Math.abs(v[0]) < 45 && v[1] <= top);

  // How deep inside the shorts a point is: the farthest crossing of the shorts' wall along an outward ray, or 0.
  function depthInside(x: number, y: number, z: number): number {
    const length = Math.hypot(x, z) || 1;
    const direction = [x / length, 0, z / length];
    let depth = 0;
    for (const tri of hemTriangles) {
      const t = rayHit([x, y, z], direction, tri[0], tri[1], tri[2]);
      if (t !== null) depth = Math.max(depth, t);
    }
    return depth;
  }

  it("covers the shirt's lowest vertices, which lie a hair under JERSEY_BOTTOM_Y", () => {
    expect(Math.min(...shirtBody.map((v) => v[1]))).toBeLessThan(JERSEY_BOTTOM_Y);
    expect(collider.yMin).toBeLessThan(Math.min(...shirtBody.map((v) => v[1])));
  });

  it("barely moves the shirt at rest: the shorts sit inside it", () => {
    expect(shirtBody.length).toBeGreaterThan(0);
    for (const [x, y, z] of shirtBody) {
      const pushed = pushOutside(collider, x, y, z);
      // The shorts already stick out 0.6 past the shirt's hem, plus the margin and the
      // envelope's slack: a unit or so. A vertex that is not touching them must not be flung out.
      expect(Math.hypot(pushed.x - x, pushed.z - z)).toBeLessThan(1.5);
    }
  });

  it("keeps every vertex of the swung shirt outside the shorts, whichever way the camera is orbiting", () => {
    const inside: string[] = [];
    for (let degrees = 0; degrees < 360; degrees += 30) {
      const dx = Math.cos((degrees * Math.PI) / 180);
      const dz = -Math.sin((degrees * Math.PI) / 180);
      for (const [x, y, z] of shirtBody) {
        // What the shader does: the sway squared by the vertex's weight.
        const w = swayWeight(x, y);
        const swung = pushOutside(collider, x + dx * MAX_SWAY * w * w, y, z + dz * MAX_SWAY * w * w);
        const depth = depthInside(swung.x, y, swung.z);
        if (depth > 0.05) inside.push(`${degrees}deg (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}) ${depth.toFixed(2)}`);
      }
    }
    expect(inside).toEqual([]);
  });
});
