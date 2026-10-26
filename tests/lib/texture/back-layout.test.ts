import { describe, it, expect } from "vitest";
import {
  COLLAR_BAND_END_V_FRAC,
  NAPE_V_FRAC,
  NAME_V_FRAC,
  NUMBER_V_FRAC,
  LOWER_BACK_V_FRAC,
  UPPER_BACK_V_FRAC,
  NAME_FONT_FRACTION,
  NUMBER_FONT_FRACTION,
} from "@/lib/builder/texture/back-layout";
import { SPONSOR_SLOTS, SPONSOR_MAX_SCALE, findSponsorSlot } from "@/lib/builder/catalog/sponsor-slots";
import { NAPE_BRAND_BOX_FRACTION } from "@/lib/builder/texture/texture-compositor";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";

const back = GEPE_UV_REGIONS.bodyBack;
const BACK_HEIGHT = back.v1 - back.v0; // canvas fraction covered by vFrac 0..1
const CAP_HEIGHT = 0.72; // capital height as a share of the font size
// canvas fraction -> vFrac along the back panel
const toV = (canvasFraction: number) => canvasFraction / BACK_HEIGHT;
const halfBox = (slotId: string) => toV((findSponsorSlot(slotId)!.baseBox * SPONSOR_MAX_SCALE) / 2);

// Text runs from its top (toward the collar) down to its baseline.
const nameTop = NAME_V_FRAC - toV(NAME_FONT_FRACTION * CAP_HEIGHT);
const numberTop = NUMBER_V_FRAC - toV(NUMBER_FONT_FRACTION * CAP_HEIGHT);

describe("back layout (GEPE model, sponsors at max scale)", () => {
  it("keeps the name and number where they were before the sponsors (25% and 55%)", () => {
    expect(NAME_V_FRAC).toBe(0.25);
    expect(NUMBER_V_FRAC).toBe(0.55);
  });

  it("puts the GEPE logo at the nape between the collar and the name, clear of both", () => {
    // Its longer side is its width; half of that is a safe bound for its half height.
    const half = toV(NAPE_BRAND_BOX_FRACTION / 2);
    expect(NAPE_V_FRAC - half).toBeGreaterThanOrEqual(COLLAR_BAND_END_V_FRAC);
    expect(NAPE_V_FRAC + half).toBeLessThanOrEqual(nameTop);
  });

  it("puts the number below the name", () => {
    expect(numberTop).toBeGreaterThanOrEqual(NAME_V_FRAC);
    expect(nameTop).toBeLessThan(NAME_V_FRAC);
  });

  it("puts the lower-back sponsor at waist height: below the number, well above the hem", () => {
    expect(LOWER_BACK_V_FRAC - halfBox("lower-back")).toBeGreaterThanOrEqual(NUMBER_V_FRAC);
    expect(LOWER_BACK_V_FRAC + halfBox("lower-back")).toBeLessThanOrEqual(0.85);
  });

  it("puts the upper back sponsor between the nape logo and the number: clear of both, even at its largest", () => {
    // Half the logo's height is at most half its width; the sponsor's own box is square.
    expect(UPPER_BACK_V_FRAC - toV(NAPE_BRAND_BOX_FRACTION / 2)).toBeGreaterThan(NAPE_V_FRAC);
    expect(UPPER_BACK_V_FRAC - halfBox("upper-back")).toBeGreaterThanOrEqual(NAPE_V_FRAC + toV(NAPE_BRAND_BOX_FRACTION / 2));
    expect(UPPER_BACK_V_FRAC + halfBox("upper-back")).toBeLessThanOrEqual(numberTop);
  });

  it("keeps the name out of the upper back sponsor's way only by hiding the sponsor: they share the strip", () => {
    // The name's top is inside the sponsor's box at its largest: that is why one hides the other.
    expect(nameTop).toBeLessThan(UPPER_BACK_V_FRAC + halfBox("upper-back"));
    expect(findSponsorSlot("upper-back")!.blockedBy).toBe("playerName");
  });

  it("is the one source of the back sponsors' vertical positions, and has no sponsor at the nape", () => {
    expect(findSponsorSlot("upper-back")!.vFrac).toBe(UPPER_BACK_V_FRAC);
    expect(findSponsorSlot("lower-back")!.vFrac).toBe(LOWER_BACK_V_FRAC);
    expect(findSponsorSlot("nape")).toBeUndefined();
    // Nine on the shirt and three on the shorts.
    expect(SPONSOR_SLOTS.length).toBe(12);
  });
});
