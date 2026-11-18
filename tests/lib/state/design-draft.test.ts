import { describe, it, expect, beforeEach, vi } from "vitest";
import { DRAFT_KEY, clearDraft, loadDraft, saveDraft, type Draft } from "@/lib/builder/state/design-draft";
import { initialDesignState } from "@/lib/builder/state/design-state";

const design = {
  ...initialDesignState,
  playerName: "PEREZ",
  logoDataUrl: "data:image/png;base64,LOGO",
  sponsors: { abdomen: { dataUrl: "data:image/png;base64,SP", scale: 1 } },
};
const draft: Draft = { design, step: "keeper", visited: ["player", "shorts"] };

describe("the design draft (autosave)", () => {
  beforeEach(() => localStorage.clear());

  it("saves the design, the step and the steps done in localStorage, and loads them back", () => {
    expect(saveDraft(draft)).toBe("saved");
    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();
    expect(loadDraft()).toEqual(draft);
  });

  it("has nothing to load when nothing was saved, or what was saved is not a draft", () => {
    expect(loadDraft()).toBeNull();
    localStorage.setItem(DRAFT_KEY, "{not json");
    expect(loadDraft()).toBeNull();
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ design: "nope" }));
    expect(loadDraft()).toBeNull();
  });

  it("fills in what a draft saved by an older version lacks, and drops a step that no longer exists", () => {
    const { nameNumberStyle, ...old } = design;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ design: { ...old, bodyPatternId: "gone", nameNumberStyle: { presetId: nameNumberStyle.presetId } }, step: "prendas", visited: ["player", "x"] })
    );
    const loaded = loadDraft()!;
    expect(loaded.design.bodyPatternId).toBe(initialDesignState.bodyPatternId);
    expect(loaded.design.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, presetId: nameNumberStyle.presetId });
    expect(loaded.design.playerName).toBe("PEREZ");
    expect(loaded.step).toBe("player");
    expect(loaded.visited).toEqual(["player"]);
  });

  it("when the images do not fit, saves the rest without them and says so", () => {
    const real = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key: string, value: string) {
      if (value.includes("data:image")) throw new DOMException("full", "QuotaExceededError");
      return real.call(this, key, value);
    });
    expect(saveDraft(draft)).toBe("saved-without-images");
    const loaded = loadDraft()!;
    expect(loaded.design.playerName).toBe("PEREZ");
    expect(loaded.design.logoDataUrl).toBeNull();
    expect(loaded.design.crestConfig).toBeNull();
    expect(loaded.design.sponsors).toEqual({});
    spy.mockRestore();
  });

  it("says it could not save when the storage is not there at all, and clears the old draft", () => {
    saveDraft(draft);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(saveDraft(draft)).toBe("failed");
    spy.mockRestore();
    expect(loadDraft()).toBeNull();
  });

  it("forgets the draft", () => {
    saveDraft(draft);
    clearDraft();
    expect(loadDraft()).toBeNull();
  });
});
