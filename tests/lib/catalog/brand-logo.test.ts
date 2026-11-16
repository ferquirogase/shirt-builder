import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_LABEL_URLS, BRAND_LOGO_URLS } from "@/lib/builder/catalog/brand-logo";

describe("brand logo files", () => {
  it("points at two different files that exist under public/", () => {
    expect(BRAND_LOGO_URLS.forLight).not.toBe(BRAND_LOGO_URLS.forDark);
    for (const url of Object.values(BRAND_LOGO_URLS)) {
      expect(url.startsWith("/brand/")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    }
  });
});

describe("brand label files", () => {
  it("points at the front and the back label, two SVGs under public/brand/", () => {
    expect(BRAND_LABEL_URLS.front).not.toBe(BRAND_LABEL_URLS.back);
    for (const url of Object.values(BRAND_LABEL_URLS)) {
      expect(url).toMatch(/^\/brand\/.+\.svg$/);
      expect(existsSync(join(process.cwd(), "public", url))).toBe(true);
    }
  });

  it("gives each SVG a size of its own, in the shape of its viewBox, so a canvas can draw it", () => {
    for (const url of Object.values(BRAND_LABEL_URLS)) {
      const svg = readFileSync(join(process.cwd(), "public", url), "utf8");
      const root = /<svg\b[^>]*>/.exec(svg)![0];
      const [, , vw, vh] = /viewBox="([^"]+)"/.exec(root)![1].split(/[\s,]+/).map(Number);
      const width = Number(/\swidth="([\d.]+)"/.exec(root)?.[1]);
      const height = Number(/\sheight="([\d.]+)"/.exec(root)?.[1]);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(width / height).toBeCloseTo(vw / vh, 2);
    }
  });
});
