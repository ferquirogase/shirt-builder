import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { STEPS, nextStep, stepIndex, stepStatus } from "@/lib/builder/steps";
import { initialDesignState } from "@/lib/builder/state/design-state";

const withShorts = { ...initialDesignState, shorts: { ...initialDesignState.shorts, included: true } };

describe("the builder's steps", () => {
  it("go shirt, shorts, keeper, crest and sponsors, order: the garments first, then what goes on all of them", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["player", "shorts", "keeper", "logos", "order"]);
    expect(STEPS.map((s) => s.label)).toEqual(["Jugador", "Short", "Arquero", "Escudo y sponsors", "Pedido"]);
  });

  it("draws every step with a 3D picture that exists, the shorts and the order with their own", () => {
    for (const step of STEPS) expect(existsSync(`public${step.icon}`), step.icon).toBe(true);
    expect(STEPS.find((s) => s.id === "shorts")!.icon).toBe("/icons/sections/shorts.webp");
    expect(STEPS.find((s) => s.id === "order")!.icon).toBe("/icons/sections/pedido.webp");
  });

  it("marks the shorts and the keeper as optional: they are offered, not required", () => {
    expect(STEPS.filter((s) => s.optional).map((s) => s.id)).toEqual(["shorts", "keeper"]);
  });

  it("knows which step comes next, and none after the order", () => {
    expect(nextStep("player")).toBe("shorts");
    expect(nextStep("shorts")).toBe("keeper");
    expect(nextStep("keeper")).toBe("logos");
    expect(nextStep("logos")).toBe("order");
    expect(nextStep("order")).toBeNull();
    expect(stepIndex("logos")).toBe(3);
  });

  describe("status", () => {
    const visited = new Set(["player", "shorts"] as const);

    it("is current for the step being edited, whatever else is true", () => {
      expect(stepStatus("shorts", { current: "shorts", visited, design: initialDesignState })).toBe("current");
    });

    it("is done for a step that was left, and to do for one not reached yet", () => {
      expect(stepStatus("player", { current: "keeper", visited, design: initialDesignState })).toBe("done");
      expect(stepStatus("logos", { current: "keeper", visited, design: initialDesignState })).toBe("todo");
    });

    it("is skipped for an optional garment that was passed without adding it, done once it is added", () => {
      expect(stepStatus("shorts", { current: "keeper", visited, design: initialDesignState })).toBe("skipped");
      expect(stepStatus("shorts", { current: "keeper", visited, design: withShorts })).toBe("done");
    });

    it("is done for an optional garment that was added, even before its step was left", () => {
      expect(stepStatus("shorts", { current: "player", visited: new Set(), design: withShorts })).toBe("done");
    });
  });
});
