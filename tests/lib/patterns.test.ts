import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BODY_PATTERNS,
  SLEEVE_PATTERNS,
  findPattern,
  visibleColors,
} from "@/lib/builder/patterns";
import { initialDesignState } from "@/lib/builder/design-state";

const all = [...BODY_PATTERNS, ...SLEEVE_PATTERNS];
const ROLES = ["primary", "secondary", "accent"];

function slotsIn(markup: string): string[] {
  return [...markup.matchAll(/data-color-slot="([a-z]+)"/g)].map((m) => m[1]);
}

describe("pattern registry", () => {
  it("keeps the original six torso patterns first, in order, and the three sleeve patterns", () => {
    expect(BODY_PATTERNS.slice(0, 6).map((p) => p.label)).toEqual([
      "Liso",
      "Franjas",
      "Diagonal",
      "Degradado",
      "Geométrico",
      "Rayas",
    ]);
    expect(SLEEVE_PATTERNS.slice(0, 3).map((p) => p.id)).toEqual(["sleeve-plain", "sleeve-primary", "sleeve-cuff"]);
  });

  it("has unique ids and unique labels across body and sleeve lists", () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bodyLabels = BODY_PATTERNS.map((p) => p.label);
    expect(new Set(bodyLabels).size).toBe(bodyLabels.length);
    const sleeveLabels = SLEEVE_PATTERNS.map((p) => p.label);
    expect(new Set(sleeveLabels).size).toBe(sleeveLabels.length);
  });

  it("keeps the ids existing designs already use", () => {
    expect(BODY_PATTERNS.map((p) => p.id)).toEqual(expect.arrayContaining(["stripes-v1", "plain-body"]));
    expect(SLEEVE_PATTERNS.map((p) => p.id)).toContain("sleeve-plain");
    expect(BODY_PATTERNS.some((p) => p.id === initialDesignState.bodyPatternId)).toBe(true);
    expect(SLEEVE_PATTERNS.some((p) => p.id === initialDesignState.sleevePatternId)).toBe(true);
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
    const files = [pattern.svgPath, ...(pattern.svgPathBack ? [pattern.svgPathBack] : [])];
    for (const svgPath of files) {
      const file = path.join(process.cwd(), "public", svgPath);
      expect(fs.existsSync(file)).toBe(true);
      const markup = fs.readFileSync(file, "utf8");
      expect(markup).toContain("<svg");
      const used = new Set(slotsIn(markup));
      const declared = new Set(pattern.colors.map((c) => c.role));
      for (const slot of used) expect(declared.has(slot as never)).toBe(true);
      for (const role of declared) expect(used.has(role)).toBe(true);
    }
  });

  it("migrated patterns keep today's labels and defaults", () => {
    const stripes = findPattern("stripes-v1")!;
    expect(stripes.colors).toEqual([
      { role: "primary", label: "Color primario", default: "#0a5c36" },
      { role: "secondary", label: "Color secundario", default: "#ffffff" },
    ]);
    expect(findPattern("plain-body")!.colors.map((c) => c.role)).toEqual(["primary"]);
    expect(findPattern("sleeve-plain")!.colors.map((c) => c.role)).toEqual(["secondary"]);
    expect(findPattern("sleeve-primary")!.colors.map((c) => c.role)).toEqual(["primary"]);
    expect(findPattern("sleeve-cuff")!.colors.map((c) => c.role)).toEqual(["primary", "secondary"]);
  });
});

describe("findPattern", () => {
  it("finds body and sleeve patterns and returns undefined for unknown ids", () => {
    expect(findPattern("hoops")?.label).toBe("Rayas");
    expect(findPattern("sleeve-cuff")?.label).toBe("Con puño");
    expect(findPattern("nope")).toBeUndefined();
  });
});

describe("visibleColors", () => {
  it("lists the torso's colors first, then roles only the sleeves use, without duplicates", () => {
    expect(visibleColors("plain-body", "sleeve-plain").map((c) => c.role)).toEqual(["primary", "secondary"]);
    expect(visibleColors("stripes-v1", "sleeve-cuff").map((c) => c.role)).toEqual(["primary", "secondary"]);
  });

  it("uses the torso's label when both patterns use the same role", () => {
    // stripes-three and sleeve-accent both use accent, with different labels
    const accents = visibleColors("stripes-three", "sleeve-accent").filter((c) => c.role === "accent");
    expect(accents).toHaveLength(1);
    expect(accents[0].label).toBe("Línea fina");
  });

  it("returns an empty list for unknown ids", () => {
    expect(visibleColors("nope", "nope")).toEqual([]);
  });
});
