import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { DesignPanel } from "@/components/builder/panels/DesignPanel";
import { ColorsPanel } from "@/components/builder/panels/ColorsPanel";
import { TextPanel } from "@/components/builder/panels/TextPanel";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";
import { GarmentsPanel } from "@/components/builder/panels/GarmentsPanel";

vi.mock("@/lib/builder/texture/image-loader", () => ({ loadImage: vi.fn() }));

const keeperIn = (api: { current: { dispatch: (a: never) => void } | null }) =>
  act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true } as never));

describe("garment selector in the panels", () => {
  it.each([
    ["Diseño", <DesignPanel key="d" />],
    ["Colores", <ColorsPanel key="c" />],
    ["Nombre y número", <TextPanel key="t" />],
  ])("%s says which shirt it edits, once the keeper is in", (_name, panel) => {
    const { api } = renderWithDesign(panel);
    expect(screen.queryByRole("radiogroup", { name: "Editando" })).toBeNull();
    keeperIn(api);
    const group = screen.getByRole("radiogroup", { name: "Editando" });
    expect(within(group).getByRole("radio", { name: "Jugador" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(group).getByRole("radio", { name: "Arquero" }));
    expect(api.current!.editing).toBe("keeper");
    expect(within(group).getByRole("radio", { name: "Arquero" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(within(group).getByRole("radio", { name: "Jugador" }));
    expect(api.current!.editing).toBe("player");
  });

  it("shows the same shirt icon as Prendas for the same shirt", () => {
    const prendas = renderWithDesign(<GarmentsPanel />);
    const solo = within(screen.getByRole("radio", { name: /Solo camiseta/ })).getByRole("presentation", { hidden: true });
    const soloIcon = solo.getAttribute("src");
    prendas.unmount();
    const { api } = renderWithDesign(<DesignPanel />);
    keeperIn(api);
    const player = within(screen.getByRole("radio", { name: "Jugador" })).getByRole("presentation", { hidden: true });
    expect(player.getAttribute("src")).toBe(soloIcon);
  });

  it("goes back to the player when the keeper is taken out", () => {
    const { api } = renderWithDesign(<DesignPanel />);
    keeperIn(api);
    fireEvent.click(screen.getByRole("radio", { name: "Arquero" }));
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    expect(api.current!.editing).toBe("player");
    expect(screen.queryByRole("radiogroup", { name: "Editando" })).toBeNull();
  });

  it.each([
    ["Escudo", <CrestPanel key="e" />],
    ["Sponsor", <SponsorPanel key="s" />],
  ])("%s has no selector but says it applies to both shirts", (_name, panel) => {
    const { api } = renderWithDesign(panel);
    expect(screen.queryByText("Se aplica a las dos camisetas")).toBeNull();
    keeperIn(api);
    expect(screen.getByText("Se aplica a las dos camisetas")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Editando" })).toBeNull();
  });

  it("adding the keeper in Prendas takes the viewer to the keeper's shirt", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    fireEvent.click(screen.getByRole("switch", { name: "Sumar camiseta de arquero" }));
    expect(api.current!.editing).toBe("keeper");
  });

  it("taking the keeper out in Prendas leaves the player's shirt", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    const toggle = screen.getByRole("switch", { name: "Sumar camiseta de arquero" });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(api.current!.editing).toBe("player");
  });
});
