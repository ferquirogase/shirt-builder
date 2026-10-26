import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { firstMeshGeometry } from "@/lib/builder/geometry/jersey-geometry";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";
import { uvPointOnMesh } from "@/lib/builder/geometry/sponsor-anchor";
import { NAPE_V_FRAC } from "@/lib/builder/texture/back-layout";
import { NAPE_BRAND_BOX_FRACTION, NAPE_BRAND_SQUEEZE_Y } from "@/lib/builder/texture/texture-compositor";

// The logo is the PNG's own proportions: 512 x 381.
const LOGO_ASPECT = 512 / 381;

// The logo at the nape is painted on the collar's part of the texture, and the collar mesh stretches
// it: there is more cloth up the neck than across it. This measures how the logo comes out on the
// collar of the real model, so it does not look taller than it is.
describe("the maker's logo at the nape, on the GEPE collar", () => {
  const collar = firstMeshGeometry(new OBJLoader().parse(readFileSync("public/models/gepe_collar.obj", "utf8")))!;
  const back = GEPE_UV_REGIONS.bodyBack;
  const u = back.u0 + 0.5 * (back.u1 - back.u0);
  const vAt = (vFrac: number) => back.v0 + vFrac * (back.v1 - back.v0);

  // Model units of cloth for a step of the texture across and up, averaged over the height the logo covers.
  function clothPerUnit() {
    const half = (NAPE_BRAND_BOX_FRACTION / LOGO_ASPECT / 2) / (back.v1 - back.v0); // half the logo's height, in vFrac
    const samples = [-1, -0.5, 0, 0.5, 1].map((k) => NAPE_V_FRAC + k * half);
    const d = 0.004;
    let across = 0;
    let up = 0;
    for (const vFrac of samples) {
      const v = vAt(vFrac);
      const at = (du: number, dv: number) => uvPointOnMesh(collar, u + du, v + dv)!.position;
      across += at(d, 0).distanceTo(at(-d, 0)) / (2 * d);
      up += at(0, d).distanceTo(at(0, -d)) / (2 * d);
    }
    return { perU: across / samples.length, perV: up / samples.length };
  }

  it("is on the collar's cloth, which the body of the shirt does not cover there", () => {
    expect(uvPointOnMesh(collar, u, vAt(NAPE_V_FRAC))).not.toBeNull();
  });

  it("has more cloth up the neck than across it: that is what stretches it", () => {
    const { perU, perV } = clothPerUnit();
    expect(perV / perU).toBeGreaterThan(1.2);
  });

  it("comes out in the logo's own proportions on the collar, not stretched upwards", () => {
    const { perU, perV } = clothPerUnit();
    const width = NAPE_BRAND_BOX_FRACTION * perU;
    const height = (NAPE_BRAND_BOX_FRACTION / LOGO_ASPECT) * NAPE_BRAND_SQUEEZE_Y * perV;
    expect(width / height / LOGO_ASPECT).toBeGreaterThan(0.93);
    expect(width / height / LOGO_ASPECT).toBeLessThan(1.07);
  });

  it("is squeezed, not enlarged", () => {
    expect(NAPE_BRAND_SQUEEZE_Y).toBeGreaterThan(0.5);
    expect(NAPE_BRAND_SQUEEZE_Y).toBeLessThan(1);
  });
});
