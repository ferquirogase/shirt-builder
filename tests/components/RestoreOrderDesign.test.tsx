import { describe, it, expect, beforeEach } from "vitest";
import { renderWithDesign } from "../helpers/render-with-design";
import { RestoreOrderDesign } from "@/components/builder/RestoreOrderDesign";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine } from "@/lib/checkout/order";
import { clearOrder, saveOrder } from "@/lib/checkout/order-storage";

beforeEach(() => clearOrder());

describe("RestoreOrderDesign", () => {
  it("loads the design of the saved order into the builder", () => {
    saveOrder({
      design: { ...initialDesignState, projectName: "Los del viernes", colors: { ...initialDesignState.colors, primary: "#123456" } },
      thumbnails: null,
      roster: [createPlayerLine("a", { name: "Leo", number: "10" })],
    });
    const { api } = renderWithDesign(<RestoreOrderDesign />);
    expect(api.current!.state.projectName).toBe("Los del viernes");
    expect(api.current!.state.colors.primary).toBe("#123456");
    expect(api.current!.canUndo).toBe(false);
  });

  it("fills in design fields missing from an older saved order", () => {
    const { sponsors: omitted, ...withoutSponsors } = initialDesignState;
    void omitted;
    saveOrder({
      design: { ...withoutSponsors, projectName: "Viejo" } as typeof initialDesignState,
      thumbnails: null,
      roster: [createPlayerLine("a")],
    });
    const { api } = renderWithDesign(<RestoreOrderDesign />);
    expect(api.current!.state.projectName).toBe("Viejo");
    expect(api.current!.state.sponsors).toEqual({});
  });

  it("leaves the default design alone when there is no order", () => {
    const { api } = renderWithDesign(<RestoreOrderDesign />);
    expect(api.current!.state.projectName).toBe(initialDesignState.projectName);
  });
});
