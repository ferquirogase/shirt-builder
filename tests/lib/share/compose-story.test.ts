import { describe, it, expect, vi } from "vitest";
import {
  drawStory,
  layoutPhrase,
  renderStory,
  type RenderDeps,
  type ShirtViews,
  type StoryAssets,
  type StoryFonts,
} from "@/lib/share/compose-story";
import { BACK_RECT, CTA, FRONT_RECT, LOGO, PHRASE, SHARE_URL, STORY_HEIGHT, STORY_WIDTH } from "@/lib/share/story-layout";

// A fake 2d context that records what is drawn. Text is as wide as a real font
// would be, roughly: 0.6 px per character per px of font size.
function createCtx() {
  const calls: string[] = [];
  const fontsAtText: string[] = [];
  const ctx = {
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn((image: { id: string }) => {
      calls.push(`image:${image.id}`);
    }),
    fillText: vi.fn((text: string) => {
      calls.push(`text:${text}`);
      fontsAtText.push(ctx.font);
    }),
    measureText: vi.fn((text: string) => {
      const px = parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? "10");
      return { width: text.length * px * 0.6 };
    }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, mock: ctx, calls, fontsAtText };
}

const assets = {
  background: { id: "background", naturalWidth: 941, naturalHeight: 1672 },
  logo: { id: "logo", naturalWidth: 512, naturalHeight: 381 },
} as unknown as StoryAssets;
const views = {
  front: { id: "front", width: 300, height: 600 },
  back: { id: "back", width: 600, height: 300 },
} as unknown as ShirtViews;
const fonts: StoryFonts = { display: "Oswald, sans-serif", body: "Montserrat, sans-serif" };

describe("layoutPhrase", () => {
  it("keeps a short phrase on one line at the biggest size, in capitals", () => {
    const { ctx } = createCtx();
    expect(layoutPhrase(ctx, "Se viene el campeón", fonts.display)).toEqual({
      size: PHRASE.maxSize,
      lines: ["SE VIENE EL CAMPEÓN"],
    });
  });

  it("wraps a longer phrase onto two lines before shrinking it", () => {
    const { ctx } = createCtx();
    expect(layoutPhrase(ctx, "Presentando a los nuevos campeones", fonts.display)).toEqual({
      size: PHRASE.maxSize,
      lines: ["PRESENTANDO A LOS", "NUEVOS CAMPEONES"],
    });
  });

  it("shrinks a long phrase until it fits in two lines", () => {
    const { ctx } = createCtx();
    const { size, lines } = layoutPhrase(ctx, "Una frase un poco mas larga que las que usamos hoy", fonts.display);
    expect(size).toBeLessThan(PHRASE.maxSize);
    expect(size).toBeGreaterThanOrEqual(PHRASE.minSize);
    expect(lines.length).toBeLessThanOrEqual(PHRASE.maxLines);
  });

  it("does not break on an absurdly long phrase: it stops at the smallest size", () => {
    const { ctx } = createCtx();
    const { size, lines } = layoutPhrase(ctx, "palabra ".repeat(40).trim(), fonts.display);
    expect(size).toBe(PHRASE.minSize);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe("drawStory", () => {
  it("draws background, logo, phrase, shirts and the call to action, in that order", () => {
    const { ctx, calls } = createCtx();
    drawStory(ctx, assets, views, "Se viene el campeón", fonts);
    expect(calls).toEqual([
      "image:background",
      "image:logo",
      "text:SE VIENE EL CAMPEÓN",
      "image:front",
      "image:back",
      `text:${CTA.label}`,
      `text:${SHARE_URL}`,
    ]);
  });

  it("fills the whole story with the background, cropping only the overflow", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const args = mock.drawImage.mock.calls[0] as unknown as number[];
    expect(args.slice(5)).toEqual([0, 0, STORY_WIDTH, STORY_HEIGHT]);
    expect(args[4]).toBeCloseTo(1672, 3); // source height used: all of it
    expect(args[3]).toBeLessThanOrEqual(941);
  });

  it("centers the logo at its width, keeping its proportions", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const call = mock.drawImage.mock.calls.find((c) => (c[0] as unknown as { id: string }).id === "logo")!;
    const [, x, y, w, h] = call as unknown as number[];
    expect(x).toBeCloseTo((STORY_WIDTH - LOGO.width) / 2, 5);
    expect(y).toBe(LOGO.y);
    expect(w).toBe(LOGO.width);
    expect(h).toBeCloseTo((LOGO.width * 381) / 512, 5);
  });

  it("fits each shirt inside its box, centered", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const find = (id: string) =>
      mock.drawImage.mock.calls.find((c) => (c[0] as unknown as { id: string }).id === id)! as unknown as number[];

    // front is 300x600 in a 560x520 box: limited by height, so 260x520.
    const front = find("front");
    expect(front[1]).toBeCloseTo(FRONT_RECT.x + (FRONT_RECT.w - 260) / 2, 3);
    expect(front[2]).toBeCloseTo(FRONT_RECT.y, 3);
    expect(front[3]).toBeCloseTo(260, 3);
    expect(front[4]).toBeCloseTo(520, 3);

    // back is 600x300 in a 560x520 box: limited by width, so 560x280.
    const back = find("back");
    expect(back[1]).toBeCloseTo(BACK_RECT.x, 3);
    expect(back[2]).toBeCloseTo(BACK_RECT.y + (BACK_RECT.h - 280) / 2, 3);
    expect(back[3]).toBeCloseTo(560, 3);
    expect(back[4]).toBeCloseTo(280, 3);
  });

  it("paints both halos before the first shirt so they never tint a shirt", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    expect(mock.createRadialGradient).toHaveBeenCalledTimes(2);
    const lastHalo = Math.max(...mock.createRadialGradient.mock.invocationCallOrder);
    const frontCall = mock.drawImage.mock.calls.findIndex((c) => (c[0] as unknown as { id: string }).id === "front");
    expect(lastHalo).toBeLessThan(mock.drawImage.mock.invocationCallOrder[frontCall]);
  });

  it("uses the display font for the phrase and the body font for the call to action", () => {
    const { ctx, fontsAtText } = createCtx();
    drawStory(ctx, assets, views, "Se viene el campeón", fonts);
    expect(fontsAtText[0]).toContain("Oswald");
    expect(fontsAtText[1]).toContain("Montserrat");
    expect(fontsAtText[2]).toContain("Montserrat");
  });
});

describe("renderStory", () => {
  function setup(overrides: Partial<RenderDeps> = {}) {
    const { ctx, calls } = createCtx();
    const blob = new Blob(["png"], { type: "image/png" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
    } as unknown as HTMLCanvasElement;
    const deps: RenderDeps = {
      loadAssets: vi.fn(async () => assets),
      loadFonts: vi.fn(async () => fonts),
      createCanvas: () => canvas,
      ...overrides,
    };
    return { calls, blob, canvas, deps };
  }

  it("draws on a 1080x1920 canvas and resolves with the PNG", async () => {
    const { calls, blob, canvas, deps } = setup();
    await expect(renderStory(views, "Se viene el campeón", deps)).resolves.toBe(blob);
    expect(canvas.width).toBe(STORY_WIDTH);
    expect(canvas.height).toBe(STORY_HEIGHT);
    expect(calls[0]).toBe("image:background");
    expect((canvas.toBlob as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe("image/png");
  });

  it("rejects when the PNG cannot be produced", async () => {
    const { canvas, deps } = setup();
    (canvas.toBlob as ReturnType<typeof vi.fn>).mockImplementation((callback: BlobCallback) => callback(null));
    await expect(renderStory(views, "Así se ve ganar", deps)).rejects.toThrow();
  });

  it("rejects when the background cannot be loaded, without drawing anything", async () => {
    const { calls, deps } = setup({ loadAssets: vi.fn(async () => Promise.reject(new Error("404"))) });
    await expect(renderStory(views, "Así se ve ganar", deps)).rejects.toThrow("404");
    expect(calls).toEqual([]);
  });

  it("rejects without a 2d context", async () => {
    const { canvas, deps } = setup();
    (canvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(renderStory(views, "Así se ve ganar", deps)).rejects.toThrow();
  });
});
