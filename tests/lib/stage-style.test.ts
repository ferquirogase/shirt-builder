import { describe, it, expect } from "vitest";
import { STAGE_STOPS, stageBackgroundCss } from "@/lib/builder/stage-style";

describe("stageBackgroundCss", () => {
  it("includes every gradient stop color and a glow", () => {
    const css = stageBackgroundCss();
    for (const [, color] of STAGE_STOPS) expect(css).toContain(color);
    expect(css).toContain("radial-gradient");
    expect(css).toContain("linear-gradient");
  });

  it("has stops ordered from 0 to 1", () => {
    const offsets = STAGE_STOPS.map(([o]) => o);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets[0]).toBe(0);
    expect(offsets[offsets.length - 1]).toBe(1);
  });
});
