import { describe, it, expect } from "vitest";
import { formatCmyk, hexToCmyk } from "@/lib/builder/color/cmyk";

describe("hexToCmyk", () => {
  it("converts the pure colors", () => {
    expect(hexToCmyk("#000000")).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(hexToCmyk("#ffffff")).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    expect(hexToCmyk("#ff0000")).toEqual({ c: 0, m: 100, y: 100, k: 0 });
    expect(hexToCmyk("#00ff00")).toEqual({ c: 100, m: 0, y: 100, k: 0 });
    expect(hexToCmyk("#0000ff")).toEqual({ c: 100, m: 100, y: 0, k: 0 });
  });

  it("converts a mixed color, rounding to whole percents", () => {
    // 0x12 0x34 0x56 -> k = 1 - 86/255, then each channel over what is left.
    expect(hexToCmyk("#123456")).toEqual({ c: 79, m: 40, y: 0, k: 66 });
  });

  it("accepts upper case and the three-digit form", () => {
    expect(hexToCmyk("#FF0000")).toEqual(hexToCmyk("#ff0000"));
    expect(hexToCmyk("#f00")).toEqual(hexToCmyk("#ff0000"));
  });

  it("gives null for something that is not a color", () => {
    expect(hexToCmyk("rojo")).toBeNull();
    expect(hexToCmyk("#12345")).toBeNull();
    expect(hexToCmyk("")).toBeNull();
  });
});

describe("formatCmyk", () => {
  it("writes the four values, in percent, in the order C M Y K", () => {
    expect(formatCmyk("#ff0000")).toBe("C 0 M 100 Y 100 K 0");
    expect(formatCmyk("#123456")).toBe("C 79 M 40 Y 0 K 66");
  });

  it("is empty for something that is not a color", () => {
    expect(formatCmyk("nope")).toBe("");
  });
});
