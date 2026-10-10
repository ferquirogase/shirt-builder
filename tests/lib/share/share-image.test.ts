import { describe, it, expect, vi } from "vitest";
import { shareImage, shareText, storyFileName } from "@/lib/share/share-image";

const blob = new Blob(["png"], { type: "image/png" });
const options = { name: "mi-diseno-historia.png", text: "Mirá mi camiseta" };

describe("storyFileName", () => {
  it("turns the project name into a safe file name", () => {
    expect(storyFileName("Los del Viernes")).toBe("los-del-viernes-historia.png");
    expect(storyFileName("  Camiseta Ñandú Él!  ")).toBe("camiseta-nandu-el-historia.png");
  });

  it("falls back to a generic name when nothing usable is left", () => {
    expect(storyFileName("!!!")).toBe("mi-camiseta-historia.png");
    expect(storyFileName("")).toBe("mi-camiseta-historia.png");
  });
});

describe("shareText", () => {
  it("invites to design theirs, with the address", () => {
    expect(shareText("gepe.com")).toBe("Mirá mi camiseta. Diseñá la tuya en gepe.com");
  });
});

describe("shareImage", () => {
  it("shares the file with the native menu when the browser can share files", async () => {
    const nav = {
      canShare: vi.fn<(data: ShareData) => boolean>(() => true),
      share: vi.fn<(data: ShareData) => Promise<void>>(async () => {}),
    };
    const download = vi.fn();

    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("shared");

    const data = nav.share.mock.calls[0][0] as ShareData;
    expect(data.text).toBe(options.text);
    expect(data.files).toHaveLength(1);
    expect(data.files![0].name).toBe(options.name);
    expect(data.files![0].type).toBe("image/png");
    expect(nav.canShare).toHaveBeenCalledWith({ files: data.files });
    expect(download).not.toHaveBeenCalled();
  });

  it("treats cancelling the menu as a result, not an error, and does not download", async () => {
    const nav = {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    };
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads the file when sharing fails for any other reason", async () => {
    const nav = {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledWith(blob, options.name);
  });

  it("downloads the file when the browser cannot share files", async () => {
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav: { canShare: () => false, share: vi.fn() }, download })).resolves.toBe(
      "downloaded"
    );
    await expect(shareImage(blob, options, { nav: { share: vi.fn() }, download })).resolves.toBe("downloaded");
    await expect(shareImage(blob, options, { nav: {}, download })).resolves.toBe("downloaded");
    await expect(shareImage(blob, options, { nav: undefined, download })).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledTimes(4);
  });
});
