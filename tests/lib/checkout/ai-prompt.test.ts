import { describe, it, expect } from "vitest";
import { designReducer, initialDesignState, type DesignState } from "@/lib/builder/state/design-state";
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

describe("buildAiPrompt for the keeper", () => {
  const withKeeper = designReducer(initialDesignState, { type: "SET_KEEPER_INCLUDED", value: true });
  const roster = [
    createPlayerLine("a", { name: "LEO", number: "10" }),
    createPlayerLine("b", { name: "DIBU", number: "1", keeper: true }),
  ];

  it("describes the keeper's own look and says it is a goalkeeper's shirt", () => {
    const prompt = buildAiPrompt({ design: withKeeper, roster }, "keeper");
    expect(prompt).toMatch(/arquero/i);
    expect(prompt).not.toContain("franjas");
    expect(prompt).not.toContain("verde oscuro");
  });

  it("takes the name and number of the first player marked as keeper", () => {
    const prompt = buildAiPrompt({ design: withKeeper, roster }, "keeper");
    expect(prompt).toContain("DIBU");
    expect(prompt).not.toContain("LEO");
  });

  it("leaves the back out when nobody is marked as keeper", () => {
    const prompt = buildAiPrompt({ design: withKeeper, roster: [roster[0]] }, "keeper");
    expect(prompt).not.toMatch(/espalda dice/);
  });

  it("the player prompt skips the keeper and does not mention one", () => {
    const prompt = buildAiPrompt({ design: withKeeper, roster: [roster[1], roster[0]] });
    expect(prompt).toContain("LEO");
    expect(prompt).not.toContain("DIBU");
    expect(prompt).not.toMatch(/arquero/i);
    expect(prompt).toContain("franjas");
  });

  it("treats a marked line as a player when the keeper is not in the design", () => {
    const prompt = buildAiPrompt({ design: initialDesignState, roster: [roster[1], roster[0]] });
    expect(prompt).toContain("DIBU");
  });
});
