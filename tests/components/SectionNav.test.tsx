import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionNav } from "@/components/builder/SectionNav";

describe("SectionNav", () => {
  it("renders the six sections, Prendas first and marks the active one", () => {
    render(<SectionNav active="colores" onChange={() => {}} />);
    for (const name of ["Prendas", "Diseño", "Colores", "Escudo", "Sponsor", "Nombre y número"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Colores" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Diseño" })).not.toHaveAttribute("aria-current");
  });

  it("marks the active section with more than a text color change (also on mobile)", () => {
    render(<SectionNav active="colores" onChange={() => {}} />);
    const active = screen.getByRole("button", { name: "Colores" });
    // A filled background applies at every breakpoint, and the low-contrast
    // accent color is not used for text.
    expect(active.className).toContain("bg-accent-soft");
    expect(active.className).not.toContain("md:bg-accent-soft");
    expect(active.className).not.toContain("text-accent-strong");
  });

  it("puts Prendas first, because what to buy is chosen before the design is built", () => {
    render(<SectionNav active="prendas" onChange={() => {}} />);
    const names = screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"));
    expect(names).toEqual(["Prendas", "Diseño", "Colores", "Escudo", "Sponsor", "Nombre y número"]);
  });

  it("reports the Prendas section", () => {
    const onChange = vi.fn();
    render(<SectionNav active="diseno" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Prendas" }));
    expect(onChange).toHaveBeenCalledWith("prendas");
  });

  it("reports the clicked section", () => {
    const onChange = vi.fn();
    render(<SectionNav active="diseno" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Nombre y número" }));
    expect(onChange).toHaveBeenCalledWith("texto");
  });
});
