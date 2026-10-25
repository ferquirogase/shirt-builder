import * as THREE from "three";
import type { SponsorSlot } from "../catalog/sponsor-slots";
import type { UVRegions } from "./uv-regions";

export type SponsorAnchor = {
  /** A point on the cloth, in the model's own units. */
  position: THREE.Vector3;
  /** The direction the cloth faces there, as a unit vector. */
  normal: THREE.Vector3;
};

// A point of the texture is a point of the cloth: the sponsor is painted at (u, v) of the
// atlas, and the mesh says where on the shirt that (u, v) is. This finds the triangle of
// the mesh that covers it and reads the position and the normal there.
export function uvPointOnMesh(geometry: THREE.BufferGeometry, u: number, v: number): SponsorAnchor | null {
  const positions = geometry.getAttribute("position");
  const uvs = geometry.getAttribute("uv");
  if (!positions || !uvs) return null;
  const normals = geometry.getAttribute("normal");
  const index = geometry.getIndex();
  const triangles = index ? index.count / 3 : positions.count / 3;

  const vertex = (triangle: number, corner: number) => (index ? index.getX(triangle * 3 + corner) : triangle * 3 + corner);

  for (let t = 0; t < triangles; t++) {
    const [ia, ib, ic] = [vertex(t, 0), vertex(t, 1), vertex(t, 2)];
    const [ax, ay] = [uvs.getX(ia), uvs.getY(ia)];
    const [bx, by] = [uvs.getX(ib), uvs.getY(ib)];
    const [cx, cy] = [uvs.getX(ic), uvs.getY(ic)];

    // Barycentric coordinates of (u, v) in the triangle's texture footprint.
    const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(det) < 1e-12) continue;
    const wa = ((by - cy) * (u - cx) + (cx - bx) * (v - cy)) / det;
    const wb = ((cy - ay) * (u - cx) + (ax - cx) * (v - cy)) / det;
    const wc = 1 - wa - wb;
    const eps = -1e-9;
    if (wa < eps || wb < eps || wc < eps) continue;

    const a = new THREE.Vector3().fromBufferAttribute(positions, ia);
    const b = new THREE.Vector3().fromBufferAttribute(positions, ib);
    const c = new THREE.Vector3().fromBufferAttribute(positions, ic);
    const position = a.clone().multiplyScalar(wa).addScaledVector(b, wb).addScaledVector(c, wc);

    let normal: THREE.Vector3;
    if (normals) {
      const na = new THREE.Vector3().fromBufferAttribute(normals, ia);
      const nb = new THREE.Vector3().fromBufferAttribute(normals, ib);
      const nc = new THREE.Vector3().fromBufferAttribute(normals, ic);
      normal = na.multiplyScalar(wa).addScaledVector(nb, wb).addScaledVector(nc, wc);
    } else {
      normal = b.clone().sub(a).cross(c.clone().sub(a));
    }
    return { position, normal: normal.normalize() };
  }
  return null;
}

// Where a sponsor placement sits on the 3D shirt. The (u, v) is worked out like the
// compositor does it when it paints the sponsor, so the marker and the image coincide.
export function sponsorAnchor(
  geometry: THREE.BufferGeometry,
  regions: UVRegions,
  slot: Pick<SponsorSlot, "region" | "uFrac" | "vFrac">
): SponsorAnchor | null {
  const region = regions[slot.region];
  const u = region.u0 + slot.uFrac * (region.u1 - region.u0);
  const v = region.v0 + slot.vFrac * (region.v1 - region.v0);
  return uvPointOnMesh(geometry, u, v);
}

// Is this bit of cloth turned towards the camera? The ones on the far side of the shirt
// (the back, seen from the front) are not shown. `minCos` is how far from head-on still
// counts: 0 is up to edge-on, and below 0 lets in cloth seen at a slant behind its edge.
export function isFacingCamera(
  position: THREE.Vector3,
  normal: THREE.Vector3,
  camera: THREE.Vector3,
  minCos = 0
): boolean {
  const toCamera = camera.clone().sub(position).normalize();
  return normal.dot(toCamera) > minCos;
}
