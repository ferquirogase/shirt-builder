import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { clearPatternMarkupCache } from "@/lib/builder/texture/pattern-thumbnail";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine } from "@/lib/checkout/order";
import { forgetSplash, markSplashSeen } from "@/lib/builder/splash";
import { loadDraft, saveDraft } from "@/lib/builder/state/design-draft";
import { SPLASH_FADE_MS, SPLASH_MAX_MS } from "@/lib/builder/splash";
import { DRAFT_NOTICE_MS } from "@/components/builder/DraftKeeper";
import {
  clearDesignImages,
  clearKeeperDesignImages,
  clearOrder,
  loadDesignImages,
  loadKeeperDesignImages,
  loadOrder,
  saveDesignImages,
  saveKeeperDesignImages,
  saveOrder,
} from "@/lib/checkout/order-storage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const captureDesignImages = vi.fn();
vi.mock("@/lib/checkout/thumbnails", () => ({
  captureDesignImages: (options: unknown) => captureDesignImages(options),
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
  const { useDesign } = await import("@/lib/builder/state/design-context");
  return {
    Viewer3D: React.forwardRef<HTMLCanvasElement, { view: string; resetPose: boolean }>(function Viewer3DStub(
      { view, resetPose },
      ref
    ) {
      const { editing } = useDesign();
      return <canvas ref={ref} data-testid="viewer" data-view={view} data-reset={String(resetPose)} data-editing={editing} />;
    }),
  };
});

import { BuilderPage } from "@/components/builder/BuilderPage";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

describe("BuilderPage", () => {
  beforeEach(() => {
    clearOrder();
    clearDesignImages();
    clearKeeperDesignImages();
    // The splash has its own tests: here the page has already shown it.
    markSplashSeen();
    push.mockReset();
    captureDesignImages.mockReset();
    captureViews.mockReset();
    renderStory.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:story");
    URL.revokeObjectURL = vi.fn();
    clearPatternMarkupCache();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens on the player's shirt, with the keeper and the shorts to add, and switches entries", () => {
    render(<BuilderPage />);
    expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Camiseta" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "Arquero" })).toHaveTextContent("Opcional");
    expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("Opcional");

    fireEvent.click(screen.getByRole("tab", { name: "Colores" }));
    expect(screen.getByRole("heading", { name: "Colores" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Escudo y sponsors" }));
    expect(screen.getByRole("heading", { name: "Escudo" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Short" }));
    expect(screen.getByRole("button", { name: "Sumar short" })).toBeInTheDocument();
  });

  describe("steps", () => {
    // Two of them, one for a phone (in the panel's title row) and one for wider screens (at its bottom).
    const next = () => fireEvent.click(screen.getAllByRole("button", { name: /^Siguiente/ })[0]);
    const current = () =>
      screen.getByRole("navigation", { name: "Etapas" }).querySelector('[aria-current="step"]')!.getAttribute("aria-label");

    it("says which step this is, of how many, at the top of the panel", () => {
      render(<BuilderPage />);
      expect(screen.getByText("Paso 1 de 5")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
      expect(screen.getByText("Paso 3 de 5")).toBeInTheDocument();
    });

    it("goes on from the shirt to the shorts with Siguiente, and ticks the shirt as done", () => {
      render(<BuilderPage />);
      expect(screen.getAllByRole("button", { name: "Siguiente: Short" })).toHaveLength(2);
      next();
      expect(current()).toBe("Short");
      expect(within(screen.getByRole("button", { name: "Camiseta" })).getByTestId("step-badge")).toHaveAttribute("data-status", "done");
    });

    it("asks whether to add the shorts: adding them shows their panel, leaving them out goes on to the keeper", () => {
      render(<BuilderPage />);
      next();
      fireEvent.click(screen.getByRole("button", { name: "Seguir sin short" }));
      expect(current()).toBe("Arquero");
      expect(screen.getByRole("button", { name: "Short" })).toHaveTextContent("No sumado");

      fireEvent.click(screen.getByRole("button", { name: "Short" }));
      fireEvent.click(screen.getByRole("button", { name: "Sumar short" }));
      expect(screen.getByRole("tab", { name: "Diseño" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Siguiente: Arquero" })).toHaveLength(2);
    });

    it("leaves the keeper out the same way and goes on to crest and sponsors, which have a tab each", () => {
      render(<BuilderPage />);
      fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
      fireEvent.click(screen.getByRole("button", { name: "Seguir sin arquero" }));
      expect(current()).toBe("Escudo y sponsors");
      expect(screen.getByRole("heading", { name: "Escudo" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("tab", { name: "Sponsors" }));
      expect(screen.getByRole("heading", { name: "Sponsor" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "Siguiente: Pedido" })).toHaveLength(2);
    });

    it("ends on a summary of the kit, with a way back to each step and the order button", async () => {
      captureDesignImages.mockResolvedValue({ thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } });
      render(<BuilderPage />);
      fireEvent.click(screen.getByRole("button", { name: "Pedido" }));
      const summary = screen.getByRole("list", { name: "Tu equipo" });
      expect(within(summary).getByText("Camiseta")).toBeInTheDocument();
      expect(within(summary).getByText("Short")).toBeInTheDocument();
      expect(within(summary).getAllByText("No sumado")).toHaveLength(2); // shorts and keeper
      expect(within(summary).getByText("Sin escudo")).toBeInTheDocument();
      expect(within(summary).getByText("Sin sponsors")).toBeInTheDocument();
      expect(screen.queryAllByRole("button", { name: /^Siguiente/ })).toHaveLength(0);

      fireEvent.click(within(summary).getByRole("button", { name: "Sumar Short" }));
      expect(current()).toBe("Short");

      fireEvent.click(screen.getByRole("button", { name: "Pedido" }));
      const panel = document.getElementById("section-panel")!;
      fireEvent.click(within(panel).getByRole("button", { name: "Hacer pedido" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    });
  });

  describe("autosave", () => {
    const current = () =>
      screen.getByRole("navigation", { name: "Etapas" }).querySelector('[aria-current="step"]')!.getAttribute("aria-label");

    it("keeps the design, the open step and the steps done across a reload, and says it brought them back", async () => {
      const first = render(<BuilderPage />);
      fireEvent.click(screen.getByRole("radio", { name: "Rayas" }));
      fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
      fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));
      await waitFor(() => expect(loadDraft()?.step).toBe("keeper"));
      first.unmount();

      render(<BuilderPage />);
      expect(await screen.findByRole("status")).toHaveTextContent("Recuperamos tu diseño");
      expect(current()).toBe("Arquero");
      expect(screen.getByTestId("viewer")).toHaveAttribute("data-editing", "keeper");
      expect(within(screen.getByRole("button", { name: "Camiseta" })).getByTestId("step-badge")).toHaveAttribute("data-status", "done");
      expect(loadDraft()?.design.bodyPatternId).toBe("molde-03");
    });

    it("opens as new, with no notice, when nothing was saved", async () => {
      render(<BuilderPage />);
      await waitFor(() => expect(loadDraft()).not.toBeNull()); // it starts saving once it has looked
      expect(screen.queryByRole("status")).toBeNull();
      expect(current()).toBe("Camiseta");
    });

    it("opens the draft rather than an order's design: the draft is the newer one", async () => {
      saveOrder({
        design: { ...initialDesignState, playerName: "ORDER" },
        thumbnails: null,
        roster: [createPlayerLine("p1")],
      });
      saveDraft({ design: { ...initialDesignState, playerName: "DRAFT" }, step: "logos", visited: ["player"] });
      render(<BuilderPage />);
      expect(await screen.findByRole("status")).toHaveTextContent("Recuperamos tu diseño");
      expect(current()).toBe("Escudo y sponsors");
      await waitFor(() => expect(loadDraft()?.design.playerName).toBe("DRAFT"));
    });

    it("waits for the splash to go before saying it brought the design back, so it is not missed", () => {
      vi.useFakeTimers();
      try {
        forgetSplash();
        saveDraft({ design: { ...initialDesignState, bodyPatternId: "molde-03" }, step: "player", visited: [] });
        render(<BuilderPage />);
        act(() => vi.advanceTimersByTime(DRAFT_NOTICE_MS + 100));
        expect(screen.queryByText("Recuperamos tu diseño")).toBeNull();
        act(() => vi.advanceTimersByTime(SPLASH_MAX_MS)); // the splash starts to fade
        act(() => vi.advanceTimersByTime(SPLASH_FADE_MS)); // and is gone
        expect(screen.getByText("Recuperamos tu diseño")).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("forgets the design when it is reset", async () => {
      saveDraft({ design: { ...initialDesignState, bodyPatternId: "molde-03" }, step: "player", visited: [] });
      render(<BuilderPage />);
      await screen.findByRole("status");
      fireEvent.click(screen.getByRole("button", { name: "Resetear diseño" }));
      fireEvent.click(screen.getByRole("button", { name: "¿Seguro? Se pierden los cambios" }));
      await waitFor(() => expect(loadDraft()?.design.bodyPatternId).toBe(initialDesignState.bodyPatternId));
    });
  });

  it("shows the keeper's shirt in the viewer once it is added from its own entry", () => {
    render(<BuilderPage />);
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-editing", "player");
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-editing", "keeper");
    expect(screen.getByRole("button", { name: "Arquero" })).toHaveTextContent("Sumado");
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
      expect(document.getElementById("section-panel")!.className).toContain("max-md:max-h-[34dvh]");
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

      fireEvent.click(screen.getByRole("button", { name: "Camiseta" })); // the active one
      expect(panelOpen()).toBe("false");

      fireEvent.click(screen.getByRole("button", { name: "Escudo y sponsors" })); // another one
      expect(panelOpen()).toBe("true");
      expect(screen.getByRole("heading", { name: "Escudo" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Escudo y sponsors" })); // now the active one
      expect(panelOpen()).toBe("false");
      expect(screen.getByRole("heading", { name: "Escudo" })).toBeInTheDocument();
    });
  });

  it("'Hacer pedido' captures both sides, saves the order and goes to the checkout", async () => {
    captureDesignImages.mockImplementation(async ({ showView }: { showView: (side: "front" | "back") => void }) => {
      showView("back");
      return { thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } };
    });
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");
    expect(loadOrder()?.thumbnails).toEqual({ front: "F", back: "B" });
    expect(loadDesignImages()).toEqual({ front: "FF", back: "BB" });
    expect(loadOrder()?.roster).toHaveLength(1);
  });

  const playerShots = { thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } };
  const keeperShots = { thumbnails: { front: "KF", back: "KB" }, images: { front: "KFF", back: "KBB" } };

  it("also photographs the keeper's shirt when the keeper is in the design, then goes back to the player", async () => {
    captureDesignImages.mockResolvedValueOnce(playerShots).mockResolvedValueOnce(keeperShots);
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(captureDesignImages).toHaveBeenCalledTimes(2);
    expect(loadOrder()?.keeperThumbnails).toEqual({ front: "KF", back: "KB" });
    expect(loadDesignImages()).toEqual({ front: "FF", back: "BB" });
    expect(loadKeeperDesignImages()).toEqual({ front: "KFF", back: "KBB" });
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-editing", "player");
  });

  it("photographs the player's shirt as the player's even when the viewer was showing the keeper", async () => {
    const playerShownWhenPhotographed: string[] = [];
    captureDesignImages.mockImplementation(async () => {
      // The real capture waits for the camera before it reads the canvas: let the viewer repaint.
      await new Promise((resolve) => setTimeout(resolve, 0));
      playerShownWhenPhotographed.push(screen.getByTestId("viewer").getAttribute("data-editing") ?? "");
      return playerShots;
    });
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    // First the player's shirt, then the keeper's.
    expect(playerShownWhenPhotographed).toEqual(["player", "keeper"]);
  });

  it("does not photograph a keeper when there is none, and drops the old keeper images", async () => {
    saveKeeperDesignImages({ front: "OLD", back: "OLD" });
    captureDesignImages.mockResolvedValue(playerShots);
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(captureDesignImages).toHaveBeenCalledTimes(1);
    expect(loadOrder()?.keeperThumbnails).toBeNull();
    expect(loadKeeperDesignImages()).toBeNull();
  });

  it("goes to the checkout without the keeper's photos when taking them fails", async () => {
    captureDesignImages.mockResolvedValueOnce(playerShots).mockRejectedValueOnce(new Error("tainted canvas"));
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Arquero" }));
    fireEvent.click(screen.getByRole("button", { name: "Sumar camiseta de arquero" }));

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(loadOrder()?.keeperThumbnails).toBeNull();
    expect(loadKeeperDesignImages()).toBeNull();
    expect(loadOrder()?.thumbnails).toEqual({ front: "F", back: "B" });
  });

  it("shows the progress on the button itself, with no extra message at the bottom", async () => {
    let finish!: (value: unknown) => void;
    captureDesignImages.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    expect(await screen.findByRole("button", { name: "Preparando…" })).toBeDisabled();
    expect(screen.queryByText("Preparando tu pedido…")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();

    finish({ thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
  });

  it("still goes to the checkout, without images, when the capture fails, dropping old big images", async () => {
    saveDesignImages({ front: "OLD", back: "OLD" });
    captureDesignImages.mockRejectedValue(new Error("tainted canvas"));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(loadOrder()?.thumbnails).toBeNull();
    expect(loadDesignImages()).toBeNull();
  });

  it("comes back from the checkout with its design and keeps the roster when reviewing again", async () => {
    captureDesignImages.mockResolvedValue({ thumbnails: { front: "F2", back: "B2" }, images: { front: "FF2", back: "BB2" } });
    // The user already reviewed once, filled in a roster in the checkout, and
    // pressed "Editar diseño": the builder opens with that order saved.
    saveOrder({
      design: { ...initialDesignState, projectName: "Los del viernes" },
      thumbnails: { front: "F", back: "B" },
      roster: [createPlayerLine("a", { name: "Leo", number: "10" }), createPlayerLine("b", { name: "Dibu", number: "1" })],
    });
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hacer pedido" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/checkout", { transitionTypes: ["nav-forward"] }));
    expect(loadOrder()!.roster.map((l) => l.name)).toEqual(["Leo", "Dibu"]);
    expect(loadOrder()!.thumbnails).toEqual({ front: "F2", back: "B2" });
    expect(loadOrder()!.design.projectName).toBe("Los del viernes");
  });

  it("covers the builder with the splash on the first visit, and keeps the builder out of reach meanwhile", () => {
    forgetSplash();
    const { container } = render(<BuilderPage />);
    expect(screen.getByRole("status", { name: "Cargando GEPE" })).toBeInTheDocument();
    expect(container.querySelector("[inert]")).not.toBeNull();
  });

  it("goes straight to the builder when the splash was already shown", () => {
    const { container } = render(<BuilderPage />);
    expect(screen.queryByRole("status", { name: "Cargando GEPE" })).toBeNull();
    expect(container.querySelector("[inert]")).toBeNull();
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
    captureDesignImages.mockReturnValue(new Promise(() => {}));
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
