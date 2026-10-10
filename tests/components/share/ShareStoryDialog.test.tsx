import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DesignProvider } from "@/lib/builder/state/design-context";
import { ShareStoryDialog } from "@/components/share/ShareStoryDialog";
import type { ShareStoryState } from "@/lib/share/use-share-story";

const ready: ShareStoryState = { status: "ready", imageUrl: "blob:story", phrase: "Se viene el campeón" };

function setup(state: ShareStoryState, overrides: Partial<Parameters<typeof ShareStoryDialog>[0]> = {}) {
  const props = {
    state,
    onShare: vi.fn(async () => "shared" as const),
    onAnother: vi.fn(),
    onRetry: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const ui = (s: ShareStoryState) => (
    <DesignProvider>
      <ShareStoryDialog {...props} state={s} />
    </DesignProvider>
  );
  const utils = render(ui(state));
  return { ...utils, props, ui };
}

describe("ShareStoryDialog", () => {
  it("renders nothing while closed", () => {
    setup({ status: "closed" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the reveal moment while preparing: a status message, no image, and a way out", () => {
    const { props } = setup({ status: "preparing" });
    const dialog = screen.getByRole("dialog", { name: "Compartir tu camiseta" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Armando tu camiseta…");
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the image with its entrance animation and the confetti when ready", () => {
    setup(ready);
    const image = screen.getByAltText("Tu camiseta, lista para compartir");
    expect(image).toHaveAttribute("src", "blob:story");
    expect(image.className).toContain("story-in");
    const confetti = screen.getByTestId("confetti");
    expect(confetti).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Otra frase" })).toBeEnabled();
  });

  it("asks for another phrase", () => {
    const { props } = setup(ready);
    fireEvent.click(screen.getByRole("button", { name: "Otra frase" }));
    expect(props.onAnother).toHaveBeenCalledTimes(1);
  });

  it("shares with the project name, and says nothing when the native menu was used", async () => {
    const { props } = setup(ready);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(props.onShare).toHaveBeenCalledWith("Mi diseño"));
    expect(screen.queryByText(/Se descargó la imagen/)).toBeNull();
  });

  it("says the image was downloaded when it could not be shared", async () => {
    setup(ready, { onShare: vi.fn(async () => "downloaded" as const) });
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(await screen.findByText("Se descargó la imagen. Subila a tu historia desde la galería.")).toBeInTheDocument();
  });

  it("does not start a second share while one is in progress", async () => {
    let finish!: (value: "shared") => void;
    const onShare = vi.fn(() => new Promise<"shared">((resolve) => (finish = resolve)));
    setup(ready, { onShare });
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(onShare).toHaveBeenCalledTimes(1);
    finish("shared");
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled());
  });

  it("shows an error with Reintentar and Cerrar", () => {
    const { props } = setup({ status: "error" });
    expect(screen.getByText("No pudimos armar la imagen.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", () => {
    const { props } = setup(ready);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("moves the focus into the dialog, keeps Tab inside it, and gives the focus back on close", () => {
    const { rerender, ui } = setup({ status: "closed" });
    // A trigger outside the dialog, focused before it opens.
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    rerender(ui(ready));
    expect(screen.getByRole("dialog")).toHaveFocus();

    // Only the dialog's own buttons: the trigger above lives outside it.
    const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(buttons[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();

    rerender(ui({ status: "closed" }));
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe("motion", () => {
  it("plays the entrance animation and the confetti on every device, whatever the system motion setting", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).not.toContain("prefers-reduced-motion");
  });
});
