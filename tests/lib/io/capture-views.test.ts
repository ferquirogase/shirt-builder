import { describe, it, expect } from "vitest";
import { VIEW_SETTLE_MS, captureViews } from "@/lib/builder/io/capture-views";

const canvas = { width: 10, height: 10 } as HTMLCanvasElement;

describe("captureViews", () => {
  it("shows the front, waits, grabs, then the back, waits, grabs", async () => {
    const log: string[] = [];
    let grabs = 0;
    const result = await captureViews(
      {
        canvas,
        showView: (side) => log.push(`show-${side}`),
        wait: async (ms) => {
          log.push(`wait-${ms}`);
        },
      },
      () => {
        grabs += 1;
        log.push(`grab-${grabs}`);
        return `view-${grabs}`;
      }
    );

    expect(result).toEqual({ front: "view-1", back: "view-2" });
    expect(log).toEqual([
      "show-front",
      `wait-${VIEW_SETTLE_MS}`,
      "grab-1",
      "show-back",
      `wait-${VIEW_SETTLE_MS}`,
      "grab-2",
    ]);
  });

  it("returns null when either grab fails", async () => {
    const options = { canvas, showView: () => {}, wait: async () => {} };
    expect(await captureViews(options, () => null)).toBeNull();

    let calls = 0;
    expect(await captureViews(options, () => (++calls === 2 ? null : "ok"))).toBeNull();
  });

  it("keeps a falsy but valid grab result", async () => {
    const options = { canvas, showView: () => {}, wait: async () => {} };
    expect(await captureViews(options, () => "")).toEqual({ front: "", back: "" });
  });
});
