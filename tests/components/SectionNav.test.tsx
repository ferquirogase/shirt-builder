import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { SectionNav } from "@/components/builder/SectionNav";
import type { StepId } from "@/lib/builder/steps";

const NAMES = ["Jugador", "Short", "Arquero", "Escudo y sponsors", "Pedido"];
const none = new Set<StepId>();

describe("SectionNav (the line of steps)", () => {
  it("lists the steps in order", () => {
    renderWithDesign(<SectionNav active="player" visited={none} onChange={() => {}} />);
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(NAMES);
    expect(screen.getByRole("navigation", { name: "Etapas" })).toBeInTheDocument();
  });

  it("marks the current step with more than a text color change (also on mobile)", () => {
    renderWithDesign(<SectionNav active="logos" visited={none} onChange={() => {}} />);
    const active = screen.getByRole("button", { name: "Escudo y sponsors" });
    expect(active).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Pedido" })).not.toHaveAttribute("aria-current");
    expect(active.className).toContain("bg-accent-soft");
    expect(active.className).not.toContain("md:bg-accent-soft");
  });

  it("numbers the steps not done yet and ticks the ones done", () => {
    renderWithDesign(<SectionNav active="keeper" visited={new Set<StepId>(["player"])} onChange={() => {}} />);
    const badge = (name: string) => within(screen.getByRole("button", { name })).getByTestId("step-badge");
    expect(badge("Jugador")).toHaveAttribute("data-status", "done");
    expect(badge("Arquero")).toHaveAttribute("data-status", "current");
    expect(badge("Arquero")).toHaveTextContent("3");
    expect(badge("Pedido")).toHaveAttribute("data-status", "todo");
    expect(badge("Pedido")).toHaveTextContent("5");
  });

  it("says the shorts and the keeper are optional, then whether they were added or left out", () => {
    const first = renderWithDesign(<SectionNav active="player" visited={none} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("Opcional");
    expect(screen.getByRole("button", { name: "Arquero" })).toHaveTextContent("Opcional");
    expect(screen.getByRole("button", { name: "Jugador" })).not.toHaveTextContent("Opcional");
    first.unmount();
    const { api } = renderWithDesign(
      <SectionNav active="logos" visited={new Set<StepId>(["player", "shorts", "keeper"])} onChange={() => {}} />
    );
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("No sumado");
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("Sumado");
    expect(screen.getByRole("button", { name: "Short" })).not.toHaveTextContent("No sumado");
  });

  it("reports the clicked step: any of them, in any order (the steps guide, they do not lock)", () => {
    const onChange = vi.fn();
    renderWithDesign(<SectionNav active="player" visited={none} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Pedido" }));
    expect(onChange).toHaveBeenCalledWith("order");
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    expect(onChange).toHaveBeenCalledWith("keeper");
  });

  it("makes the viewer show the shirt of the step", () => {
    const { api } = renderWithDesign(<SectionNav active="player" visited={none} onChange={() => {}} />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    expect(api.current!.editing).toBe("keeper");
    fireEvent.click(screen.getByRole("button", { name: "Short" }));
    expect(api.current!.editing).toBe("player"); // the shorts follow the team
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Escudo y sponsors" }));
    expect(api.current!.editing).toBe("keeper"); // crest and sponsors leave the shirt as it was
  });

  it("has no Talles button: the size chart is offered in the steps where sizes matter", () => {
    renderWithDesign(<SectionNav active="player" visited={none} onChange={() => {}} />);
    expect(screen.queryByRole("button", { name: "Ver talles" })).toBeNull();
  });
});
