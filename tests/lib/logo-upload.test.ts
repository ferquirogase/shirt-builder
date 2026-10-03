import { describe, it, expect } from "vitest";
import { MAX_LOGO_BYTES, validateLogoFile } from "@/lib/builder/logo-upload";

describe("validateLogoFile", () => {
  it("accepts png, jpeg and svg within the size limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/svg+xml"]) {
      expect(validateLogoFile({ type, size: 1000 })).toBeNull();
    }
  });

  it("accepts a file of exactly the limit", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES })).toBeNull();
  });

  it("rejects files over 2 MB", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 })).toMatch(/2 MB/);
  });

  it("rejects other file types", () => {
    expect(validateLogoFile({ type: "application/pdf", size: 10 })).toMatch(/PNG, JPG o SVG/);
    expect(validateLogoFile({ type: "", size: 10 })).toMatch(/PNG, JPG o SVG/);
  });
});
