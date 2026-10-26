import { describe, it, expect } from "vitest";
import {
  SPONSOR_SLOTS,
  SPONSOR_MIN_SCALE,
  SPONSOR_MAX_SCALE,
  availableSponsorSlots,
  clampSponsorScale,
  findSponsorSlot,
  isShortsSlot,
  isSponsorSlotId,
  sponsorNumber,
} from "@/lib/builder/catalog/sponsor-slots";
import { GEPE_UV_REGIONS } from "@/lib/builder/geometry/uv-regions";
import { SHORTS_UV_REGIONS } from "@/lib/builder/geometry/shorts-uv-regions";

const ALL_REGIONS = { ...GEPE_UV_REGIONS, ...SHORTS_UV_REGIONS };
const SHIRT_IDS = ["abdomen", "belly", "waist", "sleeve-right", "sleeve-left", "upper-back", "lower-back", "chest-right", "chest-left"];
const SHORTS_IDS = ["shorts-back-left", "shorts-back-right", "shorts-front-right"];
const withShorts = (playerName = "") => ({ playerName, shorts: { included: true } });
const noShorts = (playerName = "") => ({ playerName, shorts: { included: false } });

describe("sponsor slots", () => {
  it("lists GEPE's twelve placements in GEPE's order, with their labels", () => {
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
      ["shorts-back-left", "Short atrás izquierda"], // 10: the left leg is on the left seen from behind
      ["shorts-back-right", "Short atrás derecha"], // 11
      ["shorts-front-right", "Short frente"], // 12: the player's right leg, on the left seen from the front
    ]);
  });

  it("knows which placements are on the shorts", () => {
    expect(SPONSOR_SLOTS.filter(isShortsSlot).map((s) => s.id)).toEqual(SHORTS_IDS);
    expect(SPONSOR_SLOTS.filter((s) => !isShortsSlot(s)).map((s) => s.id)).toEqual(SHIRT_IDS);
  });

  it("does not turn or mirror anything on the shorts: their texture reads upright on both sides", () => {
    // Unlike the shirt's back, the shorts' back is not turned in the texture: seen from behind, u runs
    // to the right and v up, like on the front (checked on the OBJ and on screenshots).
    for (const id of ["shorts-back-left", "shorts-back-right", "shorts-front-right"]) {
      expect(findSponsorSlot(id)!.rotation, id).toBe(0);
    }
    expect(SPONSOR_SLOTS.filter(isShortsSlot).length).toBe(3);
  });

  it("puts the shorts' placements on their leg panels", () => {
    expect(findSponsorSlot("shorts-back-left")!.region).toBe("shortsBackLeft");
    expect(findSponsorSlot("shorts-back-right")!.region).toBe("shortsBackRight");
    expect(findSponsorSlot("shorts-front-right")!.region).toBe("shortsFrontRight");
  });

  it("puts the two on the back lower on the leg than the one on the front, both on the part of the thigh that shows", () => {
    const front = findSponsorSlot("shorts-front-right")!.vFrac;
    const backLeft = findSponsorSlot("shorts-back-left")!.vFrac;
    const backRight = findSponsorSlot("shorts-back-right")!.vFrac;
    expect(backLeft).toBe(backRight);
    expect(backLeft).toBeLessThan(front);
    // The top of the shorts is under the shirt, so only the lower part of the leg shows.
    for (const v of [front, backLeft]) {
      expect(v).toBeGreaterThan(0.2);
      expect(v).toBeLessThan(0.55);
    }
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

  it("makes every placement of the shorts a size that fits its leg", () => {
    for (const id of SHORTS_IDS) {
      expect(findSponsorSlot(id)!.baseBox, id).toBe(0.06);
    }
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
      const region = ALL_REGIONS[s.region];
      // The sleeves are rotated: a square box must fit along the sleeve's short axis (u).
      const room = region.u1 - region.u0;
      const share = s.region === "sleeveLeft" || s.region === "sleeveRight" ? 0.8 : 0.7;
      expect(s.baseBox * SPONSOR_MAX_SCALE).toBeLessThanOrEqual(room * share);
    }
  });

  it("recognizes ids", () => {
    expect(isSponsorSlotId("lower-back")).toBe(true);
    expect(isSponsorSlotId("upper-back")).toBe(true);
    expect(isSponsorSlotId("shorts-front-right")).toBe(true);
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
  it("offers the nine of the shirt when the kit has no shorts, while the player has no name", () => {
    expect(availableSponsorSlots(noShorts()).map((s) => s.id)).toEqual(SHIRT_IDS);
  });

  it("asks nothing about the shorts of a design that does not say (only the shirt)", () => {
    expect(availableSponsorSlots({ playerName: "" }).map((s) => s.id)).toEqual(SHIRT_IDS);
  });

  it("adds the three of the shorts, after the shirt's, when the kit has them", () => {
    expect(availableSponsorSlots(withShorts()).map((s) => s.id)).toEqual([...SHIRT_IDS, ...SHORTS_IDS]);
  });

  it("takes the upper back away when the player has a name: the name goes where the 6 would", () => {
    const ids = availableSponsorSlots(noShorts("PEREZ")).map((s) => s.id);
    expect(ids).not.toContain("upper-back");
    expect(ids).toHaveLength(8);
  });

  it("does not count a name of only spaces", () => {
    expect(availableSponsorSlots(noShorts("   ")).map((s) => s.id)).toContain("upper-back");
  });

  it("the name takes only the upper back: the shorts keep their three", () => {
    const ids = availableSponsorSlots(withShorts("PEREZ")).map((s) => s.id);
    for (const id of SHORTS_IDS) expect(ids).toContain(id);
  });
});

describe("sponsorNumber", () => {
  it("is GEPE's number when everything is available, the shorts' ones being 10, 11 and 12", () => {
    const all = availableSponsorSlots(withShorts());
    expect(all.map((s) => sponsorNumber(s.id, all))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("renumbers the rest when a placement is taken away, the shorts' too", () => {
    const withName = availableSponsorSlots(withShorts("PEREZ"));
    expect(sponsorNumber("shorts-front-right", withName)).toBe(11);
    expect(sponsorNumber("shorts-back-left", withName)).toBe(9);
  });

  it("renumbers the shirt's when a placement is taken away", () => {
    const withName = availableSponsorSlots(noShorts("PEREZ"));
    // 6 is gone: lower back (GEPE 7) becomes 6, and the upper chest ones become 7 and 8.
    expect(sponsorNumber("lower-back", withName)).toBe(6);
    expect(sponsorNumber("chest-right", withName)).toBe(7);
    expect(sponsorNumber("chest-left", withName)).toBe(8);
    expect(sponsorNumber("abdomen", withName)).toBe(1);
  });

  it("is 0 for a placement that is not offered", () => {
    expect(sponsorNumber("upper-back", availableSponsorSlots(noShorts("PEREZ")))).toBe(0);
    expect(sponsorNumber("shorts-front-right", availableSponsorSlots(noShorts()))).toBe(0);
  });
});
