import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AiTryOn } from "@/components/checkout/AiTryOn";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, type Order } from "@/lib/checkout/order";
import { clearDesignImages, saveDesignImages } from "@/lib/checkout/order-storage";

const order: Order = {
  design: { ...initialDesignState, projectName: "Los del viernes" },
  thumbnails: null,
  roster: [createPlayerLine("a", { name: "LEO", number: "10" })],
};

const writeText = vi.fn();

beforeEach(() => {
  clearDesignImages();
  window.sessionStorage.clear();
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});

function open() {
  fireEvent.click(screen.getByText("Probátela con tu IA favorita"));
}

describe("AiTryOn", () => {
  it("starts closed and opens on the title", () => {
    render(<AiTryOn order={order} />);
    expect(screen.getByRole("group")).not.toHaveAttribute("open");
    open();
    expect(screen.getByRole("group")).toHaveAttribute("open");
  });

  it("explains the steps without naming a brand", () => {
    render(<AiTryOn order={order} />);
    open();
    expect(screen.getByText(/Adjuntá las imágenes y una foto/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/chatgpt|openai/i);
  });

  it("shows an example prompt built from the design that the user can edit", () => {
    render(<AiTryOn order={order} />);
    open();
    const box = screen.getByRole("textbox", { name: "Prompt de ejemplo" }) as HTMLTextAreaElement;
    expect(box.value).toContain("verde oscuro");
    expect(box.value).toContain("LEO");
    fireEvent.change(box, { target: { value: "otro texto" } });
    expect(box.value).toBe("otro texto");
  });

  it("copies what is in the box and says so", async () => {
    render(<AiTryOn order={order} />);
    open();
    fireEvent.change(screen.getByRole("textbox", { name: "Prompt de ejemplo" }), { target: { value: "mi prompt" } });
    fireEvent.click(screen.getByRole("button", { name: "Copiar prompt" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("mi prompt"));
    expect(await screen.findByRole("button", { name: "¡Copiado!" })).toBeInTheDocument();
  });

  it("offers the big images as downloads, front and back", () => {
    saveDesignImages({ front: "data:image/jpeg;base64,FF", back: "data:image/jpeg;base64,BB" });
    render(<AiTryOn order={order} />);
    open();
    const front = screen.getByRole("link", { name: /Descargar frente/ });
    const back = screen.getByRole("link", { name: /Descargar espalda/ });
    expect(front).toHaveAttribute("href", "data:image/jpeg;base64,FF");
    expect(front).toHaveAttribute("download", "los-del-viernes-frente.jpg");
    expect(back).toHaveAttribute("download", "los-del-viernes-espalda.jpg");
  });

  it("says the images are missing, and still offers the prompt, when they could not be made", () => {
    render(<AiTryOn order={order} />);
    open();
    expect(screen.queryByRole("link", { name: /Descargar/ })).toBeNull();
    expect(screen.getByText(/No pudimos preparar las imágenes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar prompt" })).toBeInTheDocument();
  });
});
