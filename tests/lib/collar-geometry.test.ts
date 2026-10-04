import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { buildCollarGeometry, smoothLoop } from "@/lib/builder/collar-geometry";
import type { Vec3 } from "@/lib/builder/mesh-boundary";

function ring(n: number, rx: number, rz: number, y: number): Vec3[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return [Math.cos(a) * rx, y, Math.sin(a) * rz] as Vec3;
  });
}

describe("buildCollarGeometry", () => {
  const loop = ring(40, 20, 17, 290);
  const geo = buildCollarGeometry(loop, { halfWidth: 1.4, halfThickness: 0.5, radialSegments: 8 });

  it("builds one ring per loop point, duplicating the seams so UVs don't stretch", () => {
    expect(geo.getAttribute("position").count).toBe(41 * 9);
    expect(geo.getAttribute("uv").count).toBe(41 * 9);
    expect(geo.getIndex()!.count).toBe(40 * 8 * 6);
  });

  it("keeps the rib within its half-width of the loop", () => {
    geo.computeBoundingBox();
    const box = geo.boundingBox!;
    expect(box.max.x).toBeCloseTo(21.4, 0);
    expect(box.max.y).toBeCloseTo(290.5, 0);
    expect(box.min.y).toBeCloseTo(289.5, 0);
  });

  it("has outward-facing normals regardless of loop direction", () => {
    for (const l of [loop, [...loop].reverse()]) {
      const g = buildCollarGeometry(l, { halfWidth: 1.4, halfThickness: 0.5, radialSegments: 8 });
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      const centre = new THREE.Vector3(0, 290, 0);
      let outward = 0;
      for (let i = 0; i < pos.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i);
        // distance from the loop centerline circle-ish: compare with the nearest loop point
        const nearest = l.reduce((b, q) => (p.distanceTo(new THREE.Vector3(...q)) < p.distanceTo(new THREE.Vector3(...b)) ? q : b));
        const n = new THREE.Vector3().fromBufferAttribute(nor, i);
        if (n.dot(p.clone().sub(new THREE.Vector3(...nearest))) > 0) outward++;
      }
      expect(outward / pos.count).toBeGreaterThan(0.95);
      expect(centre).toBeDefined();
    }
  });
});

describe("smoothLoop", () => {
  const coarse = ring(12, 20, 17, 290);

  it("returns the requested number of points", () => {
    expect(smoothLoop(coarse, 96)).toHaveLength(96);
  });

  it("stays on the original curve", () => {
    for (const p of smoothLoop(coarse, 96)) {
      const r = Math.hypot(p[0] / 20, p[2] / 17);
      expect(r).toBeGreaterThan(0.97);
      expect(r).toBeLessThan(1.03);
      expect(p[1]).toBeCloseTo(290, 5);
    }
  });

  it("spaces points evenly", () => {
    const pts = smoothLoop(coarse, 96).map((p) => new THREE.Vector3(...p));
    const gaps = pts.map((p, i) => p.distanceTo(pts[(i + 1) % pts.length]));
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.1);
  });
});
