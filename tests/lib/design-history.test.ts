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
    s = historyReducer(s, { type: "SET_SPONSOR_TEXT", value: "ACME", at: 10_000 });
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
