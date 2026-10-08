import { describe, it, expect } from "vitest";
import {
  SPONSOR_SLOTS,
  SPONSOR_MIN_SCALE,
  SPONSOR_MAX_SCALE,
  clampSponsorScale,
  findSponsorSlot,
  isSponsorSlotId,
} from "@/lib/builder/sponsor-slots";
import { GEPE_UV_REGIONS } from "@/lib/builder/uv-regions";

describe("sponsor slots", () => {
  it("lists the five placements in order with their labels", () => {
    expect(SPONSOR_SLOTS.map((s) => [s.id, s.label])).toEqual([
      ["abdomen", "Abdomen"],
      ["sleeve-left", "Manga izquierda"],
      ["sleeve-right", "Manga derecha"],
      ["nape", "Nuca"],
      ["lower-back", "Espalda baja"],
    ]);
  });

  it("sizes them abdomen > sleeves > lower back > nape", () => {
    const size = (id: string) => findSponsorSlot(id)!.baseBox;
    expect(size("abdomen")).toBe(0.12);
    expect(size("sleeve-left")).toBe(0.05);
    expect(size("sleeve-right")).toBe(0.05);
    expect(size("lower-back")).toBe(0.045);
    expect(size("nape")).toBe(0.03);
    expect(size("abdomen")).toBeGreaterThan(size("sleeve-left"));
    expect(size("sleeve-left")).toBeGreaterThan(size("lower-back"));
    expect(size("lower-back")).toBeGreaterThan(size("nape"));
  });

  it("orients each placement from the mesh: upright, upside-down on the back, sleeves along their axis", () => {
    const rotation = (id: string) => findSponsorSlot(id)!.rotation;
    expect(rotation("abdomen")).toBe(0);
    expect(rotation("nape")).toBe(Math.PI);
    expect(rotation("lower-back")).toBe(Math.PI);
    expect(rotation("sleeve-left")).toBe(-Math.PI / 2);
    expect(rotation("sleeve-right")).toBe(Math.PI / 2);
  });

  it("keeps every anchor inside its region", () => {
    for (const s of SPONSOR_SLOTS) {
      expect(s.uFrac).toBeGreaterThanOrEqual(0);
      expect(s.uFrac).toBeLessThanOrEqual(1);
      expect(s.vFrac).toBeGreaterThanOrEqual(0);
      expect(s.vFrac).toBeLessThanOrEqual(1);
    }
  });

  it("fits every placement's maximum size inside its zone on the GEPE model", () => {
    for (const s of SPONSOR_SLOTS) {
      const region = GEPE_UV_REGIONS[s.region];
      // The sleeves are rotated: a square box must fit along the sleeve's short axis (u).
      const room = region.u1 - region.u0;
      const share = s.region === "sleeveLeft" || s.region === "sleeveRight" ? 0.8 : 0.7;
      expect(s.baseBox * SPONSOR_MAX_SCALE).toBeLessThanOrEqual(room * share);
    }
  });

  it("recognizes ids", () => {
    expect(isSponsorSlotId("nape")).toBe(true);
    expect(isSponsorSlotId("nope")).toBe(false);
    expect(findSponsorSlot("nope")).toBeUndefined();
  });

  it("clamps the scale to 0.5..1.5 and treats a non-number as 1 (Review Focus 1)", () => {
    expect(SPONSOR_MIN_SCALE).toBe(0.5);
    expect(SPONSOR_MAX_SCALE).toBe(1.5);
    expect(clampSponsorScale(5)).toBe(1.5);
    expect(clampSponsorScale(0)).toBe(0.5);
    expect(clampSponsorScale(1.2)).toBe(1.2);
    expect(clampSponsorScale(Number.NaN)).toBe(1);
    expect(clampSponsorScale(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
