import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { DesignPanel } from "@/components/builder/panels/DesignPanel";
import { ColorsPanel } from "@/components/builder/panels/ColorsPanel";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";
import { TextPanel } from "@/components/builder/panels/TextPanel";
import { GarmentsPanel } from "@/components/builder/panels/GarmentsPanel";
import { clearPatternMarkupCache } from "@/lib/builder/texture/pattern-thumbnail";
import { loadImage } from "@/lib/builder/texture/image-loader";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { PALETTE } from "@/lib/builder/color/palette";
import { formatCmyk } from "@/lib/builder/color/cmyk";

// jsdom never decodes images, so the crest's "can this actually be drawn?"
// check is driven by this mock.
vi.mock("@/lib/builder/texture/image-loader", () => ({ loadImage: vi.fn() }));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

// Opens a color's palette and taps one of its colors, as a player does.
function pickColor(label: string, color: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${escaped}:`) }));
  fireEvent.click(screen.getByRole("radio", { name: color }));
}
const hexOf = (name: string) => PALETTE.find((c) => c.name === name)!.hex;

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
    pickColor("Color primario", "Rojo");
    pickColor("Color secundario", "Verde claro");
    expect(api.current!.state.colors.primary).toBe(hexOf("Rojo"));
    expect(api.current!.state.colors.secondary).toBe(hexOf("Verde claro"));
  });

  it("opens one color's palette at a time, and closes it once a color is picked", () => {
    renderWithDesign(<ColorsPanel />);
    expect(screen.queryByRole("radiogroup", { name: "Color primario" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Color primario:/ }));
    expect(screen.getByRole("radiogroup", { name: "Color primario" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Color secundario:/ }));
    expect(screen.queryByRole("radiogroup", { name: "Color primario" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Color secundario" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Rojo" }));
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("offers no free color picker: only the palette", () => {
    const { container } = renderWithDesign(<ColorsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /^Color primario:/ }));
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });
  it("shows each color in CMYK and by name, and no longer in hexadecimal", () => {
    renderWithDesign(<ColorsPanel />);
    pickColor("Color primario", "Rojo");
    pickColor("Color del cuello", "Azul marino");
    expect(screen.getByText(formatCmyk(hexOf("Rojo")))).toBeInTheDocument();
    expect(screen.getByText(formatCmyk(hexOf("Azul marino")))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Color primario: Rojo" })).toBeInTheDocument();
    expect(screen.queryByText(/#[0-9a-f]{6}/i)).toBeNull();
  });
  it("updates the collar color on its own, leaving the pattern colors alone", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const before = { ...api.current!.state.colors };
    pickColor("Color del cuello", "Azul");
    expect(api.current!.state.colors).toEqual({ ...before, collar: hexOf("Azul") });
  });
  it("shows only the colors the chosen patterns use, plus the collar", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const field = (label: string) => screen.queryByRole("button", { name: new RegExp(`^${label}:`) });
    // initial: stripes-v1 + sleeve-plain -> primary, secondary
    expect(field("Color primario")).not.toBeNull();
    expect(field("Color secundario")).not.toBeNull();
    expect(field("Color del cuello")).not.toBeNull();

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-primary" }));
    // plain-body + sleeve-primary -> primary only
    expect(field("Color primario")).not.toBeNull();
    expect(field("Color secundario")).toBeNull();
    expect(field("Color del cuello")).not.toBeNull();
  });
  it("does not duplicate a role used by both the torso and the sleeves (Review Focus 2)", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "stripes-three" }));
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-accent" }));
    // stripes-three and sleeve-accent both use accent, with different labels: the torso's wins
    expect(screen.getAllByRole("button", { name: /^Línea fina:/ })).toHaveLength(1);
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

describe("TextPanel, the number on the chest", () => {
  it("offers a switch for it, off to begin with", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.getByRole("switch", { name: "Número en el pecho" })).toHaveAttribute("aria-checked", "false");
  });

  it("switches it on and off", () => {
    const { api } = renderWithDesign(<TextPanel />);
    const toggle = screen.getByRole("switch", { name: "Número en el pecho" });
    fireEvent.click(toggle);
    expect(api.current!.state.chestNumber).toBe(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(api.current!.state.chestNumber).toBe(false);
  });

  it("says it takes the place of sponsor 1", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.getByText(/en lugar del sponsor 1/i)).toBeInTheDocument();
  });

  it("says where the number and the name go: on the back, and the number on the shorts too", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.getByText(/el número también va en el short/i)).toBeInTheDocument();
  });
});

describe("TextPanel", () => {
  it("shows the example name and number in the fields while they are empty", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("placeholder", "NOMBRE");
    expect(screen.getByLabelText("Número")).toHaveAttribute("placeholder", "10");
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Número")).toHaveValue("");
  });

  it("makes keyboard focus visible on the text fields", () => {
    renderWithDesign(<TextPanel />);
    for (const name of ["Nombre", "Número"]) {
      expect(screen.getByLabelText(name).className).toContain("focus-visible:ring-2");
    }
  });

  it("offers no choice of typeface: it is Clásico only", () => {
    renderWithDesign(<TextPanel />);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByText("Moderno")).toBeNull();
    expect(screen.queryByText("Clásico")).toBeNull();
  });

  it("starts with the border on, in black, and lets it be switched off, and the text color be set", () => {
    const { api } = renderWithDesign(<TextPanel />);
    expect(screen.getByLabelText("Borde")).toBeChecked();
    expect(screen.getByRole("button", { name: "Color del borde: Negro" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Borde"));
    expect(api.current!.state.nameNumberStyle.outline).toBe(false);
    pickColor("Color del texto", "Verde claro");
    expect(api.current!.state.nameNumberStyle.fill).toBe(hexOf("Verde claro"));
  });
  it("offers the border's color only while there is a border, and sets it", () => {
    const { api } = renderWithDesign(<TextPanel />);
    pickColor("Color del borde", "Rosa");
    expect(api.current!.state.nameNumberStyle.outlineColor).toBe(hexOf("Rosa"));
    expect(api.current!.state.nameNumberStyle.outline).toBe(true);
    fireEvent.click(screen.getByLabelText("Borde"));
    expect(screen.queryByRole("button", { name: /^Color del borde:/ })).toBeNull();
    // Switching the border off keeps the color for when it is switched on again.
    expect(api.current!.state.nameNumberStyle.outlineColor).toBe(hexOf("Rosa"));
    fireEvent.click(screen.getByLabelText("Borde"));
    expect(screen.getByRole("button", { name: "Color del borde: Rosa" })).toBeInTheDocument();
  });

  it("opens the text color and the border color one at a time", () => {
    renderWithDesign(<TextPanel />);
    fireEvent.click(screen.getByRole("button", { name: /^Color del texto:/ }));
    expect(screen.getByRole("radiogroup", { name: "Color del texto" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Color del borde:/ }));
    expect(screen.queryByRole("radiogroup", { name: "Color del texto" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "Color del borde" })).toBeInTheDocument();
  });
  it("no longer offers shadow or outline width", () => {
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

  it("lists the nine placements in GEPE's order, each with an upload control and nothing else yet", () => {
    renderWithDesign(<SponsorPanel />);
    // The panel's own wrapper is a region too ("Sponsor"); the cards are what we count.
    const names = screen
      .getAllByRole("region")
      .map((r) => r.getAttribute("aria-label"))
      .filter((name) => name !== "Sponsor");
    expect(names).toEqual(["Pecho", "Abdomen", "Cintura", "Manga derecha", "Manga izquierda", "Espalda alta", "Espalda baja", "Pecho alto derecho", "Pecho alto izquierdo"]);
    // The nape is reserved for the GEPE logo.
    expect(screen.queryByLabelText("Subir sponsor: Nuca")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Quitar sponsor/ })).toBeNull();
  });

  it("uploads to the chosen placement only", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Espalda baja", png());
    await waitFor(() => expect(api.current!.state.sponsors["lower-back"]?.dataUrl).toMatch(/^data:image\/png/));
    expect(api.current!.state.sponsors["lower-back"]!.scale).toBe(1);
    expect(Object.keys(api.current!.state.sponsors)).toEqual(["lower-back"]);
  });

  it("shows the preview, the scale control and remove only for a placement that has an image", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Pecho", png());
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    expect(screen.getByRole("img", { name: "Sponsor de Pecho" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tamaño del sponsor: Pecho")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar sponsor: Pecho" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Tamaño del sponsor: Espalda baja")).toBeNull();
    expect(screen.getAllByRole("slider")).toHaveLength(1);
  });

  it("limits the scale control to 50%..150%", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Pecho", png());
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    const slider = screen.getByLabelText("Tamaño del sponsor: Pecho");
    expect(slider).toHaveAttribute("min", "0.5");
    expect(slider).toHaveAttribute("max", "1.5");
    fireEvent.change(slider, { target: { value: "1.3" } });
    expect(api.current!.state.sponsors.abdomen!.scale).toBe(1.3);
  });

  it("replaces an image keeping the chosen scale", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Pecho", png("a.png"));
    await waitFor(() => expect(api.current!.state.sponsors.abdomen).toBeDefined());
    fireEvent.change(screen.getByLabelText("Tamaño del sponsor: Pecho"), { target: { value: "1.4" } });
    const first = api.current!.state.sponsors.abdomen!.dataUrl;
    upload("Pecho", new File(["different"], "b.png", { type: "image/png" }));
    await waitFor(() => expect(api.current!.state.sponsors.abdomen!.dataUrl).not.toBe(first));
    expect(api.current!.state.sponsors.abdomen!.scale).toBe(1.4);
  });

  it("removes a sponsor", async () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Espalda baja", png());
    await waitFor(() => expect(api.current!.state.sponsors["lower-back"]).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Quitar sponsor: Espalda baja" }));
    expect(api.current!.state.sponsors["lower-back"]).toBeUndefined();
    expect(screen.queryByRole("button", { name: "Quitar sponsor: Espalda baja" })).toBeNull();
  });

  it("rejects a file of the wrong type, and shows the error only in that card (Review Focus 4)", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    upload("Espalda baja", new File(["x"], "doc.pdf", { type: "application/pdf" }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(/PNG, JPG o SVG/);
    expect(screen.getByRole("region", { name: "Espalda baja" })).toContainElement(alerts[0]);
    expect(api.current!.state.sponsors).toEqual({});
  });

  it("rejects a file over 2 MB", () => {
    renderWithDesign(<SponsorPanel />);
    upload("Pecho", new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" }));
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
    upload("Pecho", new File(["a"], "a.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(1));
    upload("Pecho", new File(["b"], "b.png", { type: "image/png" }));
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
    upload("Pecho", new File(["a"], "a.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(1));
    upload("Espalda baja", new File(["b"], "b.png", { type: "image/png" }));
    await waitFor(() => expect(pending).toHaveLength(2));
    pending[0].resolve();
    pending[1].resolve();
    await waitFor(() => expect(Object.keys(api.current!.state.sponsors).sort()).toEqual(["abdomen", "lower-back"]));
  });

  it("makes keyboard focus visible on every upload control", () => {
    renderWithDesign(<SponsorPanel />);
    for (const label of ["Pecho", "Abdomen", "Cintura", "Manga derecha", "Manga izquierda", "Espalda alta", "Espalda baja", "Pecho alto derecho", "Pecho alto izquierdo"]) {
      const control = screen.getByLabelText(`Subir sponsor: ${label}`).closest("label");
      expect(control?.className).toContain("focus-within:ring-2");
    }
  });
});

describe("GarmentsPanel, the size guide", () => {
  it("has a Ver talles button on the same row as the question of what to buy, in view without scrolling", () => {
    renderWithDesign(<GarmentsPanel />);
    const button = screen.getByRole("button", { name: "Ver talles" });
    const row = button.parentElement as HTMLElement;
    expect(within(row).getByText("¿Qué querés comprar?")).toBeInTheDocument();
    expect(button.className).toMatch(/h-11/);
  });

  it("opens GEPE's chart of the shirt, and gives the focus back to the button when it closes", () => {
    renderWithDesign(<GarmentsPanel />);
    const button = screen.getByRole("button", { name: "Ver talles" });
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(within(dialog).getByRole("img", { name: /camiseta/i })).toBeInTheDocument();
    expect(within(dialog).queryByRole("tab", { name: "Short" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("adds the shorts' chart once the kit has shorts", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Short" }));
    expect((within(dialog).getByRole("img", { name: /corto|short/i }) as HTMLImageElement).getAttribute("src")).toBe("/talles/short.webp");
  });

  it("is drawn over the whole page, not inside the panel: the panel's blur would cut it to the panel's size", () => {
    const { container } = renderWithDesign(<GarmentsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("changes nothing of what is bought by being opened and closed", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    const before = api.current!.state;
    fireEvent.click(screen.getByRole("button", { name: "Ver talles" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(api.current!.state).toBe(before);
    expect(screen.getByRole("radio", { name: "Solo camiseta" })).toBeChecked();
  });
});

describe("GarmentsPanel", () => {
  it("asks what to buy, with the price per player on each option", () => {
    renderWithDesign(<GarmentsPanel />);
    expect(screen.getByText("¿Qué querés comprar?")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Solo camiseta" })).toHaveAccessibleDescription(/35/);
    expect(screen.getByRole("radio", { name: "Camiseta + short" })).toHaveAccessibleDescription(/55/);
    expect(screen.getByRole("radio", { name: "Camiseta + short" })).toHaveAccessibleDescription(/por jugador/);
  });

  it("starts as shirt only", () => {
    renderWithDesign(<GarmentsPanel />);
    expect(screen.getByRole("radio", { name: "Solo camiseta" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Camiseta + short" })).not.toBeChecked();
  });

  it("switches to shirt and shorts and back", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Camiseta + short" }));
    expect(api.current!.state.shorts.included).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Solo camiseta" }));
    expect(api.current!.state.shorts.included).toBe(false);
  });

  it("no longer asks for the shorts' color: that lives in Colores", () => {
    renderWithDesign(<GarmentsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Camiseta + short" }));
    expect(screen.queryByText("Color del short")).toBeNull();
    expect(screen.queryByRole("radio", { name: /Color primario/ })).toBeNull();
  });
});

describe("ColorsPanel shorts color", () => {
  const withShorts = () => {
    const utils = renderWithDesign(<ColorsPanel />);
    act(() => utils.api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    return utils;
  };

  it("is not offered when only the shirt is bought", () => {
    renderWithDesign(<ColorsPanel />);
    expect(screen.queryByText("Color del short")).toBeNull();
    expect(screen.queryByRole("radio", { name: /Color primario/ })).toBeNull();
  });

  it("asks which shirt color the shorts wear, primary by default", () => {
    withShorts();
    expect(screen.getByText("Color del short")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Color primario/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Color secundario/ })).not.toBeChecked();
  });

  it("picks the secondary color for the shorts", () => {
    const { api } = withShorts();
    fireEvent.click(screen.getByRole("radio", { name: /Color secundario/ }));
    expect(api.current!.state.shorts.colorSource).toBe("secondary");
    expect(screen.getByRole("radio", { name: /Color secundario/ })).toBeChecked();
  });

  it("shows each option with the shirt's current color, in CMYK, without the hexadecimal", () => {
    const { api } = withShorts();
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "secondary", value: "#123456" }));
    const radio = screen.getByRole("radio", { name: /Color secundario/ });
    expect(radio).toHaveTextContent("C 79 M 40 Y 0 K 66");
    expect(radio).not.toHaveTextContent("#");
    const swatch = screen.getByRole("radio", { name: /Color secundario/ }).querySelector("[data-swatch]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("rgb(18, 52, 86)");
  });
});

describe("keeper in the panels", () => {
  it("adds the keeper from Prendas", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    const toggle = screen.getByRole("switch", { name: "Sumar camiseta de arquero" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(api.current!.state.keeper.included).toBe(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("Diseño and Colores edit the keeper's shirt while it is shown", () => {
    const { api } = renderWithDesign(
      <>
        <DesignPanel />
        <ColorsPanel />
      </>
    );
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.setEditing("keeper"));
    expect(screen.getAllByText("Editando la camiseta del arquero").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.keeper.look!.bodyPatternId).toBe("diagonal");
    expect(api.current!.state.bodyPatternId).toBe(initialDesignState.bodyPatternId);

    pickColor("Color primario", "Marrón");
    expect(api.current!.state.keeper.look!.colors.primary).toBe(hexOf("Marrón"));
    expect(api.current!.state.colors.primary).toBe(initialDesignState.colors.primary);
  });
  it("hides the shorts color while the keeper is shown, since the shorts follow the team", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.getByText("Color del short")).toBeInTheDocument();
    act(() => api.current!.setEditing("keeper"));
    expect(screen.queryByText("Color del short")).toBeNull();
  });

  it("gives the keeper its own text color in Texto", () => {
    const { api } = renderWithDesign(<TextPanel />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.setEditing("keeper"));
    pickColor("Color del texto (arquero)", "Fucsia");
    expect(api.current!.state.keeper.nameNumberFill).toBe(hexOf("Fucsia"));
    expect(api.current!.state.nameNumberStyle.fill).toBe(initialDesignState.nameNumberStyle.fill);
  });
});

describe("crest creator", () => {
  it("puts a first crest on the shirt when there is none", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    expect(api.current!.state.crestConfig).toEqual(INITIAL_CREST);
    expect(api.current!.state.logoDataUrl).toBe(crestDataUrl(INITIAL_CREST));
  });

  it("leaves an uploaded crest alone until the creator is used", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    act(() => api.current!.dispatch({ type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" }));
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    expect(api.current!.state.logoDataUrl).toBe("data:image/png;base64,AAAA");
    expect(api.current!.state.crestConfig).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Forma 3" }));
    expect(api.current!.state.crestConfig?.shapeId).toBe(CREST_SHAPES[2].id);
    expect(api.current!.state.logoDataUrl).toBe(crestDataUrl(api.current!.state.crestConfig!));
  });

  it("chooses shape, background, colors and symbol", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));

    fireEvent.click(screen.getByRole("radio", { name: "Forma 7" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mitad" }));
    fireEvent.change(screen.getByLabelText("Color principal del escudo"), { target: { value: "#112233" } });
    fireEvent.change(screen.getByLabelText("Color secundario del escudo"), { target: { value: "#ffcc00" } });
    fireEvent.click(screen.getByRole("radio", { name: "Estrella" }));

    expect(api.current!.state.crestConfig).toEqual({
      shapeId: CREST_SHAPES[6].id,
      divisionId: "half",
      colors: { primary: "#112233", secondary: "#ffcc00" },
      symbol: { kind: "icon", id: "star" },
    });
  });

  it("takes initials, cleaned and limited to three", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("radio", { name: "Iniciales" }));
    fireEvent.change(screen.getByLabelText("Iniciales"), { target: { value: "a b<c>d" } });
    expect(api.current!.state.crestConfig?.symbol).toEqual({ kind: "initials", text: "ABC" });
    fireEvent.click(screen.getByRole("radio", { name: "Sin símbolo" }));
    expect(api.current!.state.crestConfig?.symbol).toBeNull();
  });

  it("removes the made crest", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(api.current!.state.crestConfig).toBeNull();
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("goes back to the upload tab when the crest is removed from the creator", () => {
    renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(screen.getByRole("tab", { name: "Subir el mío" })).toHaveAttribute("aria-selected", "true");
  });

  it("goes back to the upload tab when the uploaded crest is removed while the creator is open", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    act(() => api.current!.dispatch({ type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" }));
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(screen.getByRole("tab", { name: "Subir el mío" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens the creator again when an undo brings the made crest back", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("tab", { name: "Subir el mío" }));
    act(() => api.current!.dispatch({ type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" }));
    expect(screen.getByRole("tab", { name: "Subir el mío" })).toHaveAttribute("aria-selected", "true");

    act(() => api.current!.dispatch({ type: "UNDO" }));
    expect(screen.getByRole("tab", { name: "Crear escudo" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens on the upload tab by default", () => {
    renderWithDesign(<CrestPanel />);
    expect(screen.getByRole("tab", { name: "Subir el mío" })).toHaveAttribute("aria-selected", "true");
  });
});
