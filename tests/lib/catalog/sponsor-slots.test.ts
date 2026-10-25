import { describe, it, expect } from "vitest";
import {
  SPONSOR_SLOTS,
  SPONSOR_MIN_SCALE,
  SPONSOR_MAX_SCALE,
  availableSponsorSlots,
  clampSponsorScale,
  findSponsorSlot,
  isSponsorSlotId,
  sponsorNumber,
} from "@/lib/builder/catalog/sponsor-slots";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";

describe("sponsor slots", () => {
  it("lists GEPE's nine shirt placements in GEPE's order, with their labels", () => {
    expect(SPONSOR_SLOTS.map((s) => [s.id, s.label])).toEqual([
      ["abdomen", "Pecho"], // GEPE 1
      ["belly", "Abdomen"], // 2
      ["waist", "Cintura"], // 3
      ["sleeve-right", "Manga derecha"], // 4: seen on the left of the front view
      ["sleeve-left", "Manga izquierda"], // 5
      ["upper-back", "Espalda alta"], // 6
      ["lower-back", "Espalda baja"], // 7
      ["chest-right", "Pecho alto derecho"], // 8
      ["chest-left", "Pecho alto izquierdo"], // 9
    ]);
  });

  it("gives the three center placements a wide, short rectangle, like a sponsor's banner", () => {
    for (const id of ["abdomen", "belly", "waist"]) {
      const slot = findSponsorSlot(id)!;
      expect(slot.baseBox, id).toBe(0.12);
      expect(slot.baseHeight, id).toBeLessThan(slot.baseBox / 2);
    }
  });

  it("stacks the three center placements so that even at their biggest they do not touch", () => {
    const center = ["abdomen", "belly", "waist"].map((id) => findSponsorSlot(id)!);
    const front = GEPE_UV_REGIONS.bodyFront;
    const height = front.v1 - front.v0;
    // What matters is the height of the rectangle, not its width.
    const tall = (s: (typeof center)[number]) => s.baseHeight ?? s.baseBox;
    for (let i = 0; i < center.length - 1; i++) {
      const gap = (center[i].vFrac - center[i + 1].vFrac) * height; // canvas fraction between the two centers
      const reach = (tall(center[i]) + tall(center[i + 1])) * SPONSOR_MAX_SCALE * 0.5;
      expect(gap, `${center[i].id} / ${center[i + 1].id}`).toBeGreaterThanOrEqual(reach);
    }
  });

  it("sizes them: the chest column widest, then the sleeves, the small corners and the back", () => {
    const size = (id: string) => findSponsorSlot(id)!.baseBox;
    expect(size("sleeve-left")).toBe(0.05);
    expect(size("sleeve-right")).toBe(0.05);
    expect(size("lower-back")).toBe(0.045);
    expect(size("chest-right")).toBe(size("chest-left"));
    expect(size("chest-right")).toBeLessThan(size("abdomen"));
    expect(size("upper-back")).toBeLessThan(size("lower-back"));
  });

  it("puts the two upper chest placements on either side, on the shoulders beside the collar, above the logo and the crest", () => {
    const right = findSponsorSlot("chest-right")!;
    const left = findSponsorSlot("chest-left")!;
    // The GEPE logo is at u 0.3 and the crest at u 0.66 (seen from the front).
    expect(right.uFrac).toBeLessThan(0.3);
    expect(left.uFrac).toBeGreaterThan(0.66);
    expect(right.uFrac + left.uFrac).toBeCloseTo(1, 5);
    // Close to the collar, as GEPE draws them, not out at the edge of the shoulder.
    expect(right.uFrac).toBeGreaterThan(0.25);
    expect(right.vFrac).toBeGreaterThanOrEqual(0.78);
    // The image is painted by the neck, where the model has no cloth of its own, so the marker
    // sits on the nearest cloth, a little further out; the other placements need no such thing.
    expect(right.marker!.uFrac).toBeLessThan(right.uFrac);
    expect(left.marker!.uFrac).toBeGreaterThan(left.uFrac);
    expect(right.marker!.vFrac).toBe(right.vFrac);
    expect(findSponsorSlot("abdomen")!.marker).toBeUndefined();
    expect(findSponsorSlot("chest-right")!.baseHeight).toBeLessThan(findSponsorSlot("chest-right")!.baseBox);
    expect(right.vFrac).toBe(left.vFrac);
    expect(right.vFrac).toBeGreaterThan(0.71);
    expect(right.region).toBe("bodyFront");
  });

  it("orients each placement from the mesh: upright, upside-down on the back, sleeves along their axis", () => {
    const rotation = (id: string) => findSponsorSlot(id)!.rotation;
    for (const id of ["abdomen", "belly", "waist", "chest-right", "chest-left"]) expect(rotation(id), id).toBe(0);
    expect(rotation("upper-back")).toBe(Math.PI);
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
    expect(isSponsorSlotId("lower-back")).toBe(true);
    expect(isSponsorSlotId("upper-back")).toBe(true);
    // The nape belongs to the GEPE logo: it is not a placement for a sponsor.
    expect(isSponsorSlotId("nape")).toBe(false);
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
  });
});

describe("which placements can be used", () => {
  it("offers all nine while the player has no name", () => {
    expect(availableSponsorSlots({ playerName: "" }).map((s) => s.id)).toEqual(SPONSOR_SLOTS.map((s) => s.id));
  });

  it("takes the upper back away when the player has a name: the name goes where the 6 would", () => {
    const ids = availableSponsorSlots({ playerName: "PEREZ" }).map((s) => s.id);
    expect(ids).not.toContain("upper-back");
    expect(ids).toHaveLength(8);
  });

  it("does not count a name of only spaces", () => {
    expect(availableSponsorSlots({ playerName: "   " }).map((s) => s.id)).toContain("upper-back");
  });
});

describe("sponsorNumber", () => {
  it("is GEPE's number when everything is available", () => {
    const all = availableSponsorSlots({ playerName: "" });
    expect(all.map((s) => sponsorNumber(s.id, all))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("renumbers the rest when a placement is taken away", () => {
    const withName = availableSponsorSlots({ playerName: "PEREZ" });
    // 6 is gone: lower back (GEPE 7) becomes 6, and the upper chest ones become 7 and 8.
    expect(sponsorNumber("lower-back", withName)).toBe(6);
    expect(sponsorNumber("chest-right", withName)).toBe(7);
    expect(sponsorNumber("chest-left", withName)).toBe(8);
    expect(sponsorNumber("abdomen", withName)).toBe(1);
  });

  it("is 0 for a placement that is not offered", () => {
    expect(sponsorNumber("upper-back", availableSponsorSlots({ playerName: "PEREZ" }))).toBe(0);
  });
});
