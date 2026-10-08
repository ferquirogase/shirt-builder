import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { DesignPanel } from "@/components/builder/panels/DesignPanel";
import { ColorsPanel } from "@/components/builder/panels/ColorsPanel";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";
import { TextPanel } from "@/components/builder/panels/TextPanel";
import { clearPatternMarkupCache } from "@/lib/builder/pattern-thumbnail";
import { loadImage } from "@/lib/builder/image-loader";

// jsdom never decodes images, so the crest's "can this actually be drawn?"
// check is driven by this mock.
vi.mock("@/lib/builder/image-loader", () => ({ loadImage: vi.fn() }));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

beforeEach(() => {
  vi.mocked(loadImage).mockResolvedValue({} as HTMLImageElement);
  clearPatternMarkupCache();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
});
afterEach(() => vi.unstubAllGlobals());

describe("DesignPanel", () => {
  it("picks a torso pattern, then switches to the sleeves tab", async () => {
    const { api } = renderWithDesign(<DesignPanel />);
    expect(screen.getByText("Elegí un patrón para el torso.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.bodyPatternId).toBe("diagonal");

    fireEvent.click(screen.getByRole("tab", { name: "Mangas" }));
    expect(screen.getByText("Elegí un patrón para las mangas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Con puño" }));
    expect(api.current!.state.sleevePatternId).toBe("sleeve-cuff");
    await waitFor(() => expect(document.querySelector('[data-thumb="loaded"]')).not.toBeNull());
  });

  it("draws an accent design's thumbnail with the design's own accent, not the stale one (Fix 1)", async () => {
    const accentSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="accent" fill="#000"/></svg>`;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => accentSvg })));
    renderWithDesign(<DesignPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Mangas" }));
    const radio = screen.getByRole("radio", { name: "Mangas de otro color" });
    await waitFor(() => expect(radio.querySelector('[data-thumb="loaded"]')).not.toBeNull());
    const style = (radio.querySelector('[data-thumb="loaded"]') as HTMLElement).style.backgroundImage;
    const decoded = decodeURIComponent(style);
    expect(decoded).toContain("#1a2a55");
    expect(decoded).not.toContain("#f5b700");
  });

  it("offers the sleeve designs that use the accent color", async () => {
    const { api } = renderWithDesign(<DesignPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Mangas" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mangas de otro color" }));
    expect(api.current!.state.sleevePatternId).toBe("sleeve-accent");
    await waitFor(() => expect(document.querySelector('[data-thumb="loaded"]')).not.toBeNull());
  });
});

describe("ColorsPanel", () => {
  it("updates primary and secondary colors", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    fireEvent.change(screen.getByLabelText("Color primario"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Color secundario"), { target: { value: "#00ff00" } });
    expect(api.current!.state.colors.primary).toBe("#ff0000");
    expect(api.current!.state.colors.secondary).toBe("#00ff00");
  });

  it("updates the collar color on its own, leaving the pattern colors alone", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const before = { ...api.current!.state.colors };
    fireEvent.change(screen.getByLabelText("Color del cuello"), { target: { value: "#0000ff" } });
    expect(api.current!.state.colors).toEqual({ ...before, collar: "#0000ff" });
  });

  it("shows only the colors the chosen patterns use, plus the collar", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    // initial: stripes-v1 + sleeve-plain -> primary, secondary
    expect(screen.queryByLabelText("Color primario")).not.toBeNull();
    expect(screen.queryByLabelText("Color secundario")).not.toBeNull();
    expect(screen.queryByLabelText("Color del cuello")).not.toBeNull();

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-primary" }));
    // plain-body + sleeve-primary -> primary only
    expect(screen.queryByLabelText("Color primario")).not.toBeNull();
    expect(screen.queryByLabelText("Color secundario")).toBeNull();
    expect(screen.queryByLabelText("Color del cuello")).not.toBeNull();
  });

  it("does not duplicate a role used by both the torso and the sleeves (Review Focus 2)", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "stripes-three" }));
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-accent" }));
    // stripes-three and sleeve-accent both use accent, with different labels: the torso's wins
    expect(screen.getAllByLabelText("Línea fina")).toHaveLength(1);
    expect(screen.queryByLabelText("Color de las mangas")).toBeNull();
    expect(screen.getAllByLabelText("Franja principal")).toHaveLength(1);
    expect(screen.getAllByLabelText("Franja alterna")).toHaveLength(1);
  });
});

describe("CrestPanel", () => {
  it("rejects a file of the wrong type with an inline message and leaves state unchanged", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/PNG, JPG o SVG/);
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("rejects a file over 2 MB", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [big] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/2 MB/);
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("stores a valid image as a data URL and can remove it", async () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const ok = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [ok] } });
    await waitFor(() => expect(api.current!.state.logoDataUrl).toMatch(/^data:image\/png/));
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("reports an image that passes the type check but cannot be decoded, without touching the design", async () => {
    vi.mocked(loadImage).mockRejectedValue(new Error("decode failed"));
    const { api } = renderWithDesign(<CrestPanel />);
    const broken = new File(["not really a png"], "broken.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [broken] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo leer la imagen.");
    expect(api.current!.state.logoDataUrl).toBeNull();
    expect(api.current!.canUndo).toBe(false);
  });

  it("keeps the most recent upload when an older one finishes decoding last", async () => {
    const pending: Array<{ src: string; resolve: () => void }> = [];
    vi.mocked(loadImage).mockImplementation(
      (src: string) =>
        new Promise<HTMLImageElement>((resolve) => {
          pending.push({ src, resolve: () => resolve({} as HTMLImageElement) });
        })
    );
    const { api } = renderWithDesign(<CrestPanel />);
    const input = screen.getByLabelText("Subir escudo");

    fireEvent.change(input, { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(input, { target: { files: [new File(["b"], "b.png", { type: "image/png" })] } });
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1].resolve();
    await waitFor(() => expect(api.current!.state.logoDataUrl).toBe(pending[1].src));
    pending[0].resolve();
    await new Promise((r) => setTimeout(r, 20));
    expect(api.current!.state.logoDataUrl).toBe(pending[1].src);
  });

  it("makes keyboard focus visible on the upload control", () => {
    renderWithDesign(<CrestPanel />);
    const label = screen.getByLabelText("Subir escudo").closest("label");
    expect(label?.className).toContain("focus-within:ring-2");
  });
});

describe("TextPanel", () => {
  it("makes keyboard focus visible on the text fields", () => {
    renderWithDesign(<TextPanel />);
    for (const name of ["Nombre", "Número"]) {
      expect(screen.getByLabelText(name).className).toContain("focus-visible:ring-2");
    }
  });

  it("offers only the Clásico and Moderno typefaces and marks the current one", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Clásico" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Moderno" })).toHaveAttribute("aria-checked", "false");
  });

  it("switches the typeface without touching color or border", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.change(screen.getByLabelText("Color del texto"), { target: { value: "#ff0000" } });
    fireEvent.click(screen.getByLabelText("Borde"));
    fireEvent.click(screen.getByRole("radio", { name: "Moderno" }));
    expect(api.current!.state.nameNumberStyle).toEqual({ presetId: "modern", fill: "#ff0000", outline: true });
    expect(screen.getByRole("radio", { name: "Moderno" })).toHaveAttribute("aria-checked", "true");
  });

  it("toggles the border and sets the text color", () => {
    const { api } = renderWithDesign(<TextPanel />);
    expect(screen.getByLabelText("Borde")).not.toBeChecked();
    fireEvent.click(screen.getByLabelText("Borde"));
    expect(api.current!.state.nameNumberStyle.outline).toBe(true);
    fireEvent.change(screen.getByLabelText("Color del texto"), { target: { value: "#00ff00" } });
    expect(api.current!.state.nameNumberStyle.fill).toBe("#00ff00");
  });

  it("no longer offers shadow, outline color or outline width", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.queryByLabelText("Sombra")).toBeNull();
    expect(screen.queryByLabelText("Color del contorno")).toBeNull();
    expect(screen.queryByLabelText("Grosor del contorno")).toBeNull();
  });

  it("uppercases the name and keeps only two digits of the number", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "perez" } });
    fireEvent.change(screen.getByLabelText("Número"), { target: { value: "1a0" } });
    expect(api.current!.state.playerName).toBe("PEREZ");
    expect(api.current!.state.playerNumber).toBe("10");
    expect(screen.getByLabelText("Número")).toHaveAttribute("maxlength", "2");
  });
});

describe("SponsorPanel", () => {
  const upload = (label: string, file: File) =>
    fireEvent.change(screen.getByLabelText(`Subir sponsor: ${label}`), { target: { files: [file] } });
  const png = (name = "logo.png") => new File(["x"], name, { type: "image/png" });

  it("lists the five placements in order, each with an upload control and nothing else yet", () => {
    renderWithDesign(<SponsorPanel />);
    // The panel's own wrapper is a region too ("Sponsor"); the cards are what we count.
    const names = screen
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label"))
      .filter((name) => name !== "Sponsor");
    expect(names).toEqual(["Abdomen", "Manga izquierda", "Manga derecha", "Nuca", "Espalda baja"]);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Quitar sponsor/ })).toBeNull();
  });

  it("uploads to the chosen placement only", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Nuca", png());
    await waitFor(() => expect(api.current!.state.sponsors.nape?.dataUrl).toMatch(/^data:image\/png/));
    expect(api.current!.state.sponsors.nape!.scale).toBe(1);
    expect(Object.keys(api.current!.state.sponsors)).toEqual(["nape"]);
  });

  it("shows the preview, the scale control and remove only for a placement that has an image", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Abdomen", png());
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    expect(screen.getByRole("img", { name: "Sponsor de Abdomen" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tamaño del sponsor: Abdomen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar sponsor: Abdomen" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tamaño del sponsor: Nuca")).toBeNull();
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("limits the scale control to 50%..150%", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Abdomen", png());
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    const slider = screen.getByLabelText("Tamaño del sponsor: Abdomen");
    expect(slider).toHaveAttribute("min", "0.5");
    expect(slider).toHaveAttribute("max", "1.5");
    fireEvent.change(slider, { target: { value: "1.3" } });
    expect(api.current!.state.sponsors.abdomen!.scale).toBe(1.3);
  });

  it("replaces an image keeping the chosen scale", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Abdomen", png("a.png"));
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    fireEvent.change(screen.getByLabelText("Tamaño del sponsor: Abdomen"), { target: { value: "1.4" } });
    const first = api.current!.state.sponsors.abdomen!.dataUrl;
    upload("Abdomen", new File(["different"], "b.png", { type: "image/png" }));
    await waitFor(() => expect(api.current!.state.sponsors.abdomen!.dataUrl).not.toBe(first));
    expect(api.current!.state.sponsors.abdomen!.scale).toBe(1.4);
  });

  it("removes a sponsor", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Nuca", png());
    await waitFor(() => expect(api.current!.state.sponsors.nape).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Quitar sponsor: Nuca" }));
    expect(api.current!.state.sponsors.nape).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Quitar sponsor: Nuca" })).toBeNull();
  });

  it("rejects a file of the wrong type, and shows the error only in that card (Review Focus 4)", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Nuca", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(/PNG, JPG o SVG/);
    expect(screen.getByRole("region", { name: "Nuca" })).toContainElement(alerts[0]);
    expect(api.current!.state.sponsors).toEqual({});
  });

  it("rejects a file over 2 MB", () => {
    renderWithDesign(<SponsorPanel />);
    upload("Abdomen", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/2 MB/);
  });

  it("reports an image that cannot be decoded without touching the design", async () => {
    vi.mocked(loadImage).mockRejectedValue(new Error("decode failed"));
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Manga izquierda", png("broken.png"));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo leer la imagen.");
    expect(api.current!.state.sponsors).toEqual({});
    expect(api.current!.canUndo).toBe(false);
  });

  it("keeps the latest upload to a placement when an older one finishes decoding last (Review Focus 4)", async () => {
    const pending: Array<{ src: string; resolve: () => void }> = [];
    vi.mocked(loadImage).mockImplementation(
      (src: string) =>
        new Promise<HTMLImageElement>((resolve) => {
          pending.push({ src, resolve: () => resolve({} as HTMLImageElement) });
        })
    );
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Abdomen", new File(["a"], "a.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(1));
    upload("Abdomen", new File(["b"], "b.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1].resolve();
    await waitFor(() => expect(api.current!.state.sponsors.abdomen?.dataUrl).toBe(pending[1].src));
    pending[0].resolve();
    await new Promise((r) => setTimeout(r, 20));
    expect(api.current!.state.sponsors.abdomen!.dataUrl).toBe(pending[1].src);
  });

  it("does not let an upload to one placement cancel another's", async () => {
    const pending: Array<{ src: string; resolve: () => void }> = [];
    vi.mocked(loadImage).mockImplementation(
      (src: string) =>
        new Promise<HTMLImageElement>((resolve) => {
          pending.push({ src, resolve: () => resolve({} as HTMLImageElement) });
        })
    );
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Abdomen", new File(["a"], "a.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(1));
    upload("Nuca", new File(["b"], "b.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[0].resolve();
    pending[1].resolve();
    await waitFor(() => expect(Object.keys(api.current!.state.sponsors).sort()).toEqual(["abdomen", "nape"]));
  });

  it("makes keyboard focus visible on every upload control", () => {
    renderWithDesign(<SponsorPanel />);
    for (const label of ["Abdomen", "Manga izquierda", "Manga derecha", "Nuca", "Espalda baja"]) {
      const control = screen.getByLabelText(`Subir sponsor: ${label}`).closest("label");
      expect(control?.className).toContain("focus-within:ring-2");
    }
  });
});
