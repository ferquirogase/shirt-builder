import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { SectionNav } from "@/components/builder/SectionNav";
import type { StepId } from "@/lib/builder/steps";

const NAMES = ["Camiseta", "Short", "Arquero", "Escudo y sponsors", "Pedido", "Ver talles"];
const none = new Set<StepId>();

describe("SectionNav (the line of steps)", () => {
  it("lists the steps in order, then Talles", () => {
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
    expect(badge("Camiseta")).toHaveAttribute("data-status", "done");
    expect(badge("Arquero")).toHaveAttribute("data-status", "current");
    expect(badge("Arquero")).toHaveTextContent("3");
    expect(badge("Pedido")).toHaveAttribute("data-status", "todo");
    expect(badge("Pedido")).toHaveTextContent("5");
  });

  it("says the shorts and the keeper are optional, then whether they were added or left out", () => {
    const first = renderWithDesign(<SectionNav active="player" visited={none} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("Opcional");
    expect(screen.getByRole("button", { name: "Arquero" })).toHaveTextContent("Opcional");
    expect(screen.getByRole("button", { name: "Camiseta" })).not.toHaveTextContent("Opcional");
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

  it("has Talles last, and it opens the size chart without changing the step", () => {
    const onChange = vi.fn();
    const { api } = renderWithDesign(<SectionNav active="player" visited={none} onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Ver talles" });
    expect(screen.getAllByRole("button").at(-1)).toBe(button);
    button.focus();
    fireEvent.click(button);
    expect(onChange).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(within(dialog).queryByRole("tab", { name: "Short" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(document.activeElement).toBe(button);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    fireEvent.click(button);
    expect(within(screen.getByRole("dialog")).getByRole("tab", { name: "Short" })).toBeInTheDocument();
  });
});
