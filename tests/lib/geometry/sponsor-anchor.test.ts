import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";
import { isFacingCamera, sponsorAnchor, uvPointOnMesh } from "@/lib/builder/geometry/sponsor-anchor";
import { SPONSOR_SLOTS, findSponsorSlot } from "@/lib/builder/catalog/sponsor-slots";

// One triangle in the z = 5 plane, whose UVs are the same triangle scaled by 0.1.
function triangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 5, 10, 0, 5, 0, 10, 5], 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  return geometry;
}

describe("uvPointOnMesh", () => {
  it("finds the 3D point under a point of the texture", () => {
    const anchor = uvPointOnMesh(triangle(), 0.25, 0.25)!;
    expect(anchor.position.x).toBeCloseTo(2.5);
    expect(anchor.position.y).toBeCloseTo(2.5);
    expect(anchor.position.z).toBeCloseTo(5);
  });

  it("gives the direction the cloth faces there, as a unit vector", () => {
    const { normal } = uvPointOnMesh(triangle(), 0.25, 0.25)!;
    expect(normal.length()).toBeCloseTo(1);
    expect(Math.abs(normal.z)).toBeCloseTo(1);
  });

  it("uses the normals of the model when it has them", () => {
    const geometry = triangle();
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, -1, 0, 0, -1, 0, 0, -1], 3));
    expect(uvPointOnMesh(geometry, 0.25, 0.25)!.normal.z).toBeCloseTo(-1);
  });

  it("works on an indexed mesh", () => {
    const geometry = triangle();
    geometry.setIndex([0, 1, 2]);
    expect(uvPointOnMesh(geometry, 0.25, 0.25)!.position.x).toBeCloseTo(2.5);
  });

  it("gives null for a point of the texture that no triangle covers", () => {
    expect(uvPointOnMesh(triangle(), 0.9, 0.9)).toBeNull();
  });
});

describe("isFacingCamera", () => {
  const point = new THREE.Vector3(0, 0, 0);
  it("is true when the cloth looks towards the camera", () => {
    expect(isFacingCamera(point, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 10))).toBe(true);
  });
  it("is false when the cloth looks away, as the back does when the camera is at the front", () => {
    expect(isFacingCamera(point, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 10))).toBe(false);
  });
  it("is false for cloth seen edge-on, unless a margin is allowed", () => {
    const edgeOn = new THREE.Vector3(1, 0, 0);
    const camera = new THREE.Vector3(0, 0, 10);
    expect(isFacingCamera(point, edgeOn, camera)).toBe(false);
    // The outer face of a sleeve is seen edge-on from the front; its marker still has to show.
    expect(isFacingCamera(point, edgeOn, camera, -0.5)).toBe(true);
  });

  it("still hides cloth that looks straight away, whatever the margin", () => {
    expect(isFacingCamera(point, new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 10), -0.5)).toBe(false);
  });

  it("shows a sleeve's marker from the front of the real shirt, and hides the lower back's", () => {
    const obj = new OBJLoader().parse(readFileSync("public/models/gepe_shirt.obj", "utf8"));
    const geometry = firstMeshGeometry(obj)!;
    const front = new THREE.Vector3(0, 230, 600);
    for (const id of ["abdomen", "sleeve-left", "sleeve-right"]) {
      const a = sponsorAnchor(geometry, GEPE_UV_REGIONS, findSponsorSlot(id)!)!;
      expect(isFacingCamera(a.position, a.normal, front, -0.5), id).toBe(true);
    }
    const back = sponsorAnchor(geometry, GEPE_UV_REGIONS, findSponsorSlot("lower-back")!)!;
    expect(isFacingCamera(back.position, back.normal, front, -0.5)).toBe(false);
  });
});

describe("sponsorAnchor on the GEPE shirt", () => {
  const obj = new OBJLoader().parse(readFileSync("public/models/gepe_shirt.obj", "utf8"));
  const geometry = firstMeshGeometry(obj)!;
  const anchorOf = (id: string) => sponsorAnchor(geometry, GEPE_UV_REGIONS, findSponsorSlot(id)!)!;

  it("finds a point on the cloth for every placement", () => {
    for (const slot of SPONSOR_SLOTS) {
      expect(sponsorAnchor(geometry, GEPE_UV_REGIONS, slot), slot.id).not.toBeNull();
    }
  });

  it("puts the abdomen on the front, facing forward, and the lower back on the back, facing backwards", () => {
    // The front of the shirt is +z (the camera starts there).
    expect(anchorOf("abdomen").position.z).toBeGreaterThan(0);
    expect(anchorOf("abdomen").normal.z).toBeGreaterThan(0.5);
    expect(anchorOf("lower-back").position.z).toBeLessThan(0);
    expect(anchorOf("lower-back").normal.z).toBeLessThan(-0.5);
  });

  it("puts the five front placements on the front, facing forward", () => {
    for (const id of ["abdomen", "belly", "waist", "chest-right", "chest-left"]) {
      expect(anchorOf(id).position.z, id).toBeGreaterThan(0);
      expect(anchorOf(id).normal.z, id).toBeGreaterThan(0.5);
    }
  });

  it("stacks the center column from the chest down to the waist", () => {
    expect(anchorOf("abdomen").position.y).toBeGreaterThan(anchorOf("belly").position.y);
    expect(anchorOf("belly").position.y).toBeGreaterThan(anchorOf("waist").position.y);
    for (const id of ["belly", "waist"]) expect(Math.abs(anchorOf(id).position.x), id).toBeLessThan(5);
  });

  it("puts the upper chest ones just outside the collar, not out on the shoulder's edge", () => {
    for (const id of ["chest-right", "chest-left"]) {
      const x = Math.abs(anchorOf(id).position.x);
      expect(x, id).toBeGreaterThan(24);
      expect(x, id).toBeLessThan(31);
    }
  });

  it("puts the upper chest ones above the center column, the player's right on the left of the front view", () => {
    // Seen from the front, the player's right is on the viewer's left, which is -x.
    expect(anchorOf("chest-right").position.x).toBeLessThan(0);
    expect(anchorOf("chest-left").position.x).toBeGreaterThan(0);
    expect(anchorOf("chest-right").position.y).toBeGreaterThan(anchorOf("abdomen").position.y);
  });

  it("puts both back placements on the back, the upper one above the lower one", () => {
    for (const id of ["upper-back", "lower-back"]) {
      expect(anchorOf(id).position.z, id).toBeLessThan(0);
      expect(anchorOf(id).normal.z, id).toBeLessThan(-0.5);
    }
    expect(anchorOf("upper-back").position.y).toBeGreaterThan(anchorOf("lower-back").position.y);
  });

  it("puts the player's right sleeve (4) on the left of the front view, like GEPE's map", () => {
    expect(anchorOf("sleeve-right").position.x).toBeLessThan(0);
    expect(anchorOf("sleeve-left").position.x).toBeGreaterThan(0);
  });

  it("puts the sleeves on opposite sides, away from the body", () => {
    const left = anchorOf("sleeve-left").position.x;
    const right = anchorOf("sleeve-right").position.x;
    expect(Math.sign(left)).toBe(-Math.sign(right));
    expect(Math.abs(left)).toBeGreaterThan(50);
    expect(Math.abs(right)).toBeGreaterThan(50);
  });

  it("puts the abdomen above the lower back, and both inside the shirt's height", () => {
    const abdomenY = anchorOf("abdomen").position.y;
    const lowerBackY = anchorOf("lower-back").position.y;
    expect(abdomenY).toBeGreaterThan(167.17);
    expect(abdomenY).toBeLessThan(294.91);
    expect(lowerBackY).toBeGreaterThan(167.17);
    expect(lowerBackY).toBeLessThan(294.91);
  });
});
