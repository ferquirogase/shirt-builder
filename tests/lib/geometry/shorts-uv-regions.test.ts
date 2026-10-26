import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { SHORTS_UV_REGIONS, SHORTS_UV_STRETCH } from "@/lib/builder/geometry/shorts-uv-regions";
import { uvPointOnMesh } from "@/lib/builder/geometry/sponsor-anchor";

// The shorts' texture is one band: the back of one leg, the front of both and the back of the other,
// with the sides between them. These regions are the four leg panels, measured on the OBJ.
describe("SHORTS_UV_REGIONS on the GEPE shorts", () => {
  const geometry = firstMeshGeometry(new OBJLoader().parse(readFileSync("public/models/gepe_shorts.obj", "utf8")))!;
  const middle = (r: { u0: number; u1: number; v0: number; v1: number }) => ({ u: (r.u0 + r.u1) / 2, v: (r.v0 + r.v1) / 2 });
  const at = (name: keyof typeof SHORTS_UV_REGIONS) => {
    const m = middle(SHORTS_UV_REGIONS[name]);
    return uvPointOnMesh(geometry, m.u, m.v)!;
  };

  it("has a panel for the front and the back of each leg", () => {
    expect(Object.keys(SHORTS_UV_REGIONS).sort()).toEqual(
      ["shortsBackLeft", "shortsBackRight", "shortsFrontLeft", "shortsFrontRight"].sort()
    );
  });

  it("puts each panel on the cloth, facing the right way", () => {
    // The front of the shorts is +z, like the shirt; the player's right is -x seen from the front.
    expect(at("shortsFrontRight").normal.z).toBeGreaterThan(0.5);
    expect(at("shortsFrontRight").position.x).toBeLessThan(0);
    expect(at("shortsFrontLeft").normal.z).toBeGreaterThan(0.5);
    expect(at("shortsFrontLeft").position.x).toBeGreaterThan(0);
    expect(at("shortsBackRight").normal.z).toBeLessThan(-0.5);
    expect(at("shortsBackRight").position.x).toBeLessThan(0);
    expect(at("shortsBackLeft").normal.z).toBeLessThan(-0.5);
    expect(at("shortsBackLeft").position.x).toBeGreaterThan(0);
  });

  it("keeps the panels apart and in the order of the band", () => {
    const r = SHORTS_UV_REGIONS;
    expect(r.shortsBackRight.u1).toBeLessThan(r.shortsFrontRight.u0);
    expect(r.shortsFrontRight.u1).toBeLessThan(r.shortsFrontLeft.u0);
    expect(r.shortsFrontLeft.u1).toBeLessThan(r.shortsBackLeft.u0);
  });

  it("covers the legs from the hem to the waist, with v growing upwards", () => {
    const hem = uvPointOnMesh(geometry, middle(SHORTS_UV_REGIONS.shortsFrontRight).u, SHORTS_UV_REGIONS.shortsFrontRight.v0 + 0.01)!;
    const waist = uvPointOnMesh(geometry, middle(SHORTS_UV_REGIONS.shortsFrontRight).u, SHORTS_UV_REGIONS.shortsFrontRight.v1 - 0.01)!;
    expect(waist.position.y).toBeGreaterThan(hem.position.y + 60);
  });
});

// Why nothing is turned or mirrored on the shorts (unlike the back of the shirt): seen from the
// front, u grows to the right of the viewer, which is +x; seen from behind +x is on the viewer's
// left, so on the back panels u grows as x falls, which is the viewer's right again.
describe("the direction of u on the GEPE shorts", () => {
  const geometry = firstMeshGeometry(new OBJLoader().parse(readFileSync("public/models/gepe_shorts.obj", "utf8")))!;
  const xAt = (u: number) => uvPointOnMesh(geometry, u, 0.3)!.position.x;

  it("grows with x on the front panels: to the right of the viewer", () => {
    expect(xAt(0.37)).toBeLessThan(xAt(0.48));
    expect(xAt(0.54)).toBeLessThan(xAt(0.65));
  });

  it("falls with x on the back panels: to the right of the viewer, seen from behind", () => {
    expect(xAt(0.15)).toBeGreaterThan(xAt(0.26));
    expect(xAt(0.74)).toBeGreaterThan(xAt(0.86));
  });
});

describe("SHORTS_UV_STRETCH", () => {
  it("squeezes what is drawn sideways, because the texture has more cloth per unit across than up", () => {
    expect(SHORTS_UV_STRETCH).toBeGreaterThan(0.5);
    expect(SHORTS_UV_STRETCH).toBeLessThan(1);
  });
});
