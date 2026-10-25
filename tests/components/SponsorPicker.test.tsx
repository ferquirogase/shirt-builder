import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";

// The panel can be taken out and put back while the design (and so the context) stays.
function PanelToggle() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(false)}>cerrar</button>
      {open && <SponsorPanel />}
    </>
  );
}

const IMG = "data:image/png;base64,AAAA";

describe("the sponsor picker shared by the panel and the markers on the shirt", () => {
  it("turns the markers on while the Sponsor panel is open, and off when it closes", () => {
    const { api } = renderWithDesign(<PanelToggle />);
    expect(api.current!.sponsorMarkers).toBe(true);
    fireEvent.click(screen.getByText("cerrar"));
    expect(api.current!.sponsorMarkers).toBe(false);
  });

  it("has no markers when the Sponsor panel was never opened", () => {
    const { api } = renderWithDesign(<div />);
    expect(api.current!.sponsorMarkers).toBe(false);
  });

  it("numbers each card with the same number its marker has", () => {
    renderWithDesign(<SponsorPanel />);
    const numbered = ["Abdomen", "Manga izquierda", "Manga derecha", "Espalda baja"].map((label, i) => [label, String(i + 1)]);
    for (const [label, number] of numbered) {
      expect(within(screen.getByRole("region", { name: label })).getByText(number)).toBeInTheDocument();
    }
  });

  it("highlights the card of the selected placement, and only that one", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.selectSponsor("sleeve-left"));
    expect(screen.getByRole("region", { name: "Manga izquierda" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("region", { name: "Abdomen" })).not.toHaveAttribute("aria-current");
  });

  it("forgets the selection when the panel closes", () => {
    const { api } = renderWithDesign(<PanelToggle />);
    act(() => api.current!.selectSponsor("abdomen"));
    expect(api.current!.selectedSponsor).toBe("abdomen");
    fireEvent.click(screen.getByText("cerrar"));
    expect(api.current!.selectedSponsor).toBeNull();
  });

  it("picking an empty placement selects it and opens the file chooser, in the same tap", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    const input = screen.getByLabelText("Subir sponsor: Abdomen");
    const clicked = vi.fn();
    input.addEventListener("click", clicked);
    act(() => api.current!.pickSponsor("abdomen"));
    expect(api.current!.selectedSponsor).toBe("abdomen");
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("picking a placement that already has a sponsor only selects it", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.dispatch({ type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG }));
    const input = screen.getByLabelText("Subir sponsor: Abdomen");
    const clicked = vi.fn();
    input.addEventListener("click", clicked);
    act(() => api.current!.pickSponsor("abdomen"));
    expect(api.current!.selectedSponsor).toBe("abdomen");
    expect(clicked).not.toHaveBeenCalled();
  });

  it("picking a placement does nothing more when the panel is not open", () => {
    const { api } = renderWithDesign(<div />);
    expect(() => act(() => api.current!.pickSponsor("abdomen"))).not.toThrow();
  });
});
