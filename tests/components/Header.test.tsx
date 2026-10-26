import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { Header } from "@/components/builder/Header";

describe("Header", () => {
  it("shows the project name and enables both Compartir and Hacer pedido", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Nombre del diseño" })).toHaveValue("Mi diseño");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Hacer pedido" })).toBeEnabled();
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("keeps a word on the order button on a phone, not only an arrow: it is how the player moves on", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    const button = screen.getByRole("button", { name: "Hacer pedido" });
    const phoneWord = within(button).getByText("Pedido");
    // Not hidden from sight (the old label was "sr-only" below the medium breakpoint).
    expect(phoneWord.className).not.toContain("sr-only");
    expect(phoneWord.className).toContain("md:hidden");
    // The long label is for wider screens.
    expect(within(button).getByText("Hacer pedido").className).toContain("md:inline");
    expect(within(button).getByText("Hacer pedido").className).toContain("hidden");
  });

  it("says it is getting ready while it takes the photos, in both sizes", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} reviewing />);
    const button = screen.getByRole("button", { name: "Preparando…" });
    expect(within(button).getByText("Preparando…")).toBeInTheDocument();
    expect(within(button).getByTestId("order-spinner")).toBeInTheDocument();
  });

  it("calls onShare when Compartir is pressed", () => {
    const onShare = vi.fn();
    renderWithDesign(<Header onReview={() => {}} onShare={onShare} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("blocks both buttons while sharing, and Compartir while reviewing", () => {
    const { unmount } = renderWithDesign(<Header onReview={() => {}} onShare={() => {}} sharing />);
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Hacer pedido" })).toBeDisabled();
    unmount();

    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} reviewing />);
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
  });

  it("hands the current design to onReview", () => {
    const onReview = vi.fn();
    const { api } = renderWithDesign(<Header onReview={onReview} onShare={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));
    expect(onReview).toHaveBeenCalledWith(api.current!.state, api.current!.setEditing);
  });

  it("blocks double taps while reviewing", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} reviewing />);
    expect(screen.getByRole("button", { name: "Preparando…" })).toBeDisabled();
  });

  it("shows a spinner instead of the arrow, and 'Preparando…', while the order is being prepared", () => {
    const { unmount } = renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    expect(screen.queryByTestId("order-spinner")).toBeNull();
    unmount();

    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} reviewing />);
    const button = screen.getByRole("button", { name: "Preparando…" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toContainElement(screen.getByTestId("order-spinner"));
    expect(screen.queryByRole("button", { name: "Hacer pedido" })).toBeNull();
  });

  it("never hides the order button on a phone", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    const button = screen.getByRole("button", { name: "Hacer pedido" });
    // Not hidden below md (it used to be `hidden md:inline-flex`).
    expect(button.className).not.toMatch(/(^|s)hidden(s|$)/);
  });

  it("renames the project on blur", () => {
    const { api } = renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "  Los del viernes " } });
    fireEvent.blur(input);
    expect(api.current!.state.projectName).toBe("Los del viernes");
    expect(input).toHaveValue("Los del viernes");
  });

  it("restores the previous name when cleared to blank", () => {
    const { api } = renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(input).toHaveValue("Mi diseño");
    expect(api.current!.state.projectName).toBe("Mi diseño");
    expect(api.current!.canUndo).toBe(false);
  });
});
