import { describe, it, expect } from "vitest";
import { colorsAfterPatternChange, designReducer, initialDesignState, shortsColor } from "@/lib/builder/state/design-state";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { colorDistance, contrastColor } from "@/lib/builder/color/contrast";
import { defaultKeeperLook, lookFor, pickKeeperPrimary } from "@/lib/builder/state/design-state";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";

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
      const patterns = await import("@/lib/builder/catalog/patterns");
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

describe("SET_SLEEVE_PATTERN with a real sleeve pattern", () => {
  it("applies the pattern's accent default and leaves the other colors alone", () => {
    const next = designReducer(initialDesignState, { type: "SET_SLEEVE_PATTERN", id: "sleeve-accent" });
    expect(next.sleevePatternId).toBe("sleeve-accent");
    expect(next.colors.accent).toBe("#1a2a55");
    expect(next.colors.primary).toBe(initialDesignState.colors.primary);
    expect(next.colors.secondary).toBe(initialDesignState.colors.secondary);
    expect(next.colors.collar).toBe(initialDesignState.colors.collar);
  });
});

describe("colorsAfterPatternChange", () => {
  const state = {
    ...initialDesignState,
    colors: { primary: "#111111", secondary: "#222222", accent: "#abcdef", collar: "#123456" },
  };

  it("keeps roles in use and gives a role not in use the pattern default", () => {
    const colors = colorsAfterPatternChange(state, "sleeve", "sleeve-accent");
    expect(colors.accent).toBe("#1a2a55");
    expect(colors.primary).toBe("#111111");
    expect(colors.secondary).toBe("#222222");
  });

  it("keeps an in-use role's color", () => {
    expect(colorsAfterPatternChange(state, "body", "diagonal").primary).toBe("#111111");
  });

  it("never touches the collar", () => {
    expect(colorsAfterPatternChange(state, "body", "stripes-three").collar).toBe("#123456");
  });

  it("returns the current colors for an unknown id", () => {
    expect(colorsAfterPatternChange(state, "body", "nope")).toEqual(state.colors);
  });

  it("matches what the reducer produces", () => {
    const next = designReducer(state, { type: "SET_BODY_PATTERN", id: "stripes-three" });
    expect(next.colors).toEqual(colorsAfterPatternChange(state, "body", "stripes-three"));
  });
});

describe("name/number style", () => {
  it("starts classic, white and without a border", () => {
    expect(initialDesignState.nameNumberStyle).toEqual({ presetId: "classic", fill: "#ffffff", outline: false });
  });

  it("changing the typeface keeps the chosen color and border", () => {
    const tweaked = designReducer(
      designReducer(initialDesignState, { type: "SET_NN_FILL", value: "#ff0000" }),
      { type: "SET_NN_OUTLINE", value: true }
    );
    const next = designReducer(tweaked, { type: "SET_NN_PRESET", id: "modern" });
    expect(next.nameNumberStyle).toEqual({ presetId: "modern", fill: "#ff0000", outline: true });
  });

  it("ignores an unknown or removed preset id", () => {
    expect(designReducer(initialDesignState, { type: "SET_NN_PRESET", id: "nope" })).toBe(initialDesignState);
    expect(designReducer(initialDesignState, { type: "SET_NN_PRESET", id: "retro" })).toBe(initialDesignState);
  });

  it("changes only the targeted field", () => {
    const fill = designReducer(initialDesignState, { type: "SET_NN_FILL", value: "#123456" });
    expect(fill.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, fill: "#123456" });
    const outline = designReducer(initialDesignState, { type: "SET_NN_OUTLINE", value: true });
    expect(outline.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, outline: true });
  });
});

describe("sponsors", () => {
  const IMG = "data:image/png;base64,AAAA";
  const IMG2 = "data:image/png;base64,BBBB";

  it("starts with no sponsors and no text sponsor", () => {
    expect(initialDesignState.sponsors).toEqual({});
    expect("sponsorText" in initialDesignState).toBe(false);
  });

  it("stores an image for a placement at scale 1", () => {
    const next = designReducer(initialDesignState, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG });
    expect(next.sponsors).toEqual({ abdomen: { dataUrl: IMG, scale: 1 } });
  });

  it("keeps the placements independent", () => {
    const a = designReducer(initialDesignState, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG });
    const b = designReducer(a, { type: "SET_SPONSOR", slot: "nape", dataUrl: IMG2 });
    expect(b.sponsors).toEqual({ abdomen: { dataUrl: IMG, scale: 1 }, nape: { dataUrl: IMG2, scale: 1 } });
  });

  it("replacing an image keeps that placement's scale (Review Focus 6)", () => {
    let s = designReducer(initialDesignState, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG });
    s = designReducer(s, { type: "SET_SPONSOR_SCALE", slot: "abdomen", value: 1.3 });
    s = designReducer(s, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG2 });
    expect(s.sponsors.abdomen).toEqual({ dataUrl: IMG2, scale: 1.3 });
  });

  it("clamps the scale to 0.5..1.5 and treats NaN as 1 (Review Focus 1)", () => {
    const base = designReducer(initialDesignState, { type: "SET_SPONSOR", slot: "nape", dataUrl: IMG });
    expect(designReducer(base, { type: "SET_SPONSOR_SCALE", slot: "nape", value: 9 }).sponsors.nape!.scale).toBe(1.5);
    expect(designReducer(base, { type: "SET_SPONSOR_SCALE", slot: "nape", value: 0 }).sponsors.nape!.scale).toBe(0.5);
    expect(designReducer(base, { type: "SET_SPONSOR_SCALE", slot: "nape", value: Number.NaN }).sponsors.nape!.scale).toBe(1);
  });

  it("ignores a scale change on an empty placement", () => {
    const next = designReducer(initialDesignState, { type: "SET_SPONSOR_SCALE", slot: "nape", value: 1.2 });
    expect(next).toBe(initialDesignState);
  });

  it("removes a sponsor, leaving the others", () => {
    let s = designReducer(initialDesignState, { type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG });
    s = designReducer(s, { type: "SET_SPONSOR", slot: "nape", dataUrl: IMG2 });
    s = designReducer(s, { type: "REMOVE_SPONSOR", slot: "abdomen" });
    expect(s.sponsors).toEqual({ nape: { dataUrl: IMG2, scale: 1 } });
  });

  it("ignores removing an empty placement and any unknown placement", () => {
    expect(designReducer(initialDesignState, { type: "REMOVE_SPONSOR", slot: "abdomen" })).toBe(initialDesignState);
    const bad = "chest" as never;
    expect(designReducer(initialDesignState, { type: "SET_SPONSOR", slot: bad, dataUrl: IMG })).toBe(initialDesignState);
    expect(designReducer(initialDesignState, { type: "SET_SPONSOR_SCALE", slot: bad, value: 1 })).toBe(initialDesignState);
    expect(designReducer(initialDesignState, { type: "REMOVE_SPONSOR", slot: bad })).toBe(initialDesignState);
  });
});

describe("shorts", () => {
  it("starts as shirt only, with the primary color", () => {
    expect(initialDesignState.shorts).toEqual({ included: false, colorSource: "primary" });
  });

  it("includes and drops the shorts", () => {
    const set = designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true });
    expect(set.shorts.included).toBe(true);
    expect(designReducer(set, { type: "SET_SHORTS_INCLUDED", value: false }).shorts.included).toBe(false);
  });

  it("picks the secondary color and keeps the rest of the shorts config", () => {
    const set = designReducer(
      designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true }),
      { type: "SET_SHORTS_COLOR_SOURCE", value: "secondary" }
    );
    expect(set.shorts).toEqual({ included: true, colorSource: "secondary" });
  });

  it("ignores a color source that is not primary or secondary", () => {
    const next = designReducer(initialDesignState, { type: "SET_SHORTS_COLOR_SOURCE", value: "accent" as never });
    expect(next).toBe(initialDesignState);
  });

  it("does not mutate the previous state", () => {
    designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true });
    expect(initialDesignState.shorts.included).toBe(false);
  });
});

describe("shortsColor", () => {
  it("follows the shirt's primary or secondary color", () => {
    const base = { ...initialDesignState, colors: { ...initialDesignState.colors, primary: "#112233", secondary: "#aabbcc" } };
    expect(shortsColor({ ...base, shorts: { included: true, colorSource: "primary" } })).toBe("#112233");
    expect(shortsColor({ ...base, shorts: { included: true, colorSource: "secondary" } })).toBe("#aabbcc");
  });

  it("changes when the shirt's color changes", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "primary", value: "#ff0000" });
    expect(shortsColor(next)).toBe("#ff0000");
  });
});

describe("RESET_DESIGN", () => {
  const edited = [
    { type: "SET_BODY_PATTERN", id: "plain-body" },
    { type: "SET_COLOR", slot: "primary", value: "#123456" },
    { type: "SET_PLAYER_NAME", value: "Leo" },
    { type: "SET_PLAYER_NUMBER", value: "10" },
    { type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" },
    { type: "SET_SHORTS_COLOR_SOURCE", value: "secondary" },
  ] as const;

  it("brings every design choice back to the start", () => {
    const state = edited.reduce(designReducer, initialDesignState);
    const reset = designReducer(state, { type: "RESET_DESIGN" });
    expect(reset).toEqual(initialDesignState);
  });

  it("keeps what is being bought and the project name: they are not part of the design", () => {
    let state = designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true });
    state = designReducer(state, { type: "SET_PROJECT_NAME", value: "Los Pibes" });
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#123456" });
    const reset = designReducer(state, { type: "RESET_DESIGN" });
    expect(reset.shorts.included).toBe(true);
    expect(reset.projectName).toBe("Los Pibes");
    expect(reset.colors).toEqual(initialDesignState.colors);
  });
});

describe("made crest", () => {
  it("starts without one", () => {
    expect(initialDesignState.crestConfig).toBeNull();
  });

  it("stores the config and draws it as the logo", () => {
    const next = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    expect(next.crestConfig).toEqual(INITIAL_CREST);
    expect(next.logoDataUrl).toBe(crestDataUrl(INITIAL_CREST));
  });

  it("ignores a config whose shape does not exist", () => {
    const next = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: { ...INITIAL_CREST, shapeId: "nope" } });
    expect(next).toBe(initialDesignState);
  });

  it("an uploaded crest replaces the made one, and removing it clears both", () => {
    const made = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    const uploaded = designReducer(made, { type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" });
    expect(uploaded.crestConfig).toBeNull();
    expect(uploaded.logoDataUrl).toBe("data:image/png;base64,AAAA");
    const removed = designReducer(made, { type: "SET_LOGO", dataUrl: null });
    expect(removed.crestConfig).toBeNull();
    expect(removed.logoDataUrl).toBeNull();
  });

  it("is dropped by a reset", () => {
    const made = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    const reset = designReducer(made, { type: "RESET_DESIGN" });
    expect(reset.crestConfig).toBeNull();
    expect(reset.logoDataUrl).toBeNull();
  });
});

const withKeeper = () => designReducer(initialDesignState, { type: "SET_KEEPER_INCLUDED", value: true });

describe("keeper", () => {
  it("starts out of the order", () => {
    expect(initialDesignState.keeper).toEqual({ included: false, look: null, nameNumberFill: null });
    expect(lookFor(initialDesignState, "keeper")).toBe(initialDesignState);
  });

  it("is given colors that contrast with the team's when it is added", () => {
    const state = withKeeper();
    expect(state.keeper.included).toBe(true);
    const look = state.keeper.look!;
    expect(colorDistance(look.colors.primary, state.colors.primary)).toBeGreaterThan(150);
    expect(colorDistance(look.colors.primary, state.colors.secondary)).toBeGreaterThan(150);
  });

  it("does not pick the team's own color for the keeper", () => {
    expect(pickKeeperPrimary({ primary: "#f5b700", secondary: "#000000" })).not.toBe("#f5b700");
    expect(defaultKeeperLook({ primary: "#f5b700", secondary: "#000000" }).colors.primary).not.toBe("#f5b700");
  });

  it("keeps its look when taken out and put back", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#123456", target: "keeper" });
    state = designReducer(state, { type: "SET_KEEPER_INCLUDED", value: false });
    state = designReducer(state, { type: "SET_KEEPER_INCLUDED", value: true });
    expect(state.keeper.look!.colors.primary).toBe("#123456");
  });

  it("edits the keeper's look without touching the team's", () => {
    let state = withKeeper();
    const before = state.colors;
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    state = designReducer(state, { type: "SET_BODY_PATTERN", id: "hoops", target: "keeper" });
    expect(state.colors).toEqual(before);
    expect(state.bodyPatternId).toBe(initialDesignState.bodyPatternId);
    expect(state.keeper.look!.colors.primary).toBe("#abcdef");
    expect(state.keeper.look!.bodyPatternId).toBe("hoops");
  });

  it("takes the pattern's default colors for new roles, like the team does", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_BODY_PATTERN", id: "stripes-wide", target: "keeper" });
    expect(state.keeper.look!.colors.secondary).toBe("#111111");
  });

  it("ignores keeper edits while the keeper is not in the order", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    expect(next).toBe(initialDesignState);
  });

  it("lookFor wears the keeper's look and picks a readable number color", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#ffffff", target: "keeper" });
    const view = lookFor(state, "keeper");
    expect(view.colors.primary).toBe("#ffffff");
    expect(view.nameNumberStyle.fill).toBe(contrastColor("#ffffff"));
    expect(view.playerName).toBe(state.playerName);
    expect(lookFor(state, "player")).toBe(state);
  });

  it("lets the keeper's number color be chosen, apart from the team's", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_NN_FILL", value: "#ff00ff", target: "keeper" });
    expect(lookFor(state, "keeper").nameNumberStyle.fill).toBe("#ff00ff");
    expect(state.nameNumberStyle.fill).toBe(initialDesignState.nameNumberStyle.fill);
  });

  it("keeps whether it is in the order on reset, with a fresh look", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    const reset = designReducer(state, { type: "RESET_DESIGN" });
    expect(reset.keeper.included).toBe(true);
    expect(reset.keeper.look).toEqual(defaultKeeperLook(initialDesignState.colors));
    expect(reset.keeper.nameNumberFill).toBeNull();
    const resetOut = designReducer(initialDesignState, { type: "RESET_DESIGN" });
    expect(resetOut.keeper).toEqual(initialDesignState.keeper);
  });
});
