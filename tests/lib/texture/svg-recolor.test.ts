import { describe, it, expect } from "vitest";
import { recolorSvg } from "@/lib/builder/texture/svg-recolor";

describe("recolorSvg", () => {
  it("replaces fill on elements tagged with data-color-slot", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><path data-color-slot="primary" fill="#000000" d="M0 0" /></svg>`;
    const output = recolorSvg(input, { primary: "#ff0000" });
    expect(output).toContain('fill="#ff0000"');
  });

  it("leaves elements without a matching color untouched", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><path data-color-slot="secondary" fill="#111111" d="M0 0" /></svg>`;
    const output = recolorSvg(input, { primary: "#ff0000" });
    expect(output).toContain('fill="#111111"');
  });

  it("recolors multiple slots independently", () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000" /><rect data-color-slot="secondary" fill="#fff" /></svg>`;
    const output = recolorSvg(input, { primary: "#111111", secondary: "#222222" });
    expect(output).toContain('fill="#111111"');
    expect(output).toContain('fill="#222222"');
  });
});
