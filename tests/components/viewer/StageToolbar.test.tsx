import { describe, it, expect } from "vitest";
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
  it("only shows when the keeper is in the order", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    expect(screen.queryByRole("radiogroup", { name: "Camiseta" })).toBeNull();
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.getByRole("radio", { name: "Jugador" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches what is shown", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("radio", { name: "Arquero" }));
    expect(api.current!.editing).toBe("keeper");
    expect(screen.getByRole("radio", { name: "Arquero" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Jugador" }));
    expect(api.current!.editing).toBe("player");
  });

  it("goes back to the player when the keeper is taken out", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("radio", { name: "Arquero" }));
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    expect(api.current!.editing).toBe("player");
    expect(screen.queryByRole("radiogroup", { name: "Camiseta" })).toBeNull();
  });
});
