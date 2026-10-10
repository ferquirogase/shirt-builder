import { describe, it, expect } from "vitest";
import { colorName } from "@/lib/checkout/color-name";

describe("colorName", () => {
  it.each([
    ["#ffffff", "blanco"],
    ["#000000", "negro"],
    ["#ff0000", "rojo"],
    ["#0a5c36", "verde oscuro"],
    ["#f5b700", "dorado"],
    ["#1a2a55", "azul marino"],
  ])("calls %s %s", (hex, name) => {
    expect(colorName(hex)).toBe(name);
  });

  it("accepts upper case and falls back to a neutral word for a value that is not a color", () => {
    expect(colorName("#FFFFFF")).toBe("blanco");
    expect(colorName("nope")).toBe("un color");
  });
});
