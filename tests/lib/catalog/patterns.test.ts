import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BODY_PATTERNS,
  PLAIN_BACK,
  findPattern,
  visibleColors,
} from "@/lib/builder/catalog/patterns";
import { initialDesignState } from "@/lib/builder/state/design-state";

const all = BODY_PATTERNS;
const ROLES = ["primary", "secondary", "accent"];

function slotsIn(markup: string): string[] {
  return [...markup.matchAll(/data-color-slot="([a-z]+)"/g)].map((m) => m[1]);
}

describe("pattern registry", () => {
  it("keeps the original six torso patterns first, in order", () => {
    expect(BODY_PATTERNS.slice(0, 6).map((p) => p.label)).toEqual([
      "Liso",
      "Franjas",
      "Diagonal",
      "Degradado",
      "Geométrico",
      "Rayas",
    ]);
  });

  it("has unique ids and unique labels", () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const labels = all.map((p) => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps the ids existing designs already use", () => {
    expect(BODY_PATTERNS.map((p) => p.id)).toEqual(expect.arrayContaining(["stripes-v1", "plain-body"]));
    expect(BODY_PATTERNS.some((p) => p.id === initialDesignState.bodyPatternId)).toBe(true);
  });

  it.each(all.map((p) => ({ id: p.id, pattern: p })))("$id declares valid colors", ({ pattern }) => {
    expect(pattern.colors.length).toBeGreaterThan(0);
    const roles = pattern.colors.map((c) => c.role);
    expect(new Set(roles).size).toBe(roles.length);
    for (const color of pattern.colors) {
      expect(ROLES).toContain(color.role);
      expect(color.label.trim()).not.toBe("");
      expect(color.default).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(all.map((p) => ({ id: p.id, pattern: p })))("$id has SVGs that exist and use exactly the declared roles", ({ pattern }) => {
    // The back may use fewer roles than the pattern declares (a plain back uses only the primary).
    const files = [pattern.svgPath, ...(pattern.svgPathBack ? [pattern.svgPathBack] : [])];
    for (const svgPath of files) {
      const file = path.join(process.cwd(), "public", svgPath);
      expect(fs.existsSync(file)).toBe(true);
      const markup = fs.readFileSync(file, "utf8");
      expect(markup).toContain("<svg");
      const used = new Set(slotsIn(markup));
      const declared = new Set(pattern.colors.map((c) => c.role));
      for (const slot of used) expect(declared.has(slot as never)).toBe(true);
      if (svgPath === pattern.svgPath) for (const role of declared) expect(used.has(role)).toBe(true);
    }
  });

  it("migrated patterns keep today's labels and defaults", () => {
    const stripes = findPattern("stripes-v1")!;
    expect(stripes.colors).toEqual([
      { role: "primary", label: "Color primario", default: "#0a5c36" },
      { role: "secondary", label: "Color secundario", default: "#ffffff" },
    ]);
    expect(findPattern("plain-body")!.colors.map((c) => c.role)).toEqual(["primary"]);
  });
});

describe("findPattern", () => {
  it("finds torso patterns and returns undefined for unknown ids", () => {
    expect(findPattern("hoops")?.label).toBe("Rayas");
    expect(findPattern("sleeve-cuff")).toBeUndefined();
    expect(findPattern("nope")).toBeUndefined();
  });
});

describe("visibleColors", () => {
  it("lists the torso's colors, in the order the pattern declares them", () => {
    expect(visibleColors("plain-body").map((c) => c.role)).toEqual(["primary"]);
    expect(visibleColors("stripes-v1").map((c) => c.role)).toEqual(["primary", "secondary"]);
    expect(visibleColors("stripes-three").map((c) => c.role)).toEqual(["primary", "secondary", "accent"]);
  });

  it("returns an empty list for an unknown id", () => {
    expect(visibleColors("nope")).toEqual([]);
  });
});

describe("the back going on from the front", () => {
  const read = (svgPath: string) => fs.readFileSync(path.join(process.cwd(), "public", svgPath), "utf8");

  it("does not offer vertical stripes that are only a variation of another", () => {
    const ids = BODY_PATTERNS.map((p) => p.id);
    for (const gone of ["stripes-fine", "pinstripes", "stripes-three-wide"]) expect(ids).not.toContain(gone);
    expect(ids).toEqual(expect.arrayContaining(["stripes-v1", "stripes-wide", "stripes-irregular", "five-bands", "stripes-three"]));
  });

  it("gives the designs too busy to continue a plain back", () => {
    for (const id of ["geometric", "waves", "tangle", "swirl", "pixel", "brush", "marble", "blocks", "camo"]) expect(findPattern(id)!.svgPathBack).toBe(PLAIN_BACK);
    expect(slotsIn(read(PLAIN_BACK))).toEqual(["primary"]);
  });

  it("has a back of its own for the diagonal, which goes on from the front, and for the crossbar, without the bar", () => {
    expect(findPattern("diagonal")!.svgPathBack).toBeDefined();
    const crossFront = read(findPattern("stripes-crossbar")!.svgPath);
    const crossBack = read(findPattern("stripes-crossbar")!.svgPathBack!);
    expect(crossFront).toContain('y="240"');
    expect(crossBack).not.toContain('y="240"');
  });

  // Front and back must look like the same design: the front is symmetric about its centre and the back is
  // its middle, at the same scale (same stripes, same widths). Every stripe stays inside that middle, so the
  // edges of front and back are all the base color and the seams meet.
  describe.each(["stripes-v1", "stripes-wide", "stripes-three", "stripes-irregular", "five-bands", "stripes-crossbar"])("%s", (id) => {
    const bars = (svgPath: string) =>
      [...read(svgPath).matchAll(/<rect[^>]*data-color-slot="(?!primary)[a-z]+"[^>]*x="([\d.]+)"[^>]*y="(\d+)"[^>]*width="([\d.]+)"/g)]
        .filter((m) => m[2] === "0")
        .map((m) => [Number(m[1]), Number(m[1]) + Number(m[3])] as const);

    it("is symmetric about the centre of the front", () => {
      const list = bars(findPattern(id)!.svgPath);
      expect(list.length).toBeGreaterThan(1);
      for (const [x0, x1] of list) {
        expect(list.some(([a, b]) => Math.abs(a - (512 - x1)) < 1.5 && Math.abs(b - (512 - x0)) < 1.5), `${id} bar ${x0}-${x1}`).toBe(true);
      }
    });

    it("has the same stripes on the back: the middle of the front, at the same scale", () => {
      const front = bars(findPattern(id)!.svgPath);
      const back = read(findPattern(id)!.svgPathBack!);
      expect(back).toMatch(/<g transform="translate\(-58\.0\d 0\)">/);
      expect(back).not.toContain("scale(");
      expect(bars(findPattern(id)!.svgPathBack!)).toHaveLength(front.length);
    });

    it("keeps every stripe inside the middle that the back shows", () => {
      for (const [x0, x1] of bars(findPattern(id)!.svgPath)) {
        expect(x0, `${id} bar ${x0}-${x1}`).toBeGreaterThanOrEqual(58.1);
        expect(x1, `${id} bar ${x0}-${x1}`).toBeLessThanOrEqual(453.9);
      }
    });
  });
});

describe("the artwork patterns", () => {
  const read = (svgPath: string) => fs.readFileSync(path.join(process.cwd(), "public", svgPath));

  // They came as 5 to 13 MB template sheets (SVG and EPS), with crests and sponsors; every pattern is loaded for its thumbnail.
  it.each(BODY_PATTERNS.map((p) => ({ id: p.id, svgPath: p.svgPath })))("$id is light enough to load and recolor", ({ svgPath }) => {
    expect(read(svgPath).length).toBeLessThan(400 * 1024);
  });

  it.each(["tangle", "swirl", "pixel", "brush", "marble", "blocks", "camo"])("%s is only a pattern: no crest, badge or sponsor, no gradients, no images", (id) => {
    const markup = read(findPattern(id)!.svgPath).toString("utf8");
    expect(markup).not.toMatch(/<(image|linearGradient|radialGradient|text|use|clipPath|ellipse|circle)/);
    expect(markup).not.toMatch(/url\(/);
  });
});
