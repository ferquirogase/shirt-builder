import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAND_LABEL_URLS, BRAND_LOGO_URLS, SHORTS_SIDE_MARK_URLS } from "@/lib/builder/catalog/brand-logo";

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

describe("the shorts' side mark files", () => {
  const read = (url: string) => readFileSync(join(process.cwd(), "public", url), "utf8");

  it("points at a black and a white SVG under public/brand/, standing up (taller than wide)", () => {
    expect(SHORTS_SIDE_MARK_URLS.forLight).not.toBe(SHORTS_SIDE_MARK_URLS.forDark);
    for (const url of Object.values(SHORTS_SIDE_MARK_URLS)) {
      expect(url).toMatch(/^\/brand\/.+\.svg$/);
      const root = /<svg\b[^>]*>/.exec(read(url))![0];
      const width = Number(/\swidth="([\d.]+)"/.exec(root)?.[1]);
      const height = Number(/\sheight="([\d.]+)"/.exec(root)?.[1]);
      const [, , vw, vh] = /viewBox="([^"]+)"/.exec(root)![1].split(/[\s,]+/).map(Number);
      expect(width / height).toBeCloseTo(vw / vh, 2);
      expect(height).toBeGreaterThan(width * 3);
    }
  });

  it("has the same drawing in both, black in one and white in the other", () => {
    const black = read(SHORTS_SIDE_MARK_URLS.forLight);
    const white = read(SHORTS_SIDE_MARK_URLS.forDark);
    const paths = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
    expect(paths(white)).toEqual(paths(black));
    expect(black).not.toMatch(/#fff\b/i);
    expect(white).not.toMatch(/#0{3}\b|#010101/i);
  });
});
