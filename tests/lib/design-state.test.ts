import { describe, it, expect } from "vitest";
import { designReducer, initialDesignState } from "@/lib/builder/design-state";

describe("designReducer", () => {
  it("sets a color for the given slot", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_COLOR",
      slot: "primary",
      value: "#ff0000",
    });
    expect(next.colors.primary).toBe("#ff0000");
  });

  it("does not mutate the previous state", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_PLAYER_NUMBER",
      value: "10",
    });
    expect(initialDesignState.playerNumber).toBe("");
    expect(next.playerNumber).toBe("10");
  });

  it("sets the body pattern id", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_BODY_PATTERN",
      id: "plain-body",
    });
    expect(next.bodyPatternId).toBe("plain-body");
  });
});
