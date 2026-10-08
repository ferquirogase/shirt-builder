import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { firstMeshGeometry, prepareJerseyGeometry } from "@/lib/builder/geometry/jersey-geometry";

// A box mesh whose y bounds are [minY, maxY].
function meshSpanningY(minY: number, maxY: number) {
  const geometry = new THREE.BoxGeometry(2, maxY - minY, 2);
  geometry.translate(0, (minY + maxY) / 2, 0);
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
}

describe("firstMeshGeometry", () => {
  it("finds the geometry of a mesh nested inside groups", () => {
    const mesh = meshSpanningY(0, 10);
    const inner = new THREE.Group();
    inner.add(mesh);
    const root = new THREE.Group();
    root.add(new THREE.Group(), inner);
    expect(firstMeshGeometry(root)).toBe(mesh.geometry);
  });

  it("takes the first mesh when there are several", () => {
    const first = meshSpanningY(0, 1);
    const second = meshSpanningY(0, 2);
    const root = new THREE.Group();
    root.add(first, second);
    expect(firstMeshGeometry(root)).toBe(first.geometry);
  });

  it("returns null when there is no mesh, or no object at all", () => {
    expect(firstMeshGeometry(new THREE.Group())).toBeNull();
    expect(firstMeshGeometry(null)).toBeNull();
    expect(firstMeshGeometry(undefined)).toBeNull();
  });
});

describe("prepareJerseyGeometry", () => {
  it("returns a copy of the body, leaving the loaded geometry untouched", () => {
    const body = meshSpanningY(100, 300);
    const root = new THREE.Group();
    root.add(body);
    const prepared = prepareJerseyGeometry(root, null);
    expect(prepared.body).not.toBeNull();
    expect(prepared.body).not.toBe(body.geometry);
    // Measuring the copy must not touch the cached source geometry.
    expect(body.geometry.boundingBox).toBeNull();
  });

  it("centers on the middle of the body's vertical extent", () => {
    const root = new THREE.Group();
    root.add(meshSpanningY(100, 300));
    expect(prepareJerseyGeometry(root, null).centerY).toBeCloseTo(200, 5);
  });

  it("centers a body that is not symmetrical about the origin", () => {
    const root = new THREE.Group();
    root.add(meshSpanningY(-50, 10));
    expect(prepareJerseyGeometry(root, null).centerY).toBeCloseTo(-20, 5);
  });

  it("passes the collar geometry through as is", () => {
    const body = new THREE.Group();
    body.add(meshSpanningY(0, 10));
    const collarMesh = meshSpanningY(8, 12);
    const collar = new THREE.Group();
    collar.add(collarMesh);
    expect(prepareJerseyGeometry(body, collar).collar).toBe(collarMesh.geometry);
  });

  it("has no collar when the collar model has no mesh or is missing", () => {
    const body = new THREE.Group();
    body.add(meshSpanningY(0, 10));
    expect(prepareJerseyGeometry(body, new THREE.Group()).collar).toBeNull();
    expect(prepareJerseyGeometry(body, undefined).collar).toBeNull();
  });

  it("yields no body and a zero center when the body model has no mesh", () => {
    const prepared = prepareJerseyGeometry(new THREE.Group(), null);
    expect(prepared.body).toBeNull();
    expect(prepared.centerY).toBe(0);
  });
});
