import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ColorField } from "@/components/builder/panels/ColorField";
import { PALETTE } from "@/lib/builder/color/palette";

const base = { label: "Color primario", value: "#0a5c36", open: false, onOpenChange: () => {}, onChange: () => {} };

describe("ColorField", () => {
  it("shows the label, the name of the color and its CMYK on a button", () => {
    render(<ColorField {...base} />);
    const button = screen.getByRole("button", { name: "Color primario: Verde" });
    expect(button).toHaveTextContent("Color primario");
    expect(button).toHaveTextContent("Verde");
    expect(button).toHaveTextContent(/C \d+ M \d+ Y \d+ K \d+/);
  });

  it("does not show the hexadecimal", () => {
    render(<ColorField {...base} />);
    expect(screen.getByRole("button")).not.toHaveTextContent("#");
  });

  it("shows the swatch of the current color", () => {
    render(<ColorField {...base} />);
    const swatch = screen.getByRole("button").querySelector("[data-current-swatch]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("rgb(10, 92, 54)");
  });

  it("is closed to begin with, and says so", () => {
    render(<ColorField {...base} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("asks to open when it is pressed, and to close when it is pressed open", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<ColorField {...base} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    rerender(<ColorField {...base} open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Color primario/ }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("opens into the whole palette, one swatch per color, named", () => {
    render(<ColorField {...base} open />);
    const group = screen.getByRole("radiogroup", { name: "Color primario" });
    const swatches = within(group).getAllByRole("radio");
    expect(swatches).toHaveLength(PALETTE.length);
    expect(swatches.map((s) => s.getAttribute("aria-label"))).toEqual(PALETTE.map((c) => c.name));
    expect(screen.getByRole("button", { name: /Color primario/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("marks the current color, and only that one", () => {
    render(<ColorField {...base} open />);
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();
    expect(screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
  });

  it("matches the current color whatever the case of its hexadecimal", () => {
    render(<ColorField {...base} value="#0A5C36" open />);
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();
  });

  it("marks none for a color that is not on the palette, and calls it another color", () => {
    render(<ColorField {...base} value="#123456" open />);
    expect(screen.getByRole("button", { name: /Color primario: Otro color/ })).toBeInTheDocument();
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("picks a color: reports its hexadecimal and closes", () => {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(<ColorField {...base} open onChange={onChange} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Rojo" }));
    expect(onChange).toHaveBeenCalledWith(PALETTE.find((c) => c.name === "Rojo")!.hex);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("makes every swatch at least 44px to tap", () => {
    render(<ColorField {...base} open />);
    for (const swatch of screen.getAllByRole("radio")) {
      expect(swatch.className).toMatch(/h-11/);
      expect(swatch.className).toMatch(/w-11/);
    }
  });

  it("lays the swatches out in a grid that wraps, so it fits a phone", () => {
    render(<ColorField {...base} open />);
    expect(screen.getByRole("radiogroup").className).toMatch(/grid/);
  });

  it("offers no free color picker: the palette is closed", () => {
    const { container } = render(<ColorField {...base} open />);
    expect(container.querySelector('input[type="color"]')).toBeNull();
  });
});
