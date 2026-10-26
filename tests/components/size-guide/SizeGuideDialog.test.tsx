import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { SizeGuideDialog } from "@/components/size-guide/SizeGuideDialog";

function Harness({ withShorts = false, onClose = () => {} }: { withShorts?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>abrir</button>
      <SizeGuideDialog
        open={open}
        withShorts={withShorts}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    </>
  );
}

const open = () => fireEvent.click(screen.getByText("abrir"));

describe("SizeGuideDialog", () => {
  it("shows nothing while it is closed", () => {
    render(<SizeGuideDialog open={false} withShorts={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is drawn in the body of the page, so no ancestor can cut it down to its own size", () => {
    const { container } = render(<Harness />);
    open();
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(container.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("is a modal dialog named Guía de talles", () => {
    render(<Harness />);
    open();
    const dialog = screen.getByRole("dialog", { name: "Guía de talles" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("shows the shirt's chart", () => {
    render(<Harness />);
    open();
    const image = screen.getByRole("img", { name: /camiseta/i }) as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/talles/camiseta.webp");
  });

  it("has no tabs when the order has only shirts", () => {
    render(<Harness withShorts={false} />);
    open();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("has a tab for the shirt and one for the shorts when the order has both, shirt first", () => {
    render(<Harness withShorts />);
    open();
    const tabs = within(screen.getByRole("tablist", { name: "Prenda" })).getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Camiseta", "Short"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("switches to the shorts' chart and back", () => {
    render(<Harness withShorts />);
    open();
    fireEvent.click(screen.getByRole("tab", { name: "Short" }));
    expect((screen.getByRole("img", { name: /corto|short/i }) as HTMLImageElement).getAttribute("src")).toBe("/talles/short.webp");
    expect(screen.getByRole("tab", { name: "Short" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Camiseta" }));
    expect((screen.getByRole("img", { name: /camiseta/i }) as HTMLImageElement).getAttribute("src")).toBe("/talles/camiseta.webp");
  });

  it("starts on the shirt each time it is opened", () => {
    render(<Harness withShorts />);
    open();
    fireEvent.click(screen.getByRole("tab", { name: "Short" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    open();
    expect(screen.getByRole("tab", { name: "Camiseta" })).toHaveAttribute("aria-selected", "true");
  });

  it("links to the picture at full size, to zoom in on a phone, in a new tab", () => {
    render(<Harness />);
    open();
    const link = screen.getByRole("link", { name: /tamaño completo/i });
    expect(link).toHaveAttribute("href", "/talles/camiseta.webp");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toMatch(/noopener/);
  });

  it("closes with the Cerrar button", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes with Escape", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the dark area around it is tapped, but not when the chart is", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    open();
    fireEvent.click(screen.getByRole("img", { name: /camiseta/i }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("size-guide-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes the focus when it opens and gives it back to what opened it", () => {
    render(<Harness />);
    const opener = screen.getByText("abrir");
    opener.focus();
    open();
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(document.activeElement).toBe(opener);
  });

  it("keeps Tab inside the dialog", () => {
    render(<Harness withShorts />);
    open();
    const dialog = screen.getByRole("dialog");
    const items = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"));
    const last = items[items.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("has a close button and tabs at least 44px tall to tap", () => {
    render(<Harness withShorts />);
    open();
    expect(screen.getByRole("button", { name: "Cerrar" }).className).toMatch(/h-11/);
    for (const tab of screen.getAllByRole("tab")) expect(tab.className).toMatch(/h-11/);
  });
});
