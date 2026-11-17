import { describe, it, expect } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { ShortsPanel } from "@/components/builder/panels/ShortsPanel";
import { initialDesignState } from "@/lib/builder/state/design-state";

describe("ShortsPanel", () => {
  it("invites to add the shorts, with what they add to each player's price", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    const add = screen.getByRole("button", { name: "Sumar short" });
    expect(add).toHaveAccessibleDescription(/20/);
    expect(add).toHaveAccessibleDescription(/por jugador/);
    expect(add).toHaveAccessibleDescription(/propios/);
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(add);
    expect(api.current!.state.shorts.included).toBe(true);
  });

  it("opens on its designs, the plain one chosen, and picks another", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("tab", { name: "Diseño" })).toHaveAttribute("aria-selected", "true");
    const designs = within(screen.getByRole("radiogroup", { name: "Diseño del short" })).getAllByRole("radio");
    expect(designs.map((d) => d.textContent)).toEqual(["Liso", "Ruedo", "Franja lateral", "Lateral bicolor"]);
    expect(screen.getByRole("radio", { name: "Liso" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Franja lateral" }));
    expect(api.current!.state.shorts.patternId).toBe("shorts-side-stripe");
    expect(screen.getByRole("radio", { name: "Franja lateral" })).toBeChecked();
  });

  it("shows only the colors the chosen design uses, and changes them for the shorts alone", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_SHORTS_PATTERN", id: "shorts-side-two-tone" }));
    fireEvent.click(screen.getByRole("tab", { name: "Colores" }));
    const fields = screen.getAllByRole("button", { name: /^Color/ });
    expect(fields.map((f) => f.getAttribute("aria-label")!.split(":")[0])).toEqual(["Color principal", "Color 2", "Color 3"]);

    fireEvent.click(screen.getByRole("button", { name: /^Color 2:/ }));
    const palette = screen.getByRole("radiogroup", { name: "Color 2" });
    fireEvent.click(within(palette).getAllByRole("radio").find((r) => r.getAttribute("aria-checked") !== "true")!);
    expect(api.current!.state.shorts.colors.secondary).not.toBe(initialDesignState.shorts.colors.secondary);
    expect(api.current!.state.colors).toEqual(initialDesignState.colors);

    act(() => api.current!.dispatch({ type: "SET_SHORTS_PATTERN", id: "shorts-plain" }));
    expect(screen.getAllByRole("button", { name: /^Color/ })).toHaveLength(1);
  });

  it("can be taken out again", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar short" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar short" }));
    expect(api.current!.state.shorts.included).toBe(false);
    expect(screen.getByRole("button", { name: "Sumar short" })).toBeInTheDocument();
  });
});
