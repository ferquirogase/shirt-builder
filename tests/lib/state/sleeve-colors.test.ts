import { describe, it, expect } from "vitest";
import { defaultKeeperLook, designReducer, initialDesignState } from "@/lib/builder/state/design-state";
import { withColorDefaults } from "@/lib/checkout/order-storage";
import { cuffRect } from "@/lib/builder/texture/image-loader";

// The sleeves wear the molde's own sleeve, in the torso's colors; only the cuff band has a color of its own.
describe("the cuff's color", () => {
  it("starts as the shirt's secondary and follows it until the user picks another", () => {
    expect(initialDesignState.colors.sleeveTrim).toBe(initialDesignState.colors.secondary);
    let s = designReducer(initialDesignState, { type: "SET_COLOR", slot: "secondary", value: "#222222" });
    expect(s.colors.sleeveTrim).toBe("#222222");
    s = designReducer(s, { type: "SET_COLOR", slot: "sleeveTrim", value: "#654321" });
    s = designReducer(s, { type: "SET_COLOR", slot: "secondary", value: "#333333" });
    expect(s.colors.sleeveTrim).toBe("#654321");
  });

  it("is changed on its own, leaving the torso's colors alone", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "sleeveTrim", value: "#654321" });
    expect(next.colors).toEqual({ ...initialDesignState.colors, sleeveTrim: "#654321" });
  });

  it("is on the keeper's shirt too, starting on its trim color", () => {
    const look = defaultKeeperLook({ primary: "#0a5c36", secondary: "#ffffff" });
    expect(look.colors.sleeveTrim).toBe(look.colors.secondary);
    let s = designReducer(initialDesignState, { type: "SET_KEEPER_INCLUDED", value: true });
    s = designReducer(s, { type: "SET_COLOR", slot: "sleeveTrim", value: "#123456", target: "keeper" });
    expect(s.keeper.look!.colors.sleeveTrim).toBe("#123456");
    expect(s.colors.sleeveTrim).toBe(initialDesignState.colors.sleeveTrim);
  });

  it("there is no separate sleeve color any more", () => {
    expect(Object.keys(initialDesignState.colors)).not.toContain("sleeve");
  });
});

describe("a design saved before the moldes", () => {
  it("gets the colors it lacks and drops the old sleeve color", () => {
    const old = { primary: "#111111", secondary: "#222222", accent: "#333333", collar: "#444444", sleeve: "#555555" };
    const filled = withColorDefaults(old as unknown as typeof initialDesignState.colors);
    expect(filled).toEqual({
      primary: "#111111",
      secondary: "#222222",
      accent: "#333333",
      quaternary: initialDesignState.colors.quaternary,
      collar: "#444444",
      sleeveTrim: "#222222",
    });
    expect(withColorDefaults(initialDesignState.colors)).toEqual(initialDesignState.colors);
  });
});

describe("cuffRect", () => {
  it("covers the sleeve image from where the cuff starts to the cuff edge, all round the arm", () => {
    expect(cuffRect(0.875, 512)).toEqual({ x: 448, y: 0, width: 64, height: 512 });
  });
});
