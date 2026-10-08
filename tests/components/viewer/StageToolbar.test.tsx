import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../../helpers/render-with-design";
import { StageToolbar } from "@/components/builder/viewer/StageToolbar";

describe("StageToolbar", () => {
  it("disables undo/redo until there is history, then undoes and redoes", () => {
    const { api } = renderWithDesign(<StageToolbar onDownload={() => {}} />);
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rehacer" })).toBeDisabled();

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(api.current!.state.bodyPatternId).not.toBe("plain-body");
    expect(screen.getByRole("button", { name: "Rehacer" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
  });

  it("calls onDownload", () => {
    const onDownload = vi.fn();
    renderWithDesign(<StageToolbar onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
