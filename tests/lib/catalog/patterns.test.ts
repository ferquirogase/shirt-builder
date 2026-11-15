import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BODY_PATTERNS, findPattern, hasCuff, visibleColors } from "@/lib/builder/catalog/patterns";
import { initialDesignState } from "@/lib/builder/state/design-state";

const ROLES = ["primary", "secondary", "accent", "quaternary"];
const file = (p: string) => path.join(process.cwd(), "public", p);
const slotsIn = (markup: string) => new Set([...markup.matchAll(/data-(?:color|stroke)-slot="([a-z]+)"/g)].map((m) => m[1]));
const moldes = BODY_PATTERNS.filter((p) => p.id.startsWith("molde-"));

describe("pattern registry", () => {
  it("offers a plain shirt first and then the owners' twenty moldes, in their order", () => {
    expect(BODY_PATTERNS[0].id).toBe("plain-body");
    expect(BODY_PATTERNS[0].label).toBe("Liso");
    expect(moldes.map((p) => p.id)).toEqual(Array.from({ length: 20 }, (_, i) => `molde-${String(i + 1).padStart(2, "0")}`));
    expect(BODY_PATTERNS).toHaveLength(21);
  });

  it("has unique ids and unique labels, which describe the design and never name a team", () => {
    expect(new Set(BODY_PATTERNS.map((p) => p.id)).size).toBe(BODY_PATTERNS.length);
    expect(new Set(BODY_PATTERNS.map((p) => p.label)).size).toBe(BODY_PATTERNS.length);
    for (const p of BODY_PATTERNS) expect(p.label).not.toMatch(/boca|river|racing|independiente|juventus|barcelona|madrid|united|nassr|molde/i);
  });

  it("starts a new design on one of them", () => {
    expect(findPattern(initialDesignState.bodyPatternId)).toBeDefined();
  });

  it.each(BODY_PATTERNS.map((p) => ({ id: p.id, p })))("$id names its colors Color principal, Color 2, 3, 4", ({ p }) => {
    expect(p.colors.length).toBeGreaterThan(0);
    expect(p.colors.length).toBeLessThanOrEqual(4);
    p.colors.forEach((c, i) => {
      expect(c.role).toBe(ROLES[i]);
      expect(c.label).toBe(i === 0 ? "Color principal" : `Color ${i + 1}`);
      expect(c.default).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("takes from the PDF the number of colors each molde is sold with", () => {
    // "N COLORES" under each molde; the cuff is a color of its own, apart.
    const counts = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 3, 3, 2, 4, 2];
    expect(moldes.map((p) => p.colors.length)).toEqual(counts);
  });

  it.each(BODY_PATTERNS.map((p) => ({ id: p.id, p })))("$id has its front, back, sleeve and thumbnail files", ({ p }) => {
    for (const piece of [p.frontPath, p.backPath ?? p.frontPath, p.sleevePath, p.thumbPath]) {
      expect(piece).toMatch(/\.(svg|png)$/);
      expect(fs.existsSync(file(piece)), piece).toBe(true);
    }
  });

  it.each(BODY_PATTERNS.map((p) => ({ id: p.id, p })))("$id draws its SVG pieces with only the roles it declares", ({ p }) => {
    const declared = new Set<string>(p.colors.map((c) => c.role));
    const pieces = [p.frontPath, p.backPath, p.sleevePath].filter((x): x is string => !!x && x.endsWith(".svg"));
    for (const piece of pieces) {
      for (const slot of slotsIn(fs.readFileSync(file(piece), "utf8"))) expect(declared.has(slot), `${piece}: ${slot}`).toBe(true);
    }
    if (p.frontPath.endsWith(".svg")) {
      const all = new Set(pieces.flatMap((x) => [...slotsIn(fs.readFileSync(file(x), "utf8"))]));
      for (const role of declared) expect(all.has(role), `${p.id} never uses ${role}`).toBe(true);
    }
  });

  it("keeps every piece light enough to load on a phone", () => {
    for (const p of BODY_PATTERNS) {
      for (const piece of [p.frontPath, p.backPath, p.sleevePath, p.thumbPath].filter((x): x is string => !!x)) {
        expect(fs.statSync(file(piece)).size, piece).toBeLessThan(300 * 1024);
      }
    }
  });

  it("gives heavy moldes a small thumbnail of their own", () => {
    for (const p of BODY_PATTERNS) {
      if (p.frontPath.endsWith(".png")) {
        expect(p.thumbPath).not.toBe(p.frontPath);
        expect(fs.statSync(file(p.thumbPath)).size).toBeLessThan(40 * 1024);
      }
    }
  });

  it("knows where each sleeve's cuff band starts, near the cuff", () => {
    for (const p of BODY_PATTERNS) {
      if (p.cuffFrom === null) continue;
      expect(p.cuffFrom).toBeGreaterThan(0.7);
      expect(p.cuffFrom).toBeLessThan(1);
    }
    expect(hasCuff("plain-body")).toBe(true);
    expect(hasCuff("molde-03")).toBe(false);
    expect(hasCuff("molde-05")).toBe(true);
    expect(hasCuff("nope")).toBe(false);
  });
});

describe("findPattern and visibleColors", () => {
  it("find a pattern by id and nothing for an unknown one", () => {
    expect(findPattern("molde-13")?.label).toBe("Camuflaje");
    expect(findPattern("stripes-v1")).toBeUndefined();
    expect(visibleColors("nope")).toEqual([]);
  });

  it("list the torso's colors in the order the molde uses them", () => {
    expect(visibleColors("plain-body").map((c) => c.role)).toEqual(["primary"]);
    expect(visibleColors("molde-19").map((c) => c.role)).toEqual(ROLES);
  });
});
