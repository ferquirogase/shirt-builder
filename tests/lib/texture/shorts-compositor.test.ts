import { describe, it, expect, vi } from "vitest";
import { drawShortsToCanvas } from "@/lib/builder/texture/shorts-compositor";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { SHORTS_UV_STRETCH } from "@/lib/builder/geometry/shorts-uv-regions";

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: "",
  } as unknown as CanvasRenderingContext2D;
}

const square = (id: string) => ({ id, naturalWidth: 100, naturalHeight: 100 }) as unknown as HTMLImageElement;
const entry = (scale = 1) => ({ dataUrl: "data:image/png;base64,AAAA", scale });
const kit = (sponsors: typeof initialDesignState.sponsors, playerName = "") => ({
  ...initialDesignState,
  playerName,
  shorts: { ...initialDesignState.shorts, included: true },
  sponsors,
});
const calls = (fn: unknown) => (fn as ReturnType<typeof vi.fn>).mock.calls;

describe("drawShortsToCanvas", () => {
  it("fills the whole canvas with the color of the shorts", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#123456", {});
    expect(calls(ctx.fillRect)[0]).toEqual([0, 0, 1000, 1000]);
    // The fill color was set before the rect was drawn (the mock keeps the last one).
    expect(ctx.fillStyle).toBe("#123456");
  });

  it("draws nothing else when there are no sponsors", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({}), "#123456", {});
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("draws the front sponsor on the player's right leg, upright, on the thigh", () => {
    const ctx = createMockCtx();
    const img = square("front");
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", { sponsorImages: { "shorts-front-right": img } });
    expect(ctx.rotate).not.toHaveBeenCalled();
    // shortsFrontRight u .35..0.5, uFrac .4 -> u .41 -> x 410; v .035..0.592, vFrac .4 -> v .2578 -> y 742.
    const [tx, ty] = calls(ctx.translate)[0];
    expect(tx).toBeCloseTo(410, 5);
    expect(ty).toBeCloseTo(742.2, 1);
    const [, x, y, w, h] = calls(ctx.drawImage)[0];
    expect(w).toBeCloseTo(60, 5); // baseBox 0.06 of 1000, before the squeeze
    expect(h).toBeCloseTo(60, 5);
    expect(x).toBeCloseTo(-30, 5);
    expect(y).toBeCloseTo(-30, 5);
  });

  it("squeezes what it draws sideways, so it is not stretched on the shorts", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": square("front") },
    });
    expect(calls(ctx.scale)).toEqual([[SHORTS_UV_STRETCH, 1]]);
  });

  it("draws the back sponsors as they are, neither turned nor mirrored: the shorts' back reads upright from behind", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-back-left": entry(), "shorts-back-right": entry() }), "#000", {
      sponsorImages: { "shorts-back-left": square("bl"), "shorts-back-right": square("br") },
    });
    expect(ctx.rotate).not.toHaveBeenCalled();
    expect(calls(ctx.scale)).toEqual([
      [SHORTS_UV_STRETCH, 1],
      [SHORTS_UV_STRETCH, 1],
    ]);
    // shortsBackLeft u .72..0.88 -> x 800; shortsBackRight u .13..0.28 -> x 205 (both at the middle of the panel).
    const xs = calls(ctx.translate).map(([x]) => Math.round(x));
    expect(xs).toEqual([800, 205]);
    // Both a good way down the leg, below the front one (y 742): vFrac .27 -> v .1854 -> y 815.
    const ys = calls(ctx.translate).map(([, y]) => Math.round(y));
    expect(ys).toEqual([815, 815]);
  });

  it("scales a sponsor with its scale, up to one and a half times", () => {
    const widthAt = (scale: number) => {
      const ctx = createMockCtx();
      drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry(scale) }), "#000", {
        sponsorImages: { "shorts-front-right": square("front") },
      });
      return calls(ctx.drawImage)[0][3];
    };
    expect(widthAt(1.5)).toBeCloseTo(90, 5);
    expect(widthAt(40)).toBeCloseTo(90, 5);
    expect(widthAt(0.5)).toBeCloseTo(30, 5);
  });

  it("does not draw a sponsor whose image has not loaded, or that has no entry", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": null, "shorts-back-left": square("orphan") },
    });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("leaves the canvas state as it found it after each sponsor", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ "shorts-front-right": entry(), "shorts-back-left": entry() }), "#000", {
      sponsorImages: { "shorts-front-right": square("f"), "shorts-back-left": square("b") },
    });
    expect(calls(ctx.save).length).toBe(calls(ctx.restore).length);
    expect(calls(ctx.save).length).toBe(2);
  });

  it("does not draw the shirt's sponsors", () => {
    const ctx = createMockCtx();
    drawShortsToCanvas(ctx, 1000, kit({ abdomen: entry() }), "#000", { sponsorImages: { abdomen: square("shirt") } });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });

  it("does not draw a sponsor when the kit has no shorts", () => {
    const ctx = createMockCtx();
    const design = { ...kit({ "shorts-front-right": entry() }), shorts: { ...initialDesignState.shorts, included: false } };
    drawShortsToCanvas(ctx, 1000, design, "#000", { sponsorImages: { "shorts-front-right": square("f") } });
    expect(ctx.drawImage).not.toHaveBeenCalled();
  });
});
