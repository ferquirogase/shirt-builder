import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { DesignPanel } from "@/components/builder/panels/DesignPanel";
import { ColorsPanel } from "@/components/builder/panels/ColorsPanel";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";
import { TextPanel } from "@/components/builder/panels/TextPanel";
import { clearPatternMarkupCache } from "@/lib/builder/texture/pattern-thumbnail";
import { loadImage } from "@/lib/builder/texture/image-loader";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { NAME_NUMBER_PRESETS } from "@/lib/builder/catalog/name-number-presets";
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
  it("picks a torso pattern", () => {
    const { api } = renderWithDesign(<DesignPanel />);
    expect(screen.getByText("Elegí un patrón para el torso.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.bodyPatternId).toBe("diagonal");
  });

  it("has no tabs of its own, and nothing to choose for the sleeves: they are set in Colores", () => {
    renderWithDesign(<DesignPanel />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("radio", { name: /manga|puño/i })).toBeNull();
  });

  it("draws an accent design's thumbnail with the design's own accent, not the stale one (Fix 1)", async () => {
    const accentSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="accent" fill="#000"/></svg>`;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => accentSvg })));
    renderWithDesign(<DesignPanel />);
    const radio = screen.getByRole("radio", { name: "Franjas en tres colores" });
    await waitFor(() => expect(radio.querySelector('[data-thumb="loaded"]')).not.toBeNull());
    const style = (radio.querySelector('[data-thumb="loaded"]') as HTMLElement).style.backgroundImage;
    const decoded = decodeURIComponent(style);
    expect(decoded).toContain("#0b1d4a");
    expect(decoded).not.toContain("#f5b700");
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
    // the sleeves follow the primary, so they show the red too
    expect(screen.getAllByText(formatCmyk(hexOf("Rojo"))).length).toBeGreaterThanOrEqual(1);
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
  it("shows the torso's colors, the collar and the sleeves, each under its own heading", () => {
    renderWithDesign(<ColorsPanel />);
    const group = (name: string) => screen.getByRole("region", { name });
    expect(within(group("Torso")).getAllByRole("button").map((b) => b.getAttribute("aria-label") ?? b.textContent)).toEqual([
      expect.stringMatching(/^Color primario:/),
      expect.stringMatching(/^Color secundario:/),
    ]);
    expect(within(group("Cuello")).getByRole("button", { name: /^Color del cuello:/ })).toBeInTheDocument();
    expect(within(group("Mangas")).getByRole("button", { name: /^Color de las mangas:/ })).toBeInTheDocument();
    expect(within(group("Mangas")).getByRole("button", { name: /^Color de la franja:/ })).toBeInTheDocument();
  });

  it("shows only the torso colors the chosen pattern uses, but always the collar and the sleeves", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const field = (label: string) => screen.queryByRole("button", { name: new RegExp(`^${label}:`) });
    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(field("Color primario")).not.toBeNull();
    expect(field("Color secundario")).toBeNull();
    expect(field("Color del cuello")).not.toBeNull();
    expect(field("Color de las mangas")).not.toBeNull();
    expect(field("Color de la franja")).not.toBeNull();
  });

  it("changes the sleeve and its stripe on their own", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const before = { ...api.current!.state.colors };
    pickColor("Color de las mangas", "Azul");
    pickColor("Color de la franja", "Rojo");
    expect(api.current!.state.colors).toEqual({ ...before, sleeve: hexOf("Azul"), sleeveTrim: hexOf("Rojo") });
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

  it("offers the ten typefaces, each shown in its own letters, and chooses one", () => {
    const { api } = renderWithDesign(<TextPanel />);
    const group = screen.getByRole("radiogroup", { name: "Tipografía" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(NAME_NUMBER_PRESETS.length);
    expect(within(group).getByRole("radio", { name: "Bloque" })).toHaveAttribute("aria-checked", "true");

    const angosta = within(group).getByRole("radio", { name: "Angosta" });
    expect(angosta.querySelector("[data-font-sample]")).toHaveStyle({ fontFamily: "var(--font-nn-angosta)" });
    fireEvent.click(angosta);
    expect(api.current!.state.nameNumberStyle.presetId).toBe("angosta");
    expect(angosta).toHaveAttribute("aria-checked", "true");
  });

  it("warns that a typeface without a Ñ prints an N, only when the name has one", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Angosta" }));
    expect(screen.queryByText(/no tiene Ñ/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "muñoz" } });
    expect(screen.getByText("Esta tipografía no tiene Ñ: se imprime N.")).toBeInTheDocument();
    act(() => api.current!.dispatch({ type: "SET_NN_PRESET", id: "bloque" }));
    expect(screen.queryByText(/no tiene Ñ/)).toBeNull();
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

describe("keeper in the panels", () => {
  it("Diseño and Colores edit the keeper's shirt while it is shown", () => {
    const { api } = renderWithDesign(
      <>
        <DesignPanel />
        <ColorsPanel />
      </>
    );
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.setEditing("keeper"));

    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.keeper.look!.bodyPatternId).toBe("diagonal");
    expect(api.current!.state.bodyPatternId).toBe(initialDesignState.bodyPatternId);

    pickColor("Color primario", "Marrón");
    expect(api.current!.state.keeper.look!.colors.primary).toBe(hexOf("Marrón"));
    expect(api.current!.state.colors.primary).toBe(initialDesignState.colors.primary);
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
