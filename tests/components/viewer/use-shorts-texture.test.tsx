import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import * as THREE from "three";
import type { ReactNode } from "react";

// jsdom has no 2D canvas and the image loader would hit the network: both are replaced so the
// hook's own orchestration can be observed.
vi.mock("@/lib/builder/texture/shorts-compositor", () => ({ drawShortsToCanvas: vi.fn() }));
vi.mock("@/lib/builder/texture/image-loader", () => ({ loadImage: vi.fn() }));

import { useShortsTexture } from "@/components/builder/viewer/use-shorts-texture";
import { DesignProvider, useDesign } from "@/lib/builder/state/design-context";
import { drawShortsToCanvas } from "@/lib/builder/texture/shorts-compositor";
import { loadImage } from "@/lib/builder/texture/image-loader";
import { shortsColor } from "@/lib/builder/state/design-state";
import { BRAND_LOGO_URLS } from "@/lib/builder/catalog/brand-logo";
import { UV_FLIP_Y } from "@/lib/builder/geometry/uv-regions";

const draw = vi.mocked(drawShortsToCanvas);
const fakeCtx = {} as CanvasRenderingContext2D;
const wrapper = ({ children }: { children: ReactNode }) => <DesignProvider>{children}</DesignProvider>;
const mount = () => renderHook(() => ({ texture: useShortsTexture(), design: useDesign() }), { wrapper });

const lastCall = () => draw.mock.calls.at(-1)!;
const lastDesign = () => lastCall()[2];
const lastColor = () => lastCall()[3];
const lastImages = () => lastCall()[4];
const lastFamily = () => lastCall()[5];
const IMG = "data:image/png;base64,AAAA";

let fontsLoad: ReturnType<typeof vi.fn>;

beforeEach(() => {
  draw.mockClear();
  fontsLoad = vi.fn().mockResolvedValue([]);
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: fontsLoad } });
  vi.mocked(loadImage)
    .mockReset()
    .mockImplementation(async (src: string) => ({ src }) as unknown as HTMLImageElement);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx as never);
});

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "fonts");
});

describe("useShortsTexture", () => {
  it("returns a 2048px canvas texture that is flipped like the UVs and read as sRGB", () => {
    const { result } = mount();
    const texture = result.current.texture;
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    const canvas = texture.image as HTMLCanvasElement;
    expect([canvas.width, canvas.height]).toEqual([2048, 2048]);
    expect(texture.flipY).toBe(UV_FLIP_Y);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it("paints the design with the color the shorts wear", async () => {
    const { result } = mount();
    await waitFor(() => expect(draw).toHaveBeenCalled());
    const [ctx, size, design, color] = lastCall();
    expect(ctx).toBe(fakeCtx);
    expect(size).toBe(2048);
    expect(design).toEqual(result.current.design.state);
    expect(color).toBe(shortsColor(result.current.design.state));
  });

  it("repaints with the other color when the shorts take the secondary one", async () => {
    const { result } = mount();
    await waitFor(() => expect(draw).toHaveBeenCalled());
    const before = lastColor();
    act(() => result.current.design.dispatch({ type: "SET_SHORTS_COLOR_SOURCE", value: "secondary" }));
    await waitFor(() => expect(lastColor()).toBe(result.current.design.state.colors.secondary));
    expect(lastColor()).not.toBe(before);
  });

  it("flags the texture for upload after every repaint, or the GPU keeps showing the old one", async () => {
    const { result } = mount();
    await waitFor(() => expect(draw).toHaveBeenCalled());
    const before = result.current.texture.version;
    const paintsBefore = draw.mock.calls.length;
    act(() => result.current.design.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));
    await waitFor(() => expect(draw.mock.calls.length).toBeGreaterThan(paintsBefore));
    expect(result.current.texture.version).toBeGreaterThan(before);
  });

  it("decodes a sponsor and paints it once it is ready", async () => {
    const { result } = mount();
    act(() => result.current.design.dispatch({ type: "SET_SPONSOR", slot: "shorts-front-right", dataUrl: IMG }));
    await waitFor(() => expect(lastImages().sponsorImages?.["shorts-front-right"]).toEqual({ src: IMG }));
  });

  it("decodes nothing more when only a sponsor's scale changes", async () => {
    const { result } = mount();
    act(() => result.current.design.dispatch({ type: "SET_SPONSOR", slot: "shorts-front-right", dataUrl: IMG }));
    await waitFor(() => expect(lastImages().sponsorImages?.["shorts-front-right"]).toEqual({ src: IMG }));
    const decoded = vi.mocked(loadImage).mock.calls.filter(([s]) => s === IMG).length;
    act(() => result.current.design.dispatch({ type: "SET_SPONSOR_SCALE", slot: "shorts-front-right", value: 1.3 }));
    await waitFor(() => expect(lastDesign().sponsors["shorts-front-right"]?.scale).toBe(1.3));
    expect(vi.mocked(loadImage).mock.calls.filter(([s]) => s === IMG).length).toBe(decoded);
  });

  it("loads both versions of the maker's logo, for the one under the number", async () => {
    mount();
    await waitFor(() => expect(lastImages().brandLogoForLight).toEqual({ src: BRAND_LOGO_URLS.forLight }));
    expect(lastImages().brandLogoForDark).toEqual({ src: BRAND_LOGO_URLS.forDark });
  });

  it("decodes the crest once there is one, and drops it when it is removed", async () => {
    const { result } = mount();
    expect(lastCall()).toBeDefined();
    expect(lastImages().logoImage ?? null).toBeNull();
    act(() => result.current.design.dispatch({ type: "SET_LOGO", dataUrl: IMG }));
    await waitFor(() => expect(lastImages().logoImage).toEqual({ src: IMG }));
    act(() => result.current.design.dispatch({ type: "SET_LOGO", dataUrl: null }));
    await waitFor(() => expect(lastImages().logoImage ?? null).toBeNull());
  });

  it("paints the number in the font of the chosen style, and repaints once it has loaded", async () => {
    let release: () => void = () => {};
    fontsLoad.mockReturnValue(new Promise((resolve) => (release = () => resolve([]))));
    mount();
    await waitFor(() => expect(fontsLoad).toHaveBeenCalledWith(expect.stringMatching(/^700 48px /), expect.any(String)));
    expect(lastFamily()).toBe("sans-serif");
    const paintsBefore = draw.mock.calls.length;
    await act(async () => release());
    await waitFor(() => expect(draw.mock.calls.length).toBeGreaterThan(paintsBefore));
  });

});
