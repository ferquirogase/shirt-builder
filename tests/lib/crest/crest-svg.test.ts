import { describe, it, expect } from "vitest";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { CREST_SYMBOLS } from "@/lib/builder/catalog/crest-symbols";
import { CREST_DIVISIONS, INITIAL_CREST, cleanInitials, type CrestConfig } from "@/lib/builder/crest/crest-config";
import { crestDataUrl, crestToSvg } from "@/lib/builder/crest/crest-svg";

const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");
const withConfig = (patch: Partial<CrestConfig>): CrestConfig => ({ ...INITIAL_CREST, ...patch });

describe("cleanInitials", () => {
  it("keeps up to four uppercase letters or digits and drops the rest", () => {
    expect(cleanInitials("abcde")).toBe("ABCD");
    expect(cleanInitials(" a b ")).toBe("AB");
    expect(cleanInitials("<b>a&c")).toBe("BAC");
    expect(cleanInitials("ñu7")).toBe("ÑU7");
    expect(cleanInitials("Álvaro")).toBe("ALVA");
    expect(cleanInitials("Éric")).toBe("ERIC");
  });
});

describe("crestToSvg", () => {
  it("draws the chosen shape in the primary color", () => {
    const shape = CREST_SHAPES[3];
    const svg = crestToSvg(withConfig({ shapeId: shape.id, colors: { primary: "#112233", secondary: "#ffffff" } }));
    expect(svg).toContain(shape.d);
    expect(svg).toContain('fill="#112233"');
  });

  it("falls back to the first shape when the id is unknown", () => {
    expect(crestToSvg(withConfig({ shapeId: "nope" }))).toContain(CREST_SHAPES[0].d);
  });

  it("is well-formed XML for every shape, division and symbol", () => {
    for (const shape of CREST_SHAPES) {
      for (const division of CREST_DIVISIONS) {
        const symbol = { kind: "icon" as const, id: CREST_SYMBOLS[0].id };
        const doc = parse(crestToSvg(withConfig({ shapeId: shape.id, divisionId: division.id, symbol })));
        expect(doc.querySelector("parsererror")).toBeNull();
      }
    }
  });

  it("paints the secondary color once per division band", () => {
    const secondary = "#ff0000";
    const count = (divisionId: CrestConfig["divisionId"]) =>
      parse(crestToSvg(withConfig({ divisionId, colors: { primary: "#00ff00", secondary } }))).querySelectorAll(
        `[fill="${secondary}"]`
      ).length;
    expect(count("plain")).toBe(0);
    expect(count("half")).toBe(1);
    expect(count("stripes")).toBe(2);
    expect(count("band")).toBe(1);
  });

  it("draws a symbol and initials, readable against the primary color", () => {
    const star = CREST_SYMBOLS[0];
    const withStar = crestToSvg(
      withConfig({ symbol: { kind: "icon", id: star.id }, colors: { primary: "#000000", secondary: "#ffffff" } })
    );
    expect(withStar).toContain(star.d);
    expect(withStar).toContain('fill="#ffffff"');

    const doc = parse(crestToSvg(withConfig({ symbol: { kind: "initials", text: "ABC" } })));
    expect(doc.querySelector("text")?.textContent).toBe("ABC");
  });

  it("draws four initials smaller than three, so they still fit inside the shield", () => {
    const size = (text: string) =>
      Number(parse(crestToSvg(withConfig({ symbol: { kind: "initials", text } }))).querySelector("text")?.getAttribute("font-size"));
    expect(size("ABCD")).toBeLessThan(size("ABC"));
  });

  const borderOf = (svg: string) =>
    [...parse(svg).querySelectorAll("path")].find((p) => p.getAttribute("fill") === "none")?.getAttribute("stroke");

  it("draws the border in the outline color", () => {
    const svg = crestToSvg(withConfig({ colors: { primary: "#000000", secondary: "#ffffff", outline: "#ff0000" } }));
    expect(borderOf(svg)).toBe("#ff0000");
  });

  it("draws the border in the secondary color when no outline was chosen, as crests made before did", () => {
    const svg = crestToSvg(withConfig({ colors: { primary: "#000000", secondary: "#00ff00" } }));
    expect(borderOf(svg)).toBe("#00ff00");
  });

  it("replaces a hostile outline color with the secondary", () => {
    const svg = crestToSvg(withConfig({ colors: { primary: "#000000", secondary: "#00ff00", outline: '"/><x' } }));
    expect(parse(svg).querySelector("parsererror")).toBeNull();
    expect(borderOf(svg)).toBe("#00ff00");
  });

  it("cannot be broken by hostile colors, such as a tampered saved order", () => {
    const svg = crestToSvg(withConfig({ colors: { primary: '"/><script>x</script>', secondary: "red" } }));
    expect(parse(svg).querySelector("parsererror")).toBeNull();
    expect(svg).not.toContain("script");
    expect(svg).toContain(`fill="${INITIAL_CREST.colors.primary}"`);
  });

  it("cannot be broken by hostile initials", () => {
    const doc = parse(crestToSvg(withConfig({ symbol: { kind: "initials", text: '<&">' } })));
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.querySelector("text")?.textContent).toBe('<&">');
  });
});

describe("crestDataUrl", () => {
  it("is an SVG data URL that decodes back to the same markup", () => {
    const config = withConfig({});
    const url = crestDataUrl(config);
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url.slice(url.indexOf(",") + 1))).toBe(crestToSvg(config));
  });
});
