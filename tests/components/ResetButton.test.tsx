import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { ResetButton } from "@/components/builder/ResetButton";

describe("ResetButton", () => {
  it("replaces undo/redo with a reset button", () => {
    renderWithDesign(<ResetButton />);
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rehacer" })).toBeNull();
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeInTheDocument();
  });

  it("is disabled until the design has been changed", () => {
    const { api } = renderWithDesign(<ResetButton />);
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeEnabled();
  });

  it("stays disabled when only what is bought changed", () => {
    const { api } = renderWithDesign(<ResetButton />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
  });

  it("asks for confirmation before it resets", () => {
    const { api } = renderWithDesign(<ResetButton />);
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));

    fireEvent.click(screen.getByRole("button", { name: "Resetear diseño" }));
    expect(api.current!.state.colors.primary).toBe("#123456");

    fireEvent.click(screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" }));
    expect(api.current!.state.colors.primary).not.toBe("#123456");
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
  });

  it("drops the confirmation when the user clicks elsewhere", () => {
    const { api } = renderWithDesign(<ResetButton />);
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));
    fireEvent.click(screen.getByRole("button", { name: "Resetear diseño" }));
    fireEvent.blur(screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeInTheDocument();
    expect(api.current!.state.colors.primary).toBe("#123456");
  });

  it("no longer offers a PNG download: sharing is the only way out", () => {
    renderWithDesign(<ResetButton />);
    expect(screen.queryByRole("button", { name: "Descargar PNG" })).toBeNull();
  });
});

describe("where the reset lives", () => {
  it("no longer floats over the shirt, where a tap meant to turn it could reset the design", () => {
    expect(existsSync("components/builder/viewer/StageToolbar.tsx")).toBe(false);
  });

  it("shows only its icon on a phone until it asks for confirmation", () => {
    const { api } = renderWithDesign(<ResetButton />);
    const button = screen.getByRole("button", { name: "Resetear diseño" });
    expect(within(button).getByText("Resetear").className).toContain("hidden md:inline");

    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));
    fireEvent.click(button);
    const armed = screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" });
    expect(within(armed).getByText("¿Seguro?").className).not.toContain("hidden");
  });

  it("leaves no icon file that nothing uses any more", () => {
    expect(existsSync("public/icons/sections/kit-shirt.webp")).toBe(false);
  });
});
