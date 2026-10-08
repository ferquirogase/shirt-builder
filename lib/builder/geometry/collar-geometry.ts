import * as THREE from "three";
import type { Vec3 } from "./mesh-boundary";

export type CollarOptions = {
  /** Half the rib width, measured outward from the loop (model units, ~cm). */
  halfWidth: number;
  /** Half the rib thickness, measured perpendicular to the surface. */
  halfThickness: number;
  radialSegments: number;
  /** Shifts the whole cross-section along the outward (radial) direction. */
  radialOffset?: number;
  /** Shifts the whole cross-section along the "up" direction. */
  upOffset?: number;
  /** Size of one fabric-normal-map tile, in model units. */
  uvTile?: number;
};

const DEFAULT_UV_TILE = 1.4;

/**
 * Resamples a closed loop onto a smooth, evenly spaced curve. The OBJ's neck
 * edge has only ~50 vertices, which reads as a visible polygon once a collar
 * is swept along it.
 */
export function smoothLoop(loop: Vec3[], count: number): Vec3[] {
  const curve = new THREE.CatmullRomCurve3(
    loop.map((p) => new THREE.Vector3(...p)),
    true,
    "centripetal"
  );
  return curve
    .getSpacedPoints(count)
    .slice(0, count)
    .map((v) => [v.x, v.y, v.z] as Vec3);
}

/**
 * Sweeps a flattened tube along a closed loop of points, producing the rolled
 * rib of a crew neck. The frame at every point is (tangent, radial, up) with
 * radial pointing away from the loop's centroid, so the result is
 * independent of the loop's winding direction.
 */
export function buildCollarGeometry(loop: Vec3[], options: CollarOptions): THREE.BufferGeometry {
  const { halfWidth, halfThickness, radialSegments, radialOffset = 0, upOffset = 0 } = options;
  const uvTile = options.uvTile ?? DEFAULT_UV_TILE;
  const n = loop.length;
  const pts = loop.map((p) => new THREE.Vector3(...p));
  const centroid = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(n);

  const ringStride = radialSegments + 1;
  const positions = new Float32Array((n + 1) * ringStride * 3);
  const normals = new Float32Array((n + 1) * ringStride * 3);
  const uvs = new Float32Array((n + 1) * ringStride * 2);

  const perimeter = 2 * Math.PI * Math.sqrt((halfWidth ** 2 + halfThickness ** 2) / 2);
  const tangent = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const up = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const v = new THREE.Vector3();

  let arc = 0;
  for (let i = 0; i <= n; i++) {
    const idx = i % n;
    const p = pts[idx];
    if (i > 0) arc += p.distanceTo(pts[(i - 1) % n]);

    tangent.subVectors(pts[(idx + 1) % n], pts[(idx - 1 + n) % n]).normalize();
    radial.subVectors(p, centroid);
    radial.addScaledVector(tangent, -radial.dot(tangent)).normalize();
    up.crossVectors(tangent, radial);

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * 2 * Math.PI;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      v.copy(p)
        .addScaledVector(radial, radialOffset + halfWidth * c)
        .addScaledVector(up, upOffset + halfThickness * s);
      // Ellipse normal: gradient of (x/a)^2 + (y/b)^2.
      normal
        .set(0, 0, 0)
        .addScaledVector(radial, c / halfWidth)
        .addScaledVector(up, s / halfThickness)
        .normalize();

      const o = i * ringStride + j;
      positions.set([v.x, v.y, v.z], o * 3);
      normals.set([normal.x, normal.y, normal.z], o * 3);
      uvs.set([arc / uvTile, (j / radialSegments) * (perimeter / uvTile)], o * 2);
    }
  }

  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ringStride + j;
      const b = (i + 1) * ringStride + j;
      const c = (i + 1) * ringStride + j + 1;
      const d = i * ringStride + j + 1;
      // (tangent, radial, up) is right-handed, so this winding faces outward.
      indices.push(a, c, b, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
