import { describe, it, expect } from "vitest";
import { STAGE_COLOR, STAGE_GLOW, stageBaseCss, stageGlowCss } from "@/lib/builder/stage-style";

describe("stage styles", () => {
  it("the base is one flat color: no gradient, and no yellow", () => {
    const css = stageBaseCss();
    expect(css).toBe(STAGE_COLOR);
    expect(css).not.toContain("gradient");
    // A light neutral grey: the channels are almost equal, so nothing leans yellow.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(STAGE_COLOR.slice(i, i + 2), 16));
    expect(Math.abs(r - g)).toBeLessThanOrEqual(2);
    expect(r - b).toBeLessThanOrEqual(4);
  });

  it("glow is a separate radial gradient so it can sit behind the jersey only", () => {
    const css = stageGlowCss();
    expect(css).toContain("radial-gradient");
    expect(css).toContain(STAGE_GLOW);
    expect(css).not.toContain("linear-gradient");
  });
});
