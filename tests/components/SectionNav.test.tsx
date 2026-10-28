import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { SectionNav } from "@/components/builder/SectionNav";

const NAMES = ["Camiseta jugador", "Camiseta arquero", "Short", "Escudo", "Sponsor"];

describe("SectionNav", () => {
  it("is by garment first, then what is shared by both shirts", () => {
    renderWithDesign(<SectionNav active="player" onChange={() => {}} />);
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(NAMES);
  });

  it("marks the active entry with more than a text color change (also on mobile)", () => {
    renderWithDesign(<SectionNav active="crest" onChange={() => {}} />);
    const active = screen.getByRole("button", { name: "Escudo" });
    expect(active).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Sponsor" })).not.toHaveAttribute("aria-current");
    expect(active.className).toContain("bg-accent-soft");
    expect(active.className).not.toContain("md:bg-accent-soft");
    expect(active.className).not.toContain("text-accent-strong");
  });

  it("offers the keeper and the shorts from the start, with a cue to add them until they are in", () => {
    const { api } = renderWithDesign(<SectionNav active="player" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Camiseta arquero" })).toHaveTextContent("Sumar");
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("Sumar");
    expect(screen.getByRole("button", { name: "Camiseta jugador" })).not.toHaveTextContent("Sumar");
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("button", { name: "Camiseta arquero" })).not.toHaveTextContent("Sumar");
    expect(screen.getByRole("button", { name: "Short" })).not.toHaveTextContent("Sumar");
  });

  it("reports the clicked entry", () => {
    const onChange = vi.fn();
    renderWithDesign(<SectionNav active="player" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Sponsor" }));
    expect(onChange).toHaveBeenCalledWith("sponsor");
    fireEvent.click(screen.getByRole("button", { name: "Camiseta arquero" }));
    expect(onChange).toHaveBeenCalledWith("keeper");
  });

  it("makes the viewer show the shirt that was picked", () => {
    const { api } = renderWithDesign(<SectionNav active="player" onChange={() => {}} />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("button", { name: "Camiseta arquero" }));
    expect(api.current!.editing).toBe("keeper");
    fireEvent.click(screen.getByRole("button", { name: "Short" }));
    expect(api.current!.editing).toBe("player"); // the shorts follow the team
    fireEvent.click(screen.getByRole("button", { name: "Camiseta arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Camiseta jugador" }));
    expect(api.current!.editing).toBe("player");
  });

  it("leaves the shirt shown as it was when Escudo or Sponsor is picked", () => {
    const { api } = renderWithDesign(<SectionNav active="player" onChange={() => {}} />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("button", { name: "Camiseta arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Escudo" }));
    expect(api.current!.editing).toBe("keeper");
  });

  it("draws every icon inside a box of the same size, whatever the image's proportions", () => {
    renderWithDesign(<SectionNav active="player" onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
    for (const button of buttons) {
      const img = button.querySelector("img")!;
      expect(img.className).toContain("object-contain");
      expect(img.parentElement!.className).toContain("h-8");
      expect(img.parentElement!.className).toContain("w-8");
    }
  });
});
