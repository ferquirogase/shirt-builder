import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND_LOGO_URLS } from "@/lib/builder/brand-logo";

describe("brand logo files", () => {
  it("points at two different files that exist under public/", () => {
    expect(BRAND_LOGO_URLS.forLight).not.toBe(BRAND_LOGO_URLS.forDark);
    for (const url of Object.values(BRAND_LOGO_URLS)) {
      expect(url.startsWith("/brand/")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    }
  });
});
