import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../../helpers/render-with-design";
import { StageToolbar } from "@/components/builder/viewer/StageToolbar";

describe("StageToolbar", () => {
  it("replaces undo/redo with a reset button", () => {
    renderWithDesign(<StageToolbar />);
    expect(screen.queryByRole("button", { name: "Deshacer" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rehacer" })).toBeNull();
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeInTheDocument();
  });

  it("is disabled until the design has been changed", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeEnabled();
  });

  it("stays disabled when only what is bought changed", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
  });

  it("asks for confirmation before it resets", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));

    fireEvent.click(screen.getByRole("button", { name: "Resetear diseño" }));
    expect(api.current!.state.colors.primary).toBe("#123456");

    fireEvent.click(screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" }));
    expect(api.current!.state.colors.primary).not.toBe("#123456");
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeDisabled();
  });

  it("drops the confirmation when the user clicks elsewhere", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "primary", value: "#123456" }));
    fireEvent.click(screen.getByRole("button", { name: "Resetear diseño" }));
    fireEvent.blur(screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" }));
    expect(screen.getByRole("button", { name: "Resetear diseño" })).toBeInTheDocument();
    expect(api.current!.state.colors.primary).toBe("#123456");
  });

  it("no longer offers a PNG download: sharing is the only way out", () => {
    renderWithDesign(<StageToolbar />);
    expect(screen.queryByRole("button", { name: "Descargar PNG" })).toBeNull();
  });
});

describe("shirt selector", () => {
  it("no longer floats over the shirt: it lives in the panels, next to what it changes", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("leaves no icon file that nothing uses any more", () => {
    expect(existsSync("public/icons/sections/kit-shirt.webp")).toBe(false);
  });
});
