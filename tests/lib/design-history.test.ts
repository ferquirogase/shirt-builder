import { describe, it, expect } from "vitest";
import { initialDesignState } from "@/lib/builder/design-state";
import {
  createHistory,
  historyReducer,
  GROUP_WINDOW_MS,
  HISTORY_LIMIT,
  type HistoryAction,
  type HistoryState,
} from "@/lib/builder/design-history";

function run(actions: HistoryAction[], from: HistoryState = createHistory()): HistoryState {
  return actions.reduce(historyReducer, from);
}

describe("historyReducer", () => {
  it("records a discrete change and can undo and redo it", () => {
    const changed = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    expect(changed.present.bodyPatternId).toBe("plain-body");
    expect(changed.past).toHaveLength(1);

    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.bodyPatternId).toBe(initialDesignState.bodyPatternId);
    expect(undone.future).toHaveLength(1);

    const redone = historyReducer(undone, { type: "REDO" });
    expect(redone.present.bodyPatternId).toBe("plain-body");
  });

  it("records a collar color change as its own undo step", () => {
    const changed = run([{ type: "SET_COLOR", slot: "collar", value: "#123456", at: 10_000 }]);
    expect(changed.present.colors.collar).toBe("#123456");
    expect(changed.past).toHaveLength(1);
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.colors.collar).toBe(initialDesignState.colors.collar);
  });

  it("ignores UNDO/REDO when there is nothing to do", () => {
    const fresh = createHistory();
    expect(historyReducer(fresh, { type: "UNDO" })).toBe(fresh);
    expect(historyReducer(fresh, { type: "REDO" })).toBe(fresh);
  });

  it("clears the redo stack when a new change is made after undo", () => {
    let s = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    s = historyReducer(s, { type: "UNDO" });
    s = historyReducer(s, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: "data:image/png;base64,AAAA", at: 10_000 });
    expect(s.future).toHaveLength(0);
  });

  it("does not record a change that leaves the design identical", () => {
    const s = run([{ type: "SET_BODY_PATTERN", id: initialDesignState.bodyPatternId }]);
    expect(s.past).toHaveLength(0);
  });

  it("groups rapid edits of the same field into a single undo step", () => {
    const s = run([
      { type: "SET_PLAYER_NAME", value: "P", at: 1000 },
      { type: "SET_PLAYER_NAME", value: "PE", at: 1100 },
      { type: "SET_PLAYER_NAME", value: "PER", at: 1200 },
    ]);
    expect(s.present.playerName).toBe("PER");
    expect(s.past).toHaveLength(1);
    const undone = historyReducer(s, { type: "UNDO" });
    expect(undone.present.playerName).toBe("");
  });

  it("starts a new step after the grouping window elapses", () => {
    const s = run([
      { type: "SET_PLAYER_NAME", value: "P", at: 1000 },
      { type: "SET_PLAYER_NAME", value: "PE", at: 1000 + GROUP_WINDOW_MS + 1 },
    ]);
    expect(s.past).toHaveLength(2);
  });

  it("does not group edits of different fields or different color slots", () => {
    const s = run([
      { type: "SET_COLOR", slot: "primary", value: "#111111", at: 1000 },
      { type: "SET_COLOR", slot: "secondary", value: "#222222", at: 1100 },
      { type: "SET_PLAYER_NUMBER", value: "1", at: 1200 },
    ]);
    expect(s.past).toHaveLength(3);
  });

  it("keeps the project name out of the history and across undo/redo", () => {
    let s = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    s = historyReducer(s, { type: "SET_PROJECT_NAME", value: "Los del viernes" });
    expect(s.past).toHaveLength(1);

    const undone = historyReducer(s, { type: "UNDO" });
    expect(undone.present.projectName).toBe("Los del viernes");
    const redone = historyReducer(undone, { type: "REDO" });
    expect(redone.present.projectName).toBe("Los del viernes");
  });

  it("caps the history length", () => {
    const actions: HistoryAction[] = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => ({
      type: "SET_BODY_PATTERN" as const,
      id: `p${i}`,
    }));
    expect(run(actions).past).toHaveLength(HISTORY_LIMIT);
  });
  it("records an accent color change as its own undo step", () => {
    const changed = run([{ type: "SET_COLOR", slot: "accent", value: "#654321", at: 10_000 }]);
    expect(changed.present.colors.accent).toBe("#654321");
    expect(changed.past).toHaveLength(1);
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.colors.accent).toBe(initialDesignState.colors.accent);
  });

  it("one undo restores the previous pattern and its colors (Review Focus 3)", async () => {
    const patterns = await import("@/lib/builder/patterns");
    patterns.BODY_PATTERNS.push({
      id: "test-accent-body",
      label: "Test accent",
      svgPath: "/patterns/plain-body.svg",
      colors: [
        { role: "primary", label: "Fondo", default: "#000001" },
        { role: "accent", label: "Detalle", default: "#000002" },
      ],
    });
    try {
      const changed = run([{ type: "SET_BODY_PATTERN", id: "test-accent-body" }]);
      expect(changed.present.colors.accent).toBe("#000002");
      const undone = historyReducer(changed, { type: "UNDO" });
      expect(undone.present.bodyPatternId).toBe(initialDesignState.bodyPatternId);
      expect(undone.present.colors.accent).toBe(initialDesignState.colors.accent);
    } finally {
      patterns.BODY_PATTERNS.pop();
    }
  });
});

describe("name/number style history", () => {
  it("makes a typeface change one undoable step", () => {
    const changed = run([{ type: "SET_NN_PRESET", id: "modern" }]);
    expect(changed.present.nameNumberStyle.presetId).toBe("modern");
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.nameNumberStyle.presetId).toBe("classic");
  });

  it("collapses a burst of fill-color edits into one undo step (Review Focus 6)", () => {
    const burst = run([
      { type: "SET_NN_FILL", value: "#111111", at: 10_000 },
      { type: "SET_NN_FILL", value: "#222222", at: 10_100 },
      { type: "SET_NN_FILL", value: "#333333", at: 10_200 },
    ]);
    expect(burst.past).toHaveLength(1);
    expect(burst.present.nameNumberStyle.fill).toBe("#333333");
  });

  it("toggling the border is an undoable step", () => {
    const changed = run([{ type: "SET_NN_OUTLINE", value: true }]);
    expect(changed.present.nameNumberStyle.outline).toBe(true);
    expect(historyReducer(changed, { type: "UNDO" }).present.nameNumberStyle.outline).toBe(false);
  });

  it("ignores a change that leaves the style identical", () => {
    const base = createHistory();
    expect(historyReducer(base, { type: "SET_NN_OUTLINE", value: false })).toBe(base);
  });
});

describe("sponsor history", () => {
  const IMG = "data:image/png;base64,AAAA";

  it("makes uploading a sponsor one undoable step and undo restores it (Review Focus 6)", () => {
    const up = run([{ type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG }]);
    expect(up.present.sponsors.abdomen).toEqual({ dataUrl: IMG, scale: 1 });
    expect(historyReducer(up, { type: "UNDO" }).present.sponsors).toEqual({});
  });

  it("undoing a removal brings back the image and its scale", () => {
    const s = run([
      { type: "SET_SPONSOR", slot: "nape", dataUrl: IMG },
      { type: "SET_SPONSOR_SCALE", slot: "nape", value: 1.4, at: 10_000 },
      { type: "REMOVE_SPONSOR", slot: "nape" },
    ]);
    expect(s.present.sponsors).toEqual({});
    expect(historyReducer(s, { type: "UNDO" }).present.sponsors.nape).toEqual({ dataUrl: IMG, scale: 1.4 });
  });

  it("collapses dragging one placement's scale into one undo step", () => {
    const s = run([
      { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG },
      { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1.1, at: 10_000 },
      { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1.2, at: 10_100 },
      { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1.3, at: 10_200 },
    ]);
    expect(s.past).toHaveLength(2); // the upload, then the whole drag
    expect(historyReducer(s, { type: "UNDO" }).present.sponsors.abdomen!.scale).toBe(1);
  });

  it("does not group scale changes of two different placements", () => {
    const s = run([
      { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG },
      { type: "SET_SPONSOR", slot: "nape", dataUrl: IMG },
      { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1.1, at: 10_000 },
      { type: "SET_SPONSOR_SCALE", slot: "nape", value: 1.1, at: 10_100 },
    ]);
    expect(s.past).toHaveLength(4);
  });

  it("ignores a change that leaves the sponsors identical", () => {
    const s = run([{ type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG }]);
    const again = historyReducer(s, { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1 });
    expect(again).toBe(s);
  });
});
