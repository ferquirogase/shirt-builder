import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { GarmentPanel } from "@/components/builder/panels/GarmentPanel";
import { initialDesignState } from "@/lib/builder/state/design-state";

vi.mock("@/lib/builder/texture/image-loader", () => ({ loadImage: vi.fn() }));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;
vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));

describe("GarmentPanel for the player", () => {
  it("has the same three tabs for any shirt, on the design to begin with", () => {
    renderWithDesign(<GarmentPanel garment="player" />);
    const bar = screen.getByRole("tablist", { name: "Qué cambiar" });
    expect(within(bar).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Diseño", "Colores", "Nombre"]);
    expect(within(bar).getByRole("tab", { name: "Diseño" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches between design, colors and name and number, with a single row of tabs", () => {
    renderWithDesign(<GarmentPanel garment="player" />);
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    const bar = screen.getByRole("tablist", { name: "Qué cambiar" });
    fireEvent.click(within(bar).getByRole("tab", { name: "Colores" }));
    expect(screen.getByRole("button", { name: /^Color primario:/ })).toBeInTheDocument();
    fireEvent.click(within(bar).getByRole("tab", { name: "Nombre" }));
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });

  it("no longer has the size chart: it is in the side menu", () => {
    renderWithDesign(<GarmentPanel garment="player" />);
    expect(screen.queryByRole("button", { name: "Ver talles" })).toBeNull();
  });

  it("does not offer to remove the player's shirt", () => {
    renderWithDesign(<GarmentPanel garment="player" />);
    expect(screen.queryByRole("button", { name: /Quitar/ })).toBeNull();
  });
});

describe("GarmentPanel for the keeper", () => {
  it("invites to add it, with no tabs, until it is in the order", () => {
    renderWithDesign(<GarmentPanel garment="keeper" />);
    expect(screen.getByRole("button", { name: "Sumar camiseta de arquero" })).toBeInTheDocument();
    expect(screen.getByText(/Colores y patrón propios/)).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Qué cambiar" })).toBeNull();
  });

  it("adding it puts the keeper in the order, shows its shirt and opens its tabs", () => {
    const { api } = renderWithDesign(<GarmentPanel garment="keeper" />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));
    expect(api.current!.state.keeper.included).toBe(true);
    expect(api.current!.editing).toBe("keeper");
    expect(screen.getByRole("tablist", { name: "Qué cambiar" })).toBeInTheDocument();
  });

  it("edits the keeper's shirt and leaves the player's alone", () => {
    const { api } = renderWithDesign(<GarmentPanel garment="keeper" />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));
    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.keeper.look!.bodyPatternId).toBe("diagonal");
    expect(api.current!.state.bodyPatternId).toBe(initialDesignState.bodyPatternId);
  });

  it("can be taken out again, and goes back to the invitation", () => {
    const { api } = renderWithDesign(<GarmentPanel garment="keeper" />);
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar camiseta de arquero" }));
    expect(api.current!.state.keeper.included).toBe(false);
    expect(api.current!.editing).toBe("player");
    expect(screen.getByRole("button", { name: "Sumar camiseta de arquero" })).toBeInTheDocument();
  });
});
