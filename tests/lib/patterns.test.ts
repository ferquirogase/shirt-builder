import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { initialDesignState } from "@/lib/builder/design-state";

const all = [...BODY_PATTERNS, ...SLEEVE_PATTERNS];

describe("pattern registry", () => {
  it("has the six torso patterns from the mockup and three sleeve patterns", () => {
    expect(BODY_PATTERNS.map((p) => p.label)).toEqual([
      "Liso",
      "Franjas",
      "Diagonal",
      "Degradado",
      "Geométrico",
      "Rayas",
    ]);
    expect(SLEEVE_PATTERNS).toHaveLength(3);
  });

  it("has unique ids across body and sleeve lists", () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the ids existing designs already use", () => {
    expect(BODY_PATTERNS.map((p) => p.id)).toEqual(expect.arrayContaining(["stripes-v1", "plain-body"]));
    expect(SLEEVE_PATTERNS.map((p) => p.id)).toContain("sleeve-plain");
    expect(BODY_PATTERNS.some((p) => p.id === initialDesignState.bodyPatternId)).toBe(true);
    expect(SLEEVE_PATTERNS.some((p) => p.id === initialDesignState.sleevePatternId)).toBe(true);
  });

  it.each(all.map((p) => [p.id, p.svgPath]))("%s points to an SVG that exists and uses a color slot", (_id, svgPath) => {
    const file = path.join(process.cwd(), "public", svgPath);
    expect(fs.existsSync(file)).toBe(true);
    const markup = fs.readFileSync(file, "utf8");
    expect(markup).toContain("<svg");
    expect(markup).toContain("data-color-slot");
  });
});
