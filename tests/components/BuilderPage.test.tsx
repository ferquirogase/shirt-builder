import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { clearPatternMarkupCache } from "@/lib/builder/texture/pattern-thumbnail";

// jsdom has no WebGL: replace the 3D stage with a stub that exposes its props.
vi.mock("@/components/builder/viewer/Viewer3D", async () => {
  const React = await import("react");
  return {
    Viewer3D: React.forwardRef<HTMLCanvasElement, { view: string; resetPose: boolean }>(function Viewer3DStub(
      { view, resetPose },
      ref
    ) {
      return <canvas ref={ref} data-testid="viewer" data-view={view} data-reset={String(resetPose)} />;
    }),
  };
});

import { BuilderPage } from "@/components/builder/BuilderPage";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

describe("BuilderPage", () => {
  beforeEach(() => {
    clearPatternMarkupCache();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the Diseño panel first and switches sections", () => {
    render(<BuilderPage />);
    expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Colores" }));
    expect(screen.getByRole("heading", { name: "Colores" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nombre y número" }));
    expect(screen.getByRole("heading", { name: "Nombre y número" })).toBeInTheDocument();
  });

  it("switches the viewer between Frente and Espalda and back with the reset button", () => {
    render(<BuilderPage />);
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "front");
    expect(screen.getByText("Arrastrá para girar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Espalda" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");

    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "front");
  });

  it("restores zoom and tilt only for the reset button, not for Frente/Espalda", () => {
    render(<BuilderPage />);
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-reset", "false");

    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-reset", "true");

    fireEvent.click(screen.getByRole("button", { name: "Espalda" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-reset", "false");
  });

  it("does not offer a saved indicator or the old form controls", () => {
    render(<BuilderPage />);
    expect(screen.queryByText("Guardado")).toBeNull();
    expect(screen.queryByText("Patrón de cuerpo")).toBeNull();
  });
});
