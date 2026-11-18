import { describe, it, expect } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { StepFrame } from "@/components/builder/StepFrame";
import { OrderPanel } from "@/components/builder/panels/OrderPanel";
import type { StepId } from "@/lib/builder/steps";

const none = new Set<StepId>();

function frame(step: StepId) {
  return renderWithDesign(
    <StepFrame step={step} visited={none} onGo={() => {}}>
      <p>panel</p>
    </StepFrame>
  );
}

// The size chart is not a step: it is offered where the sizes are thought about, the garments' steps
// and the order, and it always has both charts, whatever the kit has so far.
describe("the size chart in the steps", () => {
  it("is by the title of the shirt's step, open on the shirt, with the shorts' chart too", () => {
    frame("player");
    const button = screen.getByRole("button", { name: "Ver talles" });
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(within(dialog).getByRole("tab", { name: "Camiseta" })).toHaveAttribute("aria-selected", "true");
    expect(within(dialog).getByRole("tab", { name: "Short" })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(document.activeElement).toBe(button);
  });

  it("opens on the shorts' chart in the shorts' step, even before the shorts are added", () => {
    frame("shorts");
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    expect(screen.getByRole("tab", { name: "Short" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens on the shirt's chart in the keeper's step", () => {
    frame("keeper");
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    expect(screen.getByRole("tab", { name: "Camiseta" })).toHaveAttribute("aria-selected", "true");
  });

  it("is not by the title of the crest and sponsors' step", () => {
    frame("logos");
    expect(screen.queryByRole("button", { name: "Ver talles" })).toBeNull();
  });

  it("is offered in the order step, with both charts", () => {
    renderWithDesign(<OrderPanel onGo={() => {}} onReview={() => {}} />);
    expect(screen.getByText("¿Qué talle pido?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(within(dialog).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Camiseta", "Short"]);
  });
});
