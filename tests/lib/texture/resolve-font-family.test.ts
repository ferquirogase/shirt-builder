import { describe, it, expect, afterEach } from "vitest";
import { resolveFontFamily } from "@/lib/builder/texture/resolve-font-family";

afterEach(() => document.documentElement.style.removeProperty("--font-test"));

describe("resolveFontFamily", () => {
  it("returns the variable's font list followed by the fallback", () => {
    document.documentElement.style.setProperty("--font-test", "'Oswald', 'Oswald Fallback'");
    expect(resolveFontFamily("--font-test")).toBe("'Oswald', 'Oswald Fallback', sans-serif");
  });

  it("returns only the fallback when the variable is not defined (Review Focus 4)", () => {
    expect(resolveFontFamily("--font-test")).toBe("sans-serif");
  });
});
