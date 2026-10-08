import { describe, it, expect } from "vitest";
import {
  COLLAR_BAND_END_V_FRAC,
  NAPE_V_FRAC,
  NAME_V_FRAC,
  NUMBER_V_FRAC,
  LOWER_BACK_V_FRAC,
  NAME_FONT_FRACTION,
  NUMBER_FONT_FRACTION,
} from "@/lib/builder/back-layout";
import { SPONSOR_SLOTS, SPONSOR_MAX_SCALE, findSponsorSlot } from "@/lib/builder/sponsor-slots";
import { GEPE_UV_REGIONS } from "@/lib/builder/uv-regions";

const back = GEPE_UV_REGIONS.bodyBack;
const BACK_HEIGHT = back.v1 - back.v0; // canvas fraction covered by vFrac 0..1
const CAP_HEIGHT = 0.72; // capital height as a share of the font size
// canvas fraction -> vFrac along the back panel
const toV = (canvasFraction: number) => canvasFraction / BACK_HEIGHT;
const halfBox = (slotId: string) => toV((findSponsorSlot(slotId)!.baseBox * SPONSOR_MAX_SCALE) / 2);

describe("back layout (GEPE model, sponsors at max scale)", () => {
  it("keeps the nape sponsor out of the collar band", () => {
    expect(NAPE_V_FRAC - halfBox("nape")).toBeGreaterThanOrEqual(COLLAR_BAND_END_V_FRAC);
  });

  it("puts the name below the nape sponsor", () => {
    const nameTop = NAME_V_FRAC - toV(NAME_FONT_FRACTION * CAP_HEIGHT);
    expect(nameTop).toBeGreaterThanOrEqual(NAPE_V_FRAC + halfBox("nape"));
  });

  it("puts the number below the name", () => {
    const numberTop = NUMBER_V_FRAC - toV(NUMBER_FONT_FRACTION * CAP_HEIGHT);
    expect(numberTop).toBeGreaterThanOrEqual(NAME_V_FRAC);
  });

  it("keeps the lower-back sponsor below the number and above the hem", () => {
    expect(LOWER_BACK_V_FRAC - halfBox("lower-back")).toBeGreaterThanOrEqual(NUMBER_V_FRAC);
    expect(LOWER_BACK_V_FRAC + halfBox("lower-back")).toBeLessThanOrEqual(1);
  });

  it("is the one source of the back sponsors' vertical positions", () => {
    expect(findSponsorSlot("nape")!.vFrac).toBe(NAPE_V_FRAC);
    expect(findSponsorSlot("lower-back")!.vFrac).toBe(LOWER_BACK_V_FRAC);
    expect(SPONSOR_SLOTS.length).toBe(5);
  });
});
