import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearPatternMarkupCache,
  patternThumbnailUrl,
  svgToDataUrl,
} from "@/lib/builder/texture/pattern-thumbnail";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000000"/></svg>`;

describe("pattern thumbnails", () => {
  beforeEach(() => clearPatternMarkupCache());
  afterEach(() => vi.unstubAllGlobals());

  it("recolors the SVG and returns a data URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
    const url = await patternThumbnailUrl("/patterns/a.svg", { primary: "#ff0000" });
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain('fill="#ff0000"');
  });

  it("fetches each SVG only once", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => SVG }));
    vi.stubGlobal("fetch", fetchMock);
    await patternThumbnailUrl("/patterns/a.svg", { primary: "#111111" });
    await patternThumbnailUrl("/patterns/a.svg", { primary: "#222222" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" })
      .mockResolvedValueOnce({ ok: true, text: async () => SVG });
    vi.stubGlobal("fetch", fetchMock);
    await expect(patternThumbnailUrl("/patterns/b.svg", {})).rejects.toThrow(/404/);
    await expect(patternThumbnailUrl("/patterns/b.svg", {})).resolves.toContain("data:image/svg+xml");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("encodes markup safely into a data URL", () => {
    expect(svgToDataUrl("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
});
