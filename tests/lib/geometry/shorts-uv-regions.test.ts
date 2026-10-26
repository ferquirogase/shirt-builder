import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import {
  SHORTS_CREST_BOX_FRACTION,
  SHORTS_CREST_STRETCH,
  SHORTS_FRONT_LAYOUT,
  SHORTS_UV_REGIONS,
  SHORTS_UV_STRETCH,
} from "@/lib/builder/geometry/shorts-uv-regions";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";
import { CREST_BOX_FRACTION } from "@/lib/builder/texture/texture-compositor";
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

// What matters to the player: the crest on the shorts looks as big as the one on the chest. The two
// textures cover different amounts of cloth per unit, so this is measured on the models themselves.
describe("the crest on the shorts, against the one on the chest", () => {
  const shirt = firstMeshGeometry(new OBJLoader().parse(readFileSync("public/models/gepe_shirt.obj", "utf8")))!;
  const shorts = firstMeshGeometry(new OBJLoader().parse(readFileSync("public/models/gepe_shorts.obj", "utf8")))!;

  // Model units of cloth for a step in u and in v around a point of the texture.
  function clothPerUnit(geometry: typeof shirt, u: number, v: number) {
    const d = 0.01;
    const at = (du: number, dv: number) => uvPointOnMesh(geometry, u + du, v + dv)!.position;
    return {
      perU: at(d, 0).distanceTo(at(-d, 0)) / (2 * d),
      perV: at(0, d).distanceTo(at(0, -d)) / (2 * d),
    };
  }

  const chest = (() => {
    const f = GEPE_UV_REGIONS.bodyFront;
    // The crest's own point on the chest (see the compositor): 0.66 across and 0.71 up.
    const c = clothPerUnit(shirt, f.u0 + 0.66 * (f.u1 - f.u0), f.v0 + 0.71 * (f.v1 - f.v0));
    return { width: CREST_BOX_FRACTION * c.perU, height: CREST_BOX_FRACTION * c.perV };
  })();

  const onShorts = (() => {
    const { region, uFrac, vFrac } = SHORTS_FRONT_LAYOUT.crest;
    const r = SHORTS_UV_REGIONS[region];
    const c = clothPerUnit(shorts, r.u0 + uFrac * (r.u1 - r.u0), r.v0 + vFrac * (r.v1 - r.v0));
    return {
      width: SHORTS_CREST_BOX_FRACTION * c.perU * SHORTS_CREST_STRETCH,
      height: SHORTS_CREST_BOX_FRACTION * c.perV,
    };
  })();

  it("is as wide and as tall as the one on the chest, within a tenth", () => {
    expect(onShorts.width / chest.width).toBeGreaterThan(0.9);
    expect(onShorts.width / chest.width).toBeLessThan(1.1);
    expect(onShorts.height / chest.height).toBeGreaterThan(0.9);
    expect(onShorts.height / chest.height).toBeLessThan(1.1);
  });

  it("is not stretched: as wide as it is tall, as the square crest box is", () => {
    expect(onShorts.width / onShorts.height).toBeGreaterThan(0.9);
    expect(onShorts.width / onShorts.height).toBeLessThan(1.1);
  });
});
