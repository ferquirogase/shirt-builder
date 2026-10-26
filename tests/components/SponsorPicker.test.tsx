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
    const numbered = ["Pecho", "Abdomen", "Cintura", "Manga derecha", "Manga izquierda", "Espalda alta", "Espalda baja", "Pecho alto derecho", "Pecho alto izquierdo"].map((label, i) => [label, String(i + 1)]);
    for (const [label, number] of numbered) {
      expect(within(screen.getByRole("region", { name: label })).getByText(number)).toBeInTheDocument();
    }
  });

  it("takes the upper back away when the player has a name, and the cards after it move up", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    expect(screen.getByRole("region", { name: "Espalda alta" })).toBeInTheDocument();
    act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "PEREZ" }));
    expect(screen.queryByRole("region", { name: "Espalda alta" })).toBeNull();
    // Espalda baja was 7 and is now 6; the two upper chest ones were 8 and 9.
    expect(within(screen.getByRole("region", { name: "Espalda baja" })).getByText("6")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Pecho alto izquierdo" })).getByText("8")).toBeInTheDocument();
  });

  it("keeps the sponsor of the upper back while the name hides it, and gives it back with the name gone", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.dispatch({ type: "SET_SPONSOR", slot: "upper-back", dataUrl: IMG }));
    act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "PEREZ" }));
    expect(screen.queryByRole("region", { name: "Espalda alta" })).toBeNull();
    expect(api.current!.state.sponsors["upper-back"]?.dataUrl).toBe(IMG);
    act(() => api.current!.dispatch({ type: "SET_PLAYER_NAME", value: "" }));
    expect(screen.getByRole("img", { name: "Sponsor de Espalda alta" })).toBeInTheDocument();
  });

  it("adds the three cards of the shorts, numbered 10 to 12, only when the kit has shorts", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    for (const label of ["Short atrás izquierda", "Short atrás derecha", "Short frente"]) {
      expect(screen.queryByRole("region", { name: label })).toBeNull();
    }
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    const numbered = ["Short atrás izquierda", "Short atrás derecha", "Short frente"].map((label, i) => [label, String(10 + i)]);
    for (const [label, number] of numbered) {
      expect(within(screen.getByRole("region", { name: label })).getByText(number)).toBeInTheDocument();
    }
  });

  it("keeps a shorts sponsor when the shorts are taken off, and gives it back when they return", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_SPONSOR", slot: "shorts-front-right", dataUrl: IMG }));
    expect(screen.getByRole("img", { name: "Sponsor de Short frente" })).toBeInTheDocument();
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: false }));
    expect(screen.queryByRole("region", { name: "Short frente" })).toBeNull();
    expect(api.current!.state.sponsors["shorts-front-right"]?.dataUrl).toBe(IMG);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("img", { name: "Sponsor de Short frente" })).toBeInTheDocument();
  });

  it("highlights the card of the selected placement, and only that one", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.selectSponsor("sleeve-left"));
    expect(screen.getByRole("region", { name: "Manga izquierda" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("region", { name: "Pecho" })).not.toHaveAttribute("aria-current");
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
    const input = screen.getByLabelText("Subir sponsor: Pecho");
    const clicked = vi.fn();
    input.addEventListener("click", clicked);
    act(() => api.current!.pickSponsor("abdomen"));
    expect(api.current!.selectedSponsor).toBe("abdomen");
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it("picking a placement that already has a sponsor only selects it", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    act(() => api.current!.dispatch({ type: "SET_SPONSOR", slot: "abdomen", dataUrl: IMG }));
    const input = screen.getByLabelText("Subir sponsor: Pecho");
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
