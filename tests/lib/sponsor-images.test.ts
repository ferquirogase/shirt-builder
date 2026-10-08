import { describe, it, expect, vi } from "vitest";
import { loadSponsorImages, type SponsorImageCache } from "@/lib/builder/sponsor-images";

const img = (id: string) => ({ id }) as unknown as HTMLImageElement;

describe("loadSponsorImages", () => {
  it("returns an image per placement that has an entry, and nothing for the empty ones", async () => {
    const load = vi.fn(async (src: string) => img(src));
    const result = await loadSponsorImages(
      { abdomen: { dataUrl: "A", scale: 1 }, nape: { dataUrl: "B", scale: 1.2 } },
      new Map(),
      load
    );
    expect(Object.keys(result).sort()).toEqual(["abdomen", "nape"]);
    expect(result.abdomen).toEqual(img("A"));
    expect(result.nape).toEqual(img("B"));
  });

  it("decodes the same image once when two placements share it (Review Focus 2)", async () => {
    const load = vi.fn(async (src: string) => img(src));
    const result = await loadSponsorImages(
      { abdomen: { dataUrl: "SAME", scale: 1 }, "lower-back": { dataUrl: "SAME", scale: 1 } },
      new Map(),
      load
    );
    expect(load).toHaveBeenCalledTimes(1);
    expect(result.abdomen).toBe(result["lower-back"]);
  });

  it("reuses the cache across calls, so changing only a scale decodes nothing", async () => {
    const load = vi.fn(async (src: string) => img(src));
    const cache: SponsorImageCache = new Map();
    await loadSponsorImages({ abdomen: { dataUrl: "A", scale: 1 } }, cache, load);
    await loadSponsorImages({ abdomen: { dataUrl: "A", scale: 1.4 } }, cache, load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("skips an image that fails to decode and still returns the others (Review Focus 3)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn(async (src: string) => {
      if (src === "BAD") throw new Error("decode failed");
      return img(src);
    });
    const result = await loadSponsorImages(
      { abdomen: { dataUrl: "BAD", scale: 1 }, nape: { dataUrl: "OK", scale: 1 } },
      new Map(),
      load
    );
    expect(Object.keys(result)).toEqual(["nape"]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("retries an image that failed before instead of caching the failure", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const cache: SponsorImageCache = new Map();
    let fail = true;
    const load = vi.fn(async (src: string) => {
      if (fail) throw new Error("decode failed");
      return img(src);
    });
    await loadSponsorImages({ abdomen: { dataUrl: "X", scale: 1 } }, cache, load);
    fail = false;
    const second = await loadSponsorImages({ abdomen: { dataUrl: "X", scale: 1 } }, cache, load);
    expect(second.abdomen).toEqual(img("X"));
    error.mockRestore();
  });

  it("returns an empty result for no sponsors", async () => {
    expect(await loadSponsorImages({}, new Map(), vi.fn())).toEqual({});
  });
});
