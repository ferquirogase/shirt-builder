import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as THREE from "three";
import type { ReactNode } from "react";

// jsdom has no 2D canvas and the loaders would hit the network: the compositor and
// the image loaders are replaced so the hook's own orchestration can be observed.
vi.mock("@/lib/builder/texture/texture-compositor", () => ({ drawDesignToCanvas: vi.fn() }));
vi.mock("@/lib/builder/texture/image-loader", () => ({
  loadImage: vi.fn(),
  loadPatternImage: vi.fn(),
  loadTintedMask: vi.fn(),
}));

import { useJerseyTexture } from "@/components/builder/viewer/use-jersey-texture";
import { DesignProvider, useDesign } from "@/lib/builder/state/design-context";
import { drawDesignToCanvas } from "@/lib/builder/texture/texture-compositor";
import { loadImage, loadPatternImage, loadTintedMask } from "@/lib/builder/texture/image-loader";
import { BRAND_LOGO_URLS } from "@/lib/builder/catalog/brand-logo";
import { BODY_PATTERNS } from "@/lib/builder/catalog/patterns";
import { JERSEY_MODEL } from "@/lib/builder/geometry/jersey-model";
import { UV_FLIP_Y } from "@/lib/builder/geometry/uv-regions";

const draw = vi.mocked(drawDesignToCanvas);
const fakeCtx = {} as CanvasRenderingContext2D;
const wrapper = ({ children }: { children: ReactNode }) => <DesignProvider>{children}</DesignProvider>;
const mount = () => renderHook(() => ({ texture: useJerseyTexture(), design: useDesign() }), { wrapper });

const lastCall = () => draw.mock.calls.at(-1)!;
const lastImages = () => lastCall()[3];
const lastDesign = () => lastCall()[2];
const loadedWith = (src: string) => vi.mocked(loadImage).mock.calls.filter(([s]) => s === src).length;

let fontsLoad: ReturnType<typeof vi.fn>;

beforeEach(() => {
  draw.mockClear();
  vi.mocked(loadImage)
    .mockReset()
    .mockImplementation(async (src: string) => ({ src }) as unknown as HTMLImageElement);
  vi.mocked(loadPatternImage)
    .mockReset()
    .mockImplementation(async (path: string) => ({ pattern: path }) as unknown as HTMLImageElement);
  vi.mocked(loadTintedMask)
    .mockReset()
    .mockImplementation(async (url: string, color: string) => ({ mask: url, color }) as unknown as HTMLCanvasElement);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as never);
  fontsLoad = vi.fn().mockResolvedValue([]);
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: fontsLoad } });
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
});

describe("useJerseyTexture", () => {
  it("returns a 2048px canvas texture that is flipped like the UVs and read as sRGB", () => {
    const { result } = mount();
    const texture = result.current.texture;
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    const canvas = texture.image as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([2048, 2048]);
    expect(texture.flipY).toBe(UV_FLIP_Y);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("paints the current design with the model's UV regions", async () => {
    const { result } = mount();
    await waitFor(() => expect(draw).toHaveBeenCalled());
    const [ctx, size, design, , regions, family] = lastCall();
    expect(ctx).toBe(fakeCtx);
    expect(size).toBe(2048);
    expect(design).toEqual(result.current.design.state);
    expect(regions).toBe(JERSEY_MODEL.uvRegions);
    expect(family).toBe("sans-serif"); // no font variable on <html> under jsdom
  });

  it("flags the texture for upload after every repaint, or the GPU keeps showing the old one", async () => {
    const { result } = mount();
    await waitFor(() => expect(lastImages().brandLogoForDark).not.toBeNull());
    await waitFor(() => expect(lastImages().bodyPatternImage).not.toBeNull());
    // A CanvasTexture starts at version 1 on its own; only a repaint raises it further.
    const before = result.current.texture.version;
    const paintsBefore = draw.mock.calls.length;

    act(() => result.current.design.dispatch({ type: "SET_PLAYER_NAME", value: "LEO" }));
    await waitFor(() => expect(draw.mock.calls.length).toBeGreaterThan(paintsBefore));
    expect(lastDesign().playerName).toBe("LEO");
    expect(result.current.texture.version).toBeGreaterThan(before);
  });

  it("loads the body, sleeve and collar-mask images for the chosen design and colors", async () => {
    const { result } = mount();
    const state = result.current.design.state;
    const bodySvg = BODY_PATTERNS.find((p) => p.id === state.bodyPatternId)!.svgPath;
    await waitFor(() => expect(lastImages().bodyPatternImage).toEqual({ pattern: bodySvg }));
    expect(vi.mocked(loadPatternImage)).toHaveBeenCalledWith(bodySvg, state.colors);
    expect(vi.mocked(loadTintedMask)).toHaveBeenCalledWith(JERSEY_MODEL.collarMaskUrl, state.colors.collar);
    expect(lastImages().sleevePatternImage).not.toBeNull();
    expect(lastImages().collarMaskImage).toEqual({ mask: JERSEY_MODEL.collarMaskUrl, color: state.colors.collar });
  });

  it("reloads the patterns when a color changes, but not when only the name is typed", async () => {
    const { result } = mount();
    await waitFor(() => expect(lastImages().bodyPatternImage).not.toBeNull());
    const afterFirstLoad = vi.mocked(loadPatternImage).mock.calls.length;

    act(() => result.current.design.dispatch({ type: "SET_PLAYER_NAME", value: "LEO" }));
    await waitFor(() => expect(lastDesign().playerName).toBe("LEO"));
    await new Promise((r) => setTimeout(r, 150)); // longer than the pattern debounce
    expect(vi.mocked(loadPatternImage).mock.calls.length).toBe(afterFirstLoad);

    act(() => result.current.design.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));
    await waitFor(() =>
      expect(vi.mocked(loadPatternImage).mock.calls.some(([, colors]) => colors.primary === "#123456")).toBe(true)
    );
  });

  it("loads both versions of the brand logo once", async () => {
    mount();
    await waitFor(() => expect(lastImages().brandLogoForLight).toEqual({ src: BRAND_LOGO_URLS.forLight }));
    expect(lastImages().brandLogoForDark).toEqual({ src: BRAND_LOGO_URLS.forDark });
    expect(loadedWith(BRAND_LOGO_URLS.forLight)).toBe(1);
    expect(loadedWith(BRAND_LOGO_URLS.forDark)).toBe(1);
  });

  it("keeps painting when one brand logo fails to load, leaving that version out", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadImage).mockImplementation(async (src: string) => {
      if (src === BRAND_LOGO_URLS.forLight) throw new Error("404");
      return { src } as unknown as HTMLImageElement;
    });
    mount();
    await waitFor(() => expect(lastImages().brandLogoForDark).toEqual({ src: BRAND_LOGO_URLS.forDark }));
    expect(lastImages().brandLogoForLight).toBeNull();
    expect(error).toHaveBeenCalled();
  });

  it("decodes the crest when it is uploaded and drops it when it is removed", async () => {
    const { result } = mount();
    await waitFor(() => expect(draw).toHaveBeenCalled());
    expect(lastImages().logoImage).toBeNull();

    act(() => result.current.design.dispatch({ type: "SET_LOGO", dataUrl: "data:crest" }));
    await waitFor(() => expect(lastImages().logoImage).toEqual({ src: "data:crest" }));

    // Typing elsewhere must not decode the crest again.
    act(() => result.current.design.dispatch({ type: "SET_PLAYER_NAME", value: "LEO" }));
    await waitFor(() => expect(lastDesign().playerName).toBe("LEO"));
    expect(loadedWith("data:crest")).toBe(1);

    act(() => result.current.design.dispatch({ type: "SET_LOGO", dataUrl: null }));
    await waitFor(() => expect(lastImages().logoImage).toBeNull());
  });

  it("decodes each sponsor once, even when only its scale changes", async () => {
    const { result } = mount();
    act(() => result.current.design.dispatch({ type: "SET_SPONSOR", slot: "nape", dataUrl: "data:sponsor" }));
    await waitFor(() => expect(lastImages().sponsorImages?.nape).toEqual({ src: "data:sponsor" }));

    act(() => result.current.design.dispatch({ type: "SET_SPONSOR_SCALE", slot: "nape", value: 1.3 }));
    await waitFor(() => expect(lastDesign().sponsors.nape?.scale).toBe(1.3));
    await waitFor(() => expect(lastImages().sponsorImages?.nape).toEqual({ src: "data:sponsor" }));
    expect(loadedWith("data:sponsor")).toBe(1);
  });

  it("asks for the chosen name/number font and repaints once it has loaded", async () => {
    let release: (value: unknown) => void = () => {};
    fontsLoad.mockReturnValue(new Promise((resolve) => (release = resolve)));
    mount();
    await waitFor(() => expect(lastImages().bodyPatternImage).not.toBeNull());
    await waitFor(() => expect(lastImages().brandLogoForDark).not.toBeNull());
    expect(fontsLoad).toHaveBeenCalledWith(expect.stringMatching(/^700 48px /), expect.any(String));

    const paintsBefore = draw.mock.calls.length;
    await act(async () => release([]));
    await waitFor(() => expect(draw.mock.calls.length).toBeGreaterThan(paintsBefore));
  });

  it("loads the other font when the typeface changes", async () => {
    const { result } = mount();
    await waitFor(() => expect(fontsLoad).toHaveBeenCalled());
    act(() => result.current.design.dispatch({ type: "SET_NN_PRESET", id: "modern" }));
    await waitFor(() => expect(fontsLoad).toHaveBeenCalledWith(expect.stringMatching(/^800 48px /), expect.any(String)));
  });

  it("keeps painting when the font cannot be loaded", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    fontsLoad.mockRejectedValue(new Error("no font"));
    mount();
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(draw).toHaveBeenCalled();
  });
});
