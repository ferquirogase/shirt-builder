import { describe, it, expect } from "vitest";
import { initialDesignState, type DesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine } from "@/lib/checkout/order";
import { buildAiPrompt } from "@/lib/checkout/ai-prompt";

function promptFor(design: Partial<DesignState> = {}, line: { name?: string; number?: string } = {}) {
  return buildAiPrompt({
    design: { ...initialDesignState, ...design },
    roster: [createPlayerLine("a", line)],
  });
}

describe("buildAiPrompt", () => {
  it("asks for the person in the attached photo wearing the attached shirt, unchanged", () => {
    const prompt = promptFor();
    expect(prompt).toMatch(/foto que adjunto/);
    expect(prompt).toMatch(/imágenes adjuntas/);
    expect(prompt).toMatch(/exactamente/);
    expect(prompt).toMatch(/cara/);
  });

  it("describes the pattern and the colors in words, not hex codes", () => {
    const prompt = promptFor();
    expect(prompt).toContain("franjas");
    expect(prompt).toContain("verde oscuro");
    expect(prompt).toContain("blanco");
    expect(prompt).not.toMatch(/#[0-9a-f]{6}/i);
  });

  it("mentions the accent color only when the design uses it", () => {
    expect(promptFor()).not.toContain("dorado");
    const withAccent = promptFor({ sleevePatternId: "sleeve-accent" });
    expect(withAccent).toContain("detalles");
  });

  it("mentions the name and number on the back when there are some", () => {
    expect(promptFor({}, { name: "LEO", number: "10" })).toMatch(/LEO/);
    expect(promptFor({}, { name: "LEO", number: "10" })).toMatch(/10/);
    expect(promptFor()).not.toMatch(/espalda dice/);
  });

  it("mentions the crest, the sponsors and the shorts only when present", () => {
    const plain = promptFor();
    expect(plain).not.toMatch(/escudo/);
    expect(plain).not.toMatch(/sponsor/i);
    expect(plain).not.toMatch(/short/);

    const full = promptFor({
      logoDataUrl: "data:image/png;base64,AAAA",
      sponsors: { abdomen: { dataUrl: "data:image/png;base64,BBBB", scale: 1 } },
      shorts: { included: true, colorSource: "secondary" },
    });
    expect(full).toMatch(/escudo/);
    expect(full).toMatch(/sponsor/i);
    expect(full).toMatch(/short blanco/);
  });
});
