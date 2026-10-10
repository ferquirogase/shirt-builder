import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { clearPatternMarkupCache } from "@/lib/builder/texture/pattern-thumbnail";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine } from "@/lib/checkout/order";
import { clearOrder, loadOrder, saveOrder } from "@/lib/checkout/order-storage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const captureThumbnails = vi.fn();
vi.mock("@/lib/checkout/thumbnails", () => ({
  captureThumbnails: (options: unknown) => captureThumbnails(options),
}));

const captureViews = vi.fn();
vi.mock("@/lib/builder/io/capture-views", () => ({
  captureViews: (...args: unknown[]) => captureViews(...args),
}));

const renderStory = vi.fn();
vi.mock("@/lib/share/compose-story", () => ({
  renderStory: (...args: unknown[]) => renderStory(...args),
}));

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
    clearOrder();
    push.mockReset();
    captureThumbnails.mockReset();
    captureViews.mockReset();
    renderStory.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:story");
    URL.revokeObjectURL = vi.fn();
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

  describe("mobile layout", () => {
    it("lets the 3D canvas fill the whole stage, with the buttons floating over it", () => {
      render(<BuilderPage />);
      const wrapper = screen.getByTestId("viewer").parentElement!;
      expect(wrapper.className).toContain("inset-0");
      // It used to be inset to leave room for the toolbar and the Frente/Espalda
      // buttons, which left the shirt about a fifth of the screen tall.
      expect(wrapper.className).not.toContain("top-14");
      expect(wrapper.className).not.toContain("bottom-24");
    });

    it("has a single 'Hacer pedido' button, in the header, and no extra row for it at the bottom", () => {
      render(<BuilderPage />);
      const buttons = screen.getAllByRole("button", { name: "Hacer pedido" });
      expect(buttons).toHaveLength(1);
      expect(screen.getByRole("banner")).toContainElement(buttons[0]);
    });

    it("starts with the panel open and a handle to fold it", () => {
      render(<BuilderPage />);
      const handle = screen.getByRole("button", { name: "Plegar panel" });
      expect(handle).toHaveAttribute("aria-expanded", "true");
      expect(handle).toHaveAttribute("aria-controls", "section-panel");
      expect(handle.className).toContain("md:hidden"); // the desktop column is never folded
      expect(document.getElementById("section-panel")!.className).toContain("max-md:max-h-[28dvh]");
    });

    it("folds and unfolds the panel with the handle, keeping its content mounted", () => {
      render(<BuilderPage />);
      fireEvent.click(screen.getByRole("button", { name: "Plegar panel" }));
      const handle = screen.getByRole("button", { name: "Desplegar panel" });
      expect(handle).toHaveAttribute("aria-expanded", "false");
      const panel = document.getElementById("section-panel")!;
      // Hidden from sight, tab order and screen readers on mobile only.
      expect(panel.className).toContain("max-md:invisible");
      expect(panel.className).toContain("max-md:max-h-0");
      // Still mounted, so what the user typed is not lost.
      expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();

      fireEvent.click(handle);
      expect(screen.getByRole("button", { name: "Plegar panel" })).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById("section-panel")!.className).not.toContain("max-md:invisible");
    });

    it("tapping the active tab folds the panel, and tapping another tab opens it on that section", () => {
      render(<BuilderPage />);
      const panelOpen = () => screen.getByRole("button", { name: /(Plegar|Desplegar) panel/ }).getAttribute("aria-expanded");

      fireEvent.click(screen.getByRole("button", { name: "Diseño" })); // the active one
      expect(panelOpen()).toBe("false");

      fireEvent.click(screen.getByRole("button", { name: "Colores" })); // another one
      expect(panelOpen()).toBe("true");
      expect(screen.getByRole("heading", { name: "Colores" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Colores" })); // now the active one
      expect(panelOpen()).toBe("false");
      expect(screen.getByRole("heading", { name: "Colores" })).toBeInTheDocument();
    });
  });

  it("'Hacer pedido' captures both sides, saves the order and goes to the checkout", async () => {
    captureThumbnails.mockImplementation(async ({ showView }: { showView: (side: "front" | "back") => void }) => {
      showView("back");
      return { front: "F", back: "B" };
    });
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");
    expect(loadOrder()?.thumbnails).toEqual({ front: "F", back: "B" });
    expect(loadOrder()?.roster).toHaveLength(1);
  });

  it("shows the progress on the button itself, with no extra message at the bottom", async () => {
    let finish!: (value: { front: string; back: string }) => void;
    captureThumbnails.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    expect(await screen.findByRole("button", { name: "Preparando…" })).toBeDisabled();
    expect(screen.queryByText("Preparando tu pedido…")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    finish({ front: "F", back: "B" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
  });

  it("still goes to the checkout, without thumbnails, when the capture fails", async () => {
    captureThumbnails.mockRejectedValue(new Error("tainted canvas"));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(loadOrder()?.thumbnails).toBeNull();
  });

  it("comes back from the checkout with its design and keeps the roster when reviewing again", async () => {
    captureThumbnails.mockResolvedValue({ front: "F2", back: "B2" });
    // The user already reviewed once, filled in a roster in the checkout, and
    // pressed "Editar diseño": the builder opens with that order saved.
    saveOrder({
      design: { ...initialDesignState, projectName: "Los del viernes" },
      thumbnails: { front: "F", back: "B" },
      roster: [createPlayerLine("a", { name: "Leo", number: "10" }), createPlayerLine("b", { name: "Dibu", number: "1" })],
    });
    render(<BuilderPage />);
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Nombre del diseño" })).toHaveValue("Los del viernes"));

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(loadOrder()!.roster.map((l) => l.name)).toEqual(["Leo", "Dibu"]);
    expect(loadOrder()!.thumbnails).toEqual({ front: "F2", back: "B2" });
    expect(loadOrder()!.design.projectName).toBe("Los del viernes");
  });

  it("no longer has a Descargar PNG button", () => {
    render(<BuilderPage />);
    expect(screen.queryByRole("button", { name: "Descargar PNG" })).toBeNull();
  });

  it("Compartir turns the camera, shows the story in a dialog and closes it", async () => {
    captureViews.mockImplementation(async ({ showView }: { showView: (side: "front" | "back") => void }) => {
      showView("back");
      return { front: {}, back: {} };
    });
    renderStory.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));

    const dialog = await screen.findByRole("dialog", { name: "Compartir tu camiseta" });
    expect(await within(dialog).findByAltText("Tu camiseta, lista para compartir")).toHaveAttribute("src", "blob:story");
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hands the capture a signal that is cancelled when the dialog is closed mid-capture", async () => {
    let signal: AbortSignal | undefined;
    captureViews.mockImplementation((options: { signal: AbortSignal }) => {
      signal = options.signal;
      return new Promise(() => {});
    });
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    const dialog = await screen.findByRole("dialog");
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal!.aborted).toBe(false);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(signal!.aborted).toBe(true);
  });

  it("blocks Hacer pedido while the share dialog is open", async () => {
    captureViews.mockResolvedValue({ front: {}, back: {} });
    renderStory.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Hacer pedido" })).toBeDisabled();
  });

  it("blocks Compartir while the design is being reviewed", async () => {
    captureThumbnails.mockReturnValue(new Promise(() => {}));
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled());
  });

  it("shows an error with Reintentar when the shirts cannot be captured", async () => {
    captureViews.mockResolvedValue(null);
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(await screen.findByText("No pudimos armar la imagen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("does not offer a saved indicator or the old form controls", () => {
    render(<BuilderPage />);
    expect(screen.queryByText("Guardado")).toBeNull();
    expect(screen.queryByText("Patrón de cuerpo")).toBeNull();
  });
});
