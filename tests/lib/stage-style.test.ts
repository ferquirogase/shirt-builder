import { describe, it, expect } from "vitest";
import { STAGE_GLOW, STAGE_STOPS, stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";

describe("stage styles", () => {
  it("base gradient includes every stop color and nothing radial", () => {
    const css = stageBaseCss();
    for (const [, color] of STAGE_STOPS) expect(css).toContain(color);
    expect(css).toContain("linear-gradient");
    expect(css).not.toContain("radial-gradient");
  });

  it("glow is a separate radial gradient so it can sit behind the jersey only", () => {
    const css = stageGlowCss();
    expect(css).toContain("radial-gradient");
    expect(css).toContain(STAGE_GLOW);
    expect(css).not.toContain("linear-gradient");
  });

  it("has stops ordered from 0 to 1", () => {
    const offsets = STAGE_STOPS.map(([o]) => o);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets[0]).toBe(0);
    expect(offsets[offsets.length - 1]).toBe(1);
  });
});
