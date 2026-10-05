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

  it("starts with a default project name and can rename it", () => {
    expect(initialDesignState.projectName).toBe("Mi diseño");
    const next = designReducer(initialDesignState, { type: "SET_PROJECT_NAME", value: "Los del viernes" });
    expect(next.projectName).toBe("Los del viernes");
  });
  describe("colors on pattern change", () => {
    const withColors = (colors: Partial<typeof initialDesignState.colors>) => ({
      ...initialDesignState,
      colors: { ...initialDesignState.colors, ...colors },
    });

    async function withAccentPattern(run: () => void) {
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
        run();
      } finally {
        patterns.BODY_PATTERNS.pop();
      }
    }

    it("keeps the colors of roles that are already in use", () => {
      const start = withColors({ primary: "#111111", secondary: "#222222" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "diagonal" });
      expect(next.colors.primary).toBe("#111111");
      expect(next.colors.secondary).toBe("#222222");
    });

    it("leaves roles the new pattern does not use alone", () => {
      const start = withColors({ accent: "#abcdef" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "plain-body" });
      expect(next.colors.accent).toBe("#abcdef");
    });

    it("never touches the collar color", () => {
      const start = withColors({ collar: "#123456" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "diagonal" });
      expect(next.colors.collar).toBe("#123456");
    });

    it("sets only the id when the pattern id is unknown", () => {
      const next = designReducer(initialDesignState, { type: "SET_BODY_PATTERN", id: "nope" });
      expect(next.bodyPatternId).toBe("nope");
      expect(next.colors).toEqual(initialDesignState.colors);
    });

    it("starts with the defaults of the initial patterns", () => {
      expect(initialDesignState.colors.primary).toBe("#0a5c36");
      expect(initialDesignState.colors.secondary).toBe("#ffffff");
    });

    it("gives a role that was not in use the new pattern's default, and keeps one that was", async () => {
      await withAccentPattern(() => {
        const start = withColors({ primary: "#111111", accent: "#abcdef" });
        const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "test-accent-body" });
        expect(next.colors.primary).toBe("#111111"); // was in use: kept
        expect(next.colors.accent).toBe("#000002"); // was not in use: default
      });
    });

    it("loses an accent color set on a role that is no longer in use (Review Focus 1)", async () => {
      await withAccentPattern(() => {
        let s = designReducer(initialDesignState, { type: "SET_BODY_PATTERN", id: "test-accent-body" });
        s = designReducer(s, { type: "SET_COLOR", slot: "accent", value: "#ff0000" });
        s = designReducer(s, { type: "SET_BODY_PATTERN", id: "plain-body" }); // accent no longer in use
        s = designReducer(s, { type: "SET_BODY_PATTERN", id: "test-accent-body" }); // back again
        expect(s.colors.accent).toBe("#000002");
      });
    });
  });
});
