import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SLEEVE_SVG_PATH } from "@/lib/builder/catalog/patterns";
import { defaultKeeperLook, designReducer, initialDesignState } from "@/lib/builder/state/design-state";
import { withSleeveColors } from "@/lib/checkout/order-storage";

describe("the sleeves' colors", () => {
  it("start as the shirt's primary for the sleeve and its secondary for the edge stripe", () => {
    expect(initialDesignState.colors.sleeve).toBe(initialDesignState.colors.primary);
    expect(initialDesignState.colors.sleeveTrim).toBe(initialDesignState.colors.secondary);
  });

  it("can be changed on their own, leaving the torso's colors alone", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "sleeve", value: "#123456" });
    const trim = designReducer(next, { type: "SET_COLOR", slot: "sleeveTrim", value: "#654321" });
    expect(trim.colors).toEqual({ ...initialDesignState.colors, sleeve: "#123456", sleeveTrim: "#654321" });
  });

  it("follow the torso's primary and secondary for as long as they were not chosen apart", () => {
    let s = designReducer(initialDesignState, { type: "SET_COLOR", slot: "primary", value: "#111111" });
    s = designReducer(s, { type: "SET_COLOR", slot: "secondary", value: "#222222" });
    expect(s.colors.sleeve).toBe("#111111");
    expect(s.colors.sleeveTrim).toBe("#222222");
  });

  it("stop following once the user chose their own", () => {
    let s = designReducer(initialDesignState, { type: "SET_COLOR", slot: "sleeve", value: "#123456" });
    s = designReducer(s, { type: "SET_COLOR", slot: "primary", value: "#111111" });
    expect(s.colors.sleeve).toBe("#123456");
  });

  it("follow a secondary that a new torso pattern brings in", () => {
    // plain-body does not show the secondary; the next pattern does, with its own default
    let s = designReducer(initialDesignState, { type: "SET_BODY_PATTERN", id: "plain-body" });
    s = designReducer(s, { type: "SET_BODY_PATTERN", id: "stripes-wide" });
    expect(s.colors.sleeveTrim).toBe(s.colors.secondary);
  });

  it("are on the keeper's shirt too, and are changed there without touching the player's", () => {
    let s = designReducer(initialDesignState, { type: "SET_KEEPER_INCLUDED", value: true });
    s = designReducer(s, { type: "SET_COLOR", slot: "sleeve", value: "#123456", target: "keeper" });
    expect(s.keeper.look!.colors.sleeve).toBe("#123456");
    expect(s.colors.sleeve).toBe(initialDesignState.colors.sleeve);
  });

  it("start on the keeper's primary and its trim color", () => {
    const look = defaultKeeperLook({ primary: "#0a5c36", secondary: "#ffffff" });
    expect(look.colors.sleeve).toBe(look.colors.primary);
    expect(look.colors.sleeveTrim).toBe(look.colors.secondary);
  });

  it("are filled in for a design saved before they existed", () => {
    const { sleeve, sleeveTrim, ...old } = initialDesignState.colors;
    void sleeve;
    void sleeveTrim;
    const filled = withSleeveColors({ ...old, primary: "#111111", secondary: "#222222" } as typeof initialDesignState.colors);
    expect(filled.sleeve).toBe("#111111");
    expect(filled.sleeveTrim).toBe("#222222");
    expect(withSleeveColors(initialDesignState.colors)).toEqual(initialDesignState.colors);
  });
});

describe("the sleeve texture", () => {
  const markup = fs.readFileSync(path.join(process.cwd(), "public", SLEEVE_SVG_PATH), "utf8");

  it("is drawn with the sleeve's two colors only", () => {
    const slots = new Set([...markup.matchAll(/data-color-slot="([a-zA-Z]+)"/g)].map((m) => m[1]));
    expect([...slots].sort()).toEqual(["sleeve", "sleeveTrim"]);
  });

  it("has a single stripe, at the edge: never two or three lines that read as another brand's", () => {
    const stripes = [...markup.matchAll(/<(?:rect|polygon|path)[^>]*data-color-slot="sleeveTrim"/g)];
    expect(stripes).toHaveLength(1);
  });
});
