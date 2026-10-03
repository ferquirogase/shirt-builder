import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ViewerControls } from "@/components/builder/ViewerControls";

describe("ViewerControls", () => {
  it("shows which side is active and reports changes", () => {
    const onViewChange = vi.fn();
    render(<ViewerControls view="front" onViewChange={onViewChange} onReset={() => {}} showHint />);
    expect(screen.getByRole("button", { name: "Frente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Espalda" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Espalda" }));
    expect(onViewChange).toHaveBeenCalledWith("back");
  });

  it("calls onReset from the rotate button", () => {
    const onReset = vi.fn();
    render(<ViewerControls view="back" onViewChange={() => {}} onReset={onReset} showHint />);
    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows the drag hint only when asked", () => {
    const { rerender } = render(
      <ViewerControls view="front" onViewChange={() => {}} onReset={() => {}} showHint />
    );
    expect(screen.getByText("Arrastrá para girar")).toBeInTheDocument();
    rerender(<ViewerControls view="front" onViewChange={() => {}} onReset={() => {}} showHint={false} />);
    expect(screen.queryByText("Arrastrá para girar")).toBeNull();
  });
});
