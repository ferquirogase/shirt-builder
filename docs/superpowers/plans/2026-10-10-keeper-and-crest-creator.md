# Keeper shirt and crest creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a team add a goalkeeper shirt (own colors and pattern) to the order and build a crest (shape, background, two colors, symbol or initials) when they have none.

**Architecture:** The made crest is a config (`crestConfig`) turned by a pure function into an SVG data URL that is stored as `logoDataUrl`, so the texture compositor, thumbnails, checkout and story keep working untouched. The keeper is a second "look" (patterns and colors, plus its own name/number color) inside `DesignState`; `lookFor(state, target)` returns a `DesignState` wearing that look, so the compositor and viewer never learn about the keeper. Which shirt the viewer shows and the panels edit is UI state (`editing`) outside the undo history.

**Tech Stack:** Next.js (see AGENTS.md), React 19, TypeScript, Tailwind, three.js / react-three-fiber, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-10-keeper-and-crest-creator-design.md`

## Global Constraints

- All user-facing copy is Spanish with voseo ("Elegí", "Marcá"); code, comments and docs are English.
- Never add `prefers-reduced-motion` to `app/globals.css` (a share-story test forbids it).
- Repo files are CRLF; the tools handle it. Keep existing style: 2-space indent, double quotes, `"use client"` on client components.
- `AGENTS.md` warns this Next.js has breaking changes; this plan touches no Next API (only React components and plain TS). If a step needs one, read `node_modules/next/dist/docs/` first.
- Commit only on a real green exit code: run `npm test > out.txt; code=$?`, read it, then `[ $code -eq 0 ] && git commit ...`. Never `npm test | grep ... && git commit`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Work on branch `feat/keeper-crest` (already created from `origin/main`, spec committed). No `gh`; push and PR only when the user asks.
- Existing behavior must not change: a design without keeper or made crest renders and orders exactly as today; orders saved in sessionStorage before this feature must still load.
- Prices are examples: a keeper shirt costs the same as a player shirt (`PRICE_PER_SHIRT`), so `pricing.ts` does not change.
- The AI try-on and the share-story keep using the player shirt only.

## Review Focus

Failure modes the spec implies but a task's happy-path tests would miss; each has a test in the task named in brackets.

1. The user uploaded a crest, then opens "Crear escudo": the upload must stay on the shirt until they actually edit the creator. [Task 8]
2. The keeper is switched off while the viewer shows the keeper: the viewer and panels must fall back to the player shirt, not render a missing look. [Task 6]
3. Orders saved before this feature (no `keeper`, no `crestConfig`, roster lines without `keeper`) must still load with defaults. [Task 4, Task 9]
4. Initials typed with lowercase, spaces, accents or markup (`<`, `&`) must never produce a broken SVG. [Task 3]
5. A roster line marked "Arquero" after the keeper was removed from the design counts as a normal player; with the keeper included and nobody marked, the checkout says so instead of silently ordering no keeper. [Task 9]

---

## File Structure

New:
- `lib/builder/color/contrast.ts`: relative luminance, `contrastColor`, `colorDistance`.
- `lib/builder/catalog/crest-shapes.ts`: 25 shield shapes (generated, committed).
- `scripts/build-crest-shapes.mjs`: one-off generator that reads the supplied SVG.
- `lib/builder/catalog/crest-symbols.ts`: 8 symbol paths.
- `lib/builder/crest/crest-config.ts`: `CrestConfig` type, divisions, defaults, `cleanInitials`.
- `lib/builder/crest/crest-svg.ts`: `crestToSvg`, `crestDataUrl`.
- `components/builder/panels/CrestCreator.tsx`: the "Crear escudo" UI.
- `components/builder/panels/EditingBadge.tsx`: "Editando la camiseta del arquero" note.
- Tests next to the existing ones under `tests/`.

Modified: `design-state.ts`, `design-history.ts`, `design-context.tsx`, `use-jersey-texture.ts`, `StageToolbar.tsx`, `GarmentsPanel.tsx`, `DesignPanel.tsx`, `ColorsPanel.tsx`, `TextPanel.tsx`, `CrestPanel.tsx`, `Header.tsx`, `BuilderPage.tsx`, `order.ts`, `order-storage.ts`, `payment.ts`, `thumbnails.ts` (no change, reused), `RosterTable.tsx`, `CheckoutView.tsx`, `DesignPreview.tsx`, `ConfirmationPage.tsx`.

---

### Task 1: Color contrast helpers

**Files:**
- Create: `lib/builder/color/contrast.ts`
- Test: `tests/lib/color/contrast.test.ts`

**Interfaces:**
- Produces: `contrastColor(hex: string): "#000000" | "#ffffff"`, `colorDistance(a: string, b: string): number` (Euclidean RGB, 0 if either is not `#rrggbb`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { colorDistance, contrastColor } from "@/lib/builder/color/contrast";

describe("contrastColor", () => {
  it("is black on light colors and white on dark ones", () => {
    expect(contrastColor("#ffffff")).toBe("#000000");
    expect(contrastColor("#f5b700")).toBe("#000000");
    expect(contrastColor("#0a5c36")).toBe("#ffffff");
    expect(contrastColor("#000000")).toBe("#ffffff");
  });

  it("falls back to black when the color cannot be read", () => {
    expect(contrastColor("not-a-color")).toBe("#000000");
  });
});

describe("colorDistance", () => {
  it("is zero for the same color and grows with the difference", () => {
    expect(colorDistance("#123456", "#123456")).toBe(0);
    expect(colorDistance("#000000", "#ffffff")).toBeCloseTo(441.67, 1);
  });

  it("is zero when a color cannot be read", () => {
    expect(colorDistance("nope", "#ffffff")).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/lib/color/contrast.test.ts`
Expected: FAIL, cannot resolve `@/lib/builder/color/contrast`.

- [ ] **Step 3: Implement**

```ts
const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function rgb(hex: string): [number, number, number] | null {
  const match = HEX.exec(hex);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// WCAG relative luminance, 0 (black) to 1 (white). An unreadable color counts as white.
function luminance(hex: string): number {
  const channels = rgb(hex);
  if (!channels) return 1;
  const [r, g, b] = channels.map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white, whichever reads better on top of `hex`.
export function contrastColor(hex: string): "#000000" | "#ffffff" {
  const l = luminance(hex);
  const againstBlack = (l + 0.05) / 0.05;
  const againstWhite = 1.05 / (l + 0.05);
  return againstBlack >= againstWhite ? "#000000" : "#ffffff";
}

export function colorDistance(a: string, b: string): number {
  const first = rgb(a);
  const second = rgb(b);
  if (!first || !second) return 0;
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/lib/color/contrast.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/color/contrast.ts tests/lib/color/contrast.test.ts
git commit -m "feat: contrast and distance helpers for picking readable colors"
```
(End the message with the Co-Authored-By line; run the commit only after reading the test exit code, as in Global Constraints.)

---

### Task 2: Crest shapes catalog

**Files:**
- Create: `scripts/build-crest-shapes.mjs`, `lib/builder/catalog/crest-shapes.ts` (generated)
- Test: `tests/lib/catalog/crest-shapes.test.ts`

**Interfaces:**
- Produces: `type CrestShape = { id: string; d: string; box: { x: number; y: number; width: number; height: number } }`, `CREST_SHAPES: CrestShape[]` (25, ids `shield-01`..`shield-25`, in reading order of the source grid), `findCrestShape(id: string): CrestShape | undefined`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { CREST_SHAPES, findCrestShape } from "@/lib/builder/catalog/crest-shapes";

describe("CREST_SHAPES", () => {
  it("has the 25 supplied shields with unique ids", () => {
    expect(CREST_SHAPES).toHaveLength(25);
    expect(new Set(CREST_SHAPES.map((s) => s.id)).size).toBe(25);
  });

  it("gives every shape a path and a box with a size", () => {
    for (const shape of CREST_SHAPES) {
      expect(shape.d.length).toBeGreaterThan(10);
      expect(shape.box.width).toBeGreaterThan(10);
      expect(shape.box.height).toBeGreaterThan(10);
    }
  });

  it("finds a shape by id", () => {
    expect(findCrestShape("shield-01")).toBe(CREST_SHAPES[0]);
    expect(findCrestShape("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/lib/catalog/crest-shapes.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Write the generator**

`scripts/build-crest-shapes.mjs`:

```js
// One-off: turns the supplied sheet of shields (a 5x5 grid of single-color silhouettes) into
// lib/builder/catalog/crest-shapes.ts. Bounding boxes come from headless Chrome (getBBox), so
// no path parser is needed.
// Usage: node scripts/build-crest-shapes.mjs <sheet.svg> lib/builder/catalog/crest-shapes.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [source, out] = process.argv.slice(2);
const CHROME = process.env.CHROME ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SHEET = 288;
const GRID = 5;

const svg = readFileSync(source, "utf8");
if (/transform=/.test(svg)) throw new Error("the sheet uses transforms; flatten them first");

const paths = [];
for (const [tag, kind] of svg.matchAll(/<(path|polygon)\b[^>]*>/g).map((m) => [m[0], m[1]])) {
  if (kind === "path") {
    paths.push(/\sd="([^"]+)"/.exec(tag)[1]);
  } else {
    const n = /\spoints="([^"]+)"/.exec(tag)[1].trim().split(/[\s,]+/).map(Number);
    let d = "";
    for (let i = 0; i < n.length; i += 2) d += `${i === 0 ? "M" : "L"}${n[i]} ${n[i + 1]}`;
    paths.push(`${d}Z`);
  }
}
if (paths.length !== 25) throw new Error(`expected 25 shapes, found ${paths.length}`);

const page = `<!doctype html><body><svg xmlns="http://www.w3.org/2000/svg" width="${SHEET}" height="${SHEET}">${paths
  .map((d) => `<path d="${d}"/>`)
  .join("")}</svg><pre id="out"></pre><script>
const boxes = [...document.querySelectorAll("path")].map((p) => { const b = p.getBBox(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
document.getElementById("out").textContent = "BOXES:" + JSON.stringify(boxes) + ":END";
</script></body>`;
const file = join(mkdtempSync(join(tmpdir(), "crests-")), "page.html");
writeFileSync(file, page);

const dom = execFileSync(CHROME, ["--headless=new", "--virtual-time-budget=2000", "--dump-dom", pathToFileURL(file).href], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const boxes = JSON.parse(/BOXES:(.*?):END/s.exec(dom)[1]);

const round = (v) => Math.round(v * 100) / 100;
const shapes = paths
  .map((d, i) => ({ d, box: boxes[i] }))
  // Reading order of the grid: row, then column.
  .sort((a, b) => {
    const row = (s) => Math.floor((s.box.y + s.box.height / 2) / (SHEET / GRID));
    return row(a) - row(b) || a.box.x - b.box.x;
  });

const lines = shapes.map((s, i) => {
  const id = `shield-${String(i + 1).padStart(2, "0")}`;
  const { x, y, width, height } = s.box;
  return `  { id: "${id}", d: "${s.d}", box: { x: ${round(x)}, y: ${round(y)}, width: ${round(width)}, height: ${round(height)} } },`;
});

writeFileSync(
  out,
  `// Generated by scripts/build-crest-shapes.mjs from the supplied sheet of shields. Do not edit by hand.
export type CrestShape = {
  id: string;
  /** Path data of the silhouette, in the sheet's own coordinates. */
  d: string;
  /** The silhouette's bounding box in those coordinates. */
  box: { x: number; y: number; width: number; height: number };
};

export const CREST_SHAPES: CrestShape[] = [
${lines.join("\n")}
];

export function findCrestShape(id: string): CrestShape | undefined {
  return CREST_SHAPES.find((shape) => shape.id === id);
}
`
);
```

- [ ] **Step 4: Generate the catalog**

Run: `node scripts/build-crest-shapes.mjs "C:\Users\FERNANDO\Downloads\5548488_20807.svg" lib/builder/catalog/crest-shapes.ts`
Expected: no output, the file exists with 25 entries. If Node reports `matchAll(...).map is not a function`, wrap it as `[...svg.matchAll(...)].map(...)`.

- [ ] **Step 5: Run the test to see it pass, then commit**

Run: `npx vitest run tests/lib/catalog/crest-shapes.test.ts`
Expected: PASS.

```bash
git add scripts/build-crest-shapes.mjs lib/builder/catalog/crest-shapes.ts tests/lib/catalog/crest-shapes.test.ts
git commit -m "feat: catalog of 25 crest shapes built from the supplied sheet"
```

---

### Task 3: Crest config and SVG

**Files:**
- Create: `lib/builder/catalog/crest-symbols.ts`, `lib/builder/crest/crest-config.ts`, `lib/builder/crest/crest-svg.ts`
- Test: `tests/lib/crest/crest-svg.test.ts`

**Interfaces:**
- Consumes: `CREST_SHAPES`, `findCrestShape` (Task 2); `contrastColor` (Task 1).
- Produces:
  - `crest-symbols.ts`: `type CrestSymbolDef = { id: string; label: string; d: string }` (24x24 viewBox, evenodd), `CREST_SYMBOLS: CrestSymbolDef[]`, `findCrestSymbol(id)`.
  - `crest-config.ts`: `type CrestDivisionId = "plain" | "half" | "stripes" | "band"`, `CREST_DIVISIONS: { id: CrestDivisionId; label: string }[]`, `type CrestSymbol = { kind: "icon"; id: string } | { kind: "initials"; text: string } | null`, `type CrestConfig = { shapeId: string; divisionId: CrestDivisionId; colors: { primary: string; secondary: string }; symbol: CrestSymbol }`, `INITIAL_CREST: CrestConfig`, `MAX_INITIALS = 3`, `cleanInitials(text: string): string`.
  - `crest-svg.ts`: `crestToSvg(config: CrestConfig): string`, `crestDataUrl(config: CrestConfig): string`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { CREST_SYMBOLS } from "@/lib/builder/catalog/crest-symbols";
import { CREST_DIVISIONS, INITIAL_CREST, cleanInitials, type CrestConfig } from "@/lib/builder/crest/crest-config";
import { crestDataUrl, crestToSvg } from "@/lib/builder/crest/crest-svg";

const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml");
const withConfig = (patch: Partial<CrestConfig>): CrestConfig => ({ ...INITIAL_CREST, ...patch });

describe("cleanInitials", () => {
  it("keeps up to three uppercase letters or digits and drops the rest", () => {
    expect(cleanInitials("abcd")).toBe("ABC");
    expect(cleanInitials(" a b ")).toBe("AB");
    expect(cleanInitials("<b>a&c")).toBe("BAC");
    expect(cleanInitials("ñu7")).toBe("ÑU7");
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
    const withStar = crestToSvg(withConfig({ symbol: { kind: "icon", id: star.id }, colors: { primary: "#000000", secondary: "#ffffff" } }));
    expect(withStar).toContain(star.d);
    expect(withStar).toContain('fill="#ffffff"');

    const doc = parse(crestToSvg(withConfig({ symbol: { kind: "initials", text: "ABC" } })));
    expect(doc.querySelector("text")?.textContent).toBe("ABC");
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
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/lib/crest/crest-svg.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement the symbols**

`lib/builder/catalog/crest-symbols.ts`:

```ts
export type CrestSymbolDef = {
  id: string;
  label: string;
  /** Path data in a 24x24 box, drawn with the even-odd rule. */
  d: string;
};

export const CREST_SYMBOLS: CrestSymbolDef[] = [
  { id: "star", label: "Estrella", d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "bolt", label: "Rayo", d: "M7 2v11h3v9l7-12h-4l4-8z" },
  { id: "crown", label: "Corona", d: "M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" },
  { id: "ball", label: "Pelota", d: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 8.4l3.4 2.5-1.3 4H9.9l-1.3-4z" },
  { id: "diamond", label: "Rombo", d: "M12 2l10 10-10 10L2 12z" },
  {
    id: "heart",
    label: "Corazón",
    d: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  },
  { id: "cross", label: "Cruz", d: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6z" },
  { id: "ring", label: "Aro", d: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12z" },
];

export function findCrestSymbol(id: string): CrestSymbolDef | undefined {
  return CREST_SYMBOLS.find((symbol) => symbol.id === id);
}
```

- [ ] **Step 4: Implement the config**

`lib/builder/crest/crest-config.ts`:

```ts
import { CREST_SHAPES } from "../catalog/crest-shapes";

export type CrestDivisionId = "plain" | "half" | "stripes" | "band";

export const CREST_DIVISIONS: { id: CrestDivisionId; label: string }[] = [
  { id: "plain", label: "Liso" },
  { id: "half", label: "Mitad" },
  { id: "stripes", label: "Franjas" },
  { id: "band", label: "Banda" },
];

export type CrestSymbol = { kind: "icon"; id: string } | { kind: "initials"; text: string } | null;

export type CrestConfig = {
  shapeId: string;
  divisionId: CrestDivisionId;
  colors: { primary: string; secondary: string };
  symbol: CrestSymbol;
};

export const MAX_INITIALS = 3;

export const INITIAL_CREST: CrestConfig = {
  shapeId: CREST_SHAPES[0].id,
  divisionId: "plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff" },
  symbol: null,
};

// Up to three letters or digits, uppercase: what fits inside a shield.
export function cleanInitials(text: string): string {
  return text.toUpperCase().replace(/[^A-ZÑ0-9]/g, "").slice(0, MAX_INITIALS);
}
```

- [ ] **Step 5: Implement the SVG**

`lib/builder/crest/crest-svg.ts`:

```ts
import { CREST_SHAPES, findCrestShape, type CrestShape } from "../catalog/crest-shapes";
import { findCrestSymbol } from "../catalog/crest-symbols";
import { contrastColor } from "../color/contrast";
import type { CrestConfig, CrestDivisionId } from "./crest-config";

const VIEW = 100;
const MARGIN = 4;
// Visible width of the border, in view units.
const BORDER = 3.2;
const RENDER_SIZE = 512;

const num = (value: number) => Number(value.toFixed(3));

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function divisionMarkup(id: CrestDivisionId, box: CrestShape["box"], fill: string): string {
  const { x, y, width: w, height: h } = box;
  switch (id) {
    case "half":
      return `<rect x="${num(x + w / 2)}" y="${num(y)}" width="${num(w / 2)}" height="${num(h)}" fill="${fill}"/>`;
    case "stripes":
      return [1, 3]
        .map((i) => `<rect x="${num(x + (w / 5) * i)}" y="${num(y)}" width="${num(w / 5)}" height="${num(h)}" fill="${fill}"/>`)
        .join("");
    case "band": {
      const points = [
        [x, y + h * 0.1],
        [x, y + h * 0.4],
        [x + w, y + h * 0.9],
        [x + w, y + h * 0.6],
      ];
      return `<polygon points="${points.map(([px, py]) => `${num(px)},${num(py)}`).join(" ")}" fill="${fill}"/>`;
    }
    default:
      return "";
  }
}

// Fill is black or white, whichever reads on the primary color, with the opposite as an outline
// so it also reads over the secondary color.
function symbolMarkup(config: CrestConfig, box: CrestShape["box"]): string {
  const { symbol } = config;
  if (!symbol) return "";
  const fill = contrastColor(config.colors.primary);
  const outline = contrastColor(fill);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.46;
  const side = Math.min(box.width, box.height);

  if (symbol.kind === "icon") {
    const def = findCrestSymbol(symbol.id);
    if (!def) return "";
    const size = side * 0.42;
    return (
      `<g transform="translate(${num(cx - size / 2)} ${num(cy - size / 2)}) scale(${num(size / 24)})">` +
      `<path d="${def.d}" fill="${fill}" fill-rule="evenodd" stroke="${outline}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/></g>`
    );
  }

  if (symbol.text === "") return "";
  const fontSize = side * ([0.5, 0.5, 0.38, 0.3][Math.min(symbol.text.length, 3)] ?? 0.3);
  return (
    `<text x="${num(cx)}" y="${num(cy)}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${num(fontSize)}" ` +
    `fill="${fill}" stroke="${outline}" stroke-width="${num(fontSize * 0.08)}" stroke-linejoin="round" paint-order="stroke">` +
    `${escapeXml(symbol.text)}</text>`
  );
}

export function crestToSvg(config: CrestConfig): string {
  const shape = findCrestShape(config.shapeId) ?? CREST_SHAPES[0];
  const { box, d } = shape;
  const { primary, secondary } = config.colors;
  const scale = (VIEW - 2 * MARGIN) / Math.max(box.width, box.height);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // The stroke is centered on the edge and clipped to the shape, so only its inner half shows.
  const border = (BORDER / scale) * 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${RENDER_SIZE}" height="${RENDER_SIZE}" viewBox="0 0 ${VIEW} ${VIEW}">` +
    `<g transform="translate(${VIEW / 2} ${VIEW / 2}) scale(${num(scale)}) translate(${num(-cx)} ${num(-cy)})">` +
    `<defs><clipPath id="crest-clip"><path d="${d}"/></clipPath></defs>` +
    `<path d="${d}" fill="${primary}"/>` +
    `<g clip-path="url(#crest-clip)">${divisionMarkup(config.divisionId, box, secondary)}` +
    `<path d="${d}" fill="none" stroke="${secondary}" stroke-width="${num(border)}"/></g>` +
    symbolMarkup(config, box) +
    `</g></svg>`
  );
}

export function crestDataUrl(config: CrestConfig): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crestToSvg(config))}`;
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/lib/crest/crest-svg.test.ts`
Expected: PASS. If the "once per division band" count is off, the border path uses `stroke=` (not `fill=`), so only the division shapes carry `fill="<secondary>"`; check the division markup, not the test.

- [ ] **Step 7: Commit**

```bash
git add lib/builder/catalog/crest-symbols.ts lib/builder/crest tests/lib/crest
git commit -m "feat: crest config and a pure function that draws it as SVG"
```

---

### Task 4: Made crest in the design state

**Files:**
- Modify: `lib/builder/state/design-state.ts`, `lib/builder/state/design-history.ts`
- Test: `tests/lib/state/design-state.test.ts`, `tests/lib/state/design-history.test.ts`, `tests/lib/checkout/order-storage.test.ts`

**Interfaces:**
- Consumes: `CrestConfig` (Task 3), `crestDataUrl` (Task 3), `findCrestShape` (Task 2).
- Produces: `DesignState.crestConfig: CrestConfig | null`; action `{ type: "SET_CREST_CONFIG"; config: CrestConfig }`. `SET_LOGO` now also clears `crestConfig`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/state/design-state.test.ts` (inside the top-level, new `describe`):

```ts
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";

describe("made crest", () => {
  it("starts without one", () => {
    expect(initialDesignState.crestConfig).toBeNull();
  });

  it("stores the config and draws it as the logo", () => {
    const next = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    expect(next.crestConfig).toEqual(INITIAL_CREST);
    expect(next.logoDataUrl).toBe(crestDataUrl(INITIAL_CREST));
  });

  it("ignores a config whose shape does not exist", () => {
    const next = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: { ...INITIAL_CREST, shapeId: "nope" } });
    expect(next).toBe(initialDesignState);
  });

  it("an uploaded crest replaces the made one, and removing it clears both", () => {
    const made = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    const uploaded = designReducer(made, { type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" });
    expect(uploaded.crestConfig).toBeNull();
    expect(uploaded.logoDataUrl).toBe("data:image/png;base64,AAAA");
    const removed = designReducer(made, { type: "SET_LOGO", dataUrl: null });
    expect(removed.crestConfig).toBeNull();
    expect(removed.logoDataUrl).toBeNull();
  });

  it("is dropped by a reset", () => {
    const made = designReducer(initialDesignState, { type: "SET_CREST_CONFIG", config: INITIAL_CREST });
    const reset = designReducer(made, { type: "RESET_DESIGN" });
    expect(reset.crestConfig).toBeNull();
    expect(reset.logoDataUrl).toBeNull();
  });
});
```

Add to `tests/lib/state/design-history.test.ts`:

```ts
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";

it("collapses a burst of crest edits into one undo step and can undo it", () => {
  const edited = run([
    { type: "SET_CREST_CONFIG", config: INITIAL_CREST, at: 1000 },
    { type: "SET_CREST_CONFIG", config: { ...INITIAL_CREST, colors: { primary: "#111111", secondary: "#ffffff" } }, at: 1100 },
  ]);
  expect(edited.past).toHaveLength(1);
  const undone = historyReducer(edited, { type: "UNDO" });
  expect(undone.present.crestConfig).toBeNull();
  expect(undone.present.logoDataUrl).toBeNull();
});
```

Add to `tests/lib/checkout/order-storage.test.ts` (follow the file's existing helper for saving raw JSON; if it has none, write the JSON with `sessionStorage.setItem(ORDER_KEY, ...)` and call `clearOrder()` first so the in-memory slot is empty):

```ts
it("loads an order saved before the made crest existed, with no crest", () => {
  clearOrder();
  const { crestConfig: _drop, ...oldDesign } = initialDesignState;
  window.sessionStorage.setItem(
    ORDER_KEY,
    JSON.stringify({ design: oldDesign, thumbnails: null, roster: [createPlayerLine("a")] })
  );
  expect(loadOrder()?.design.crestConfig).toBeNull();
});
```
(Import `clearOrder`, `loadOrder`, `ORDER_KEY`, `initialDesignState`, `createPlayerLine` if not already imported.)

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/lib/state tests/lib/checkout/order-storage.test.ts`
Expected: FAIL (`crestConfig` undefined / unknown action).

- [ ] **Step 3: Implement in `design-state.ts`**

Add imports at the top:

```ts
import { findCrestShape } from "../catalog/crest-shapes";
import type { CrestConfig } from "../crest/crest-config";
import { crestDataUrl } from "../crest/crest-svg";
```

In `DesignState` add after `logoDataUrl`:

```ts
  /** The crest made in the creator; `logoDataUrl` holds it drawn. Null when there is none or it was uploaded. */
  crestConfig: CrestConfig | null;
```

In `DesignAction` add `| { type: "SET_CREST_CONFIG"; config: CrestConfig }`.

In `initialDesignState` add `crestConfig: null,` after `logoDataUrl: null,`.

Reducer cases:

```ts
    case "SET_LOGO":
      return { ...state, logoDataUrl: action.dataUrl, crestConfig: null };
    case "SET_CREST_CONFIG":
      return findCrestShape(action.config.shapeId)
        ? { ...state, crestConfig: action.config, logoDataUrl: crestDataUrl(action.config) }
        : state;
```
(`RESET_DESIGN` spreads `initialDesignState`, so it already clears both.)

- [ ] **Step 4: Implement in `design-history.ts`**

In `groupKey` add `case "SET_CREST_CONFIG": return "crest";`. In `sameDesign` add, after the `logoDataUrl` line:

```ts
    JSON.stringify(a.crestConfig) === JSON.stringify(b.crestConfig) &&
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/lib/state tests/lib/checkout`
Expected: PASS. (`order-storage` spreads `initialDesignState` under `order.design`, so old orders get `crestConfig: null` already.)

- [ ] **Step 6: Commit**

```bash
git add lib/builder/state tests/lib
git commit -m "feat: a made crest lives in the design state and is drawn as the logo"
```

---

### Task 5: Keeper in the design state

**Files:**
- Modify: `lib/builder/state/design-state.ts`, `lib/builder/state/design-history.ts`
- Test: `tests/lib/state/design-state.test.ts`, `tests/lib/state/design-history.test.ts`

**Interfaces:**
- Consumes: `contrastColor`, `colorDistance` (Task 1).
- Produces (all from `design-state.ts`):
  - `type LookTarget = "player" | "keeper"`
  - `type GarmentLook = { bodyPatternId: string; sleevePatternId: string; colors: Record<ColorSlot, string> }`
  - `type KeeperConfig = { included: boolean; look: GarmentLook | null; nameNumberFill: string | null }`; `DesignState.keeper: KeeperConfig` (initial `{ included: false, look: null, nameNumberFill: null }`)
  - actions: `SET_KEEPER_INCLUDED { value: boolean }`; `target?: LookTarget` on `SET_BODY_PATTERN`, `SET_SLEEVE_PATTERN`, `SET_COLOR`, `SET_NN_FILL`
  - `type LookAction = Extract<DesignAction, { type: "SET_BODY_PATTERN" | "SET_SLEEVE_PATTERN" | "SET_COLOR" | "SET_NN_FILL" }>`
  - `pickKeeperPrimary(team: { primary: string; secondary: string }): string`, `defaultKeeperLook(team): GarmentLook`
  - `lookFor(state: DesignState, target: LookTarget): DesignState`: the same state when `target` is "player" or the keeper is not included; otherwise the state wearing the keeper's patterns and colors, with `nameNumberStyle.fill = keeper.nameNumberFill ?? contrastColor(keeper primary)`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/state/design-state.test.ts`:

```ts
import { colorDistance, contrastColor } from "@/lib/builder/color/contrast";
import { defaultKeeperLook, lookFor, pickKeeperPrimary } from "@/lib/builder/state/design-state";

const withKeeper = () => designReducer(initialDesignState, { type: "SET_KEEPER_INCLUDED", value: true });

describe("keeper", () => {
  it("starts out of the order", () => {
    expect(initialDesignState.keeper).toEqual({ included: false, look: null, nameNumberFill: null });
    expect(lookFor(initialDesignState, "keeper")).toBe(initialDesignState);
  });

  it("is given colors that contrast with the team's when it is added", () => {
    const state = withKeeper();
    expect(state.keeper.included).toBe(true);
    const look = state.keeper.look!;
    expect(colorDistance(look.colors.primary, state.colors.primary)).toBeGreaterThan(150);
    expect(colorDistance(look.colors.primary, state.colors.secondary)).toBeGreaterThan(150);
  });

  it("does not pick the team's own color for the keeper", () => {
    expect(pickKeeperPrimary({ primary: "#f5b700", secondary: "#000000" })).not.toBe("#f5b700");
    expect(defaultKeeperLook({ primary: "#f5b700", secondary: "#000000" }).colors.primary).not.toBe("#f5b700");
  });

  it("keeps its look when taken out and put back", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#123456", target: "keeper" });
    state = designReducer(state, { type: "SET_KEEPER_INCLUDED", value: false });
    state = designReducer(state, { type: "SET_KEEPER_INCLUDED", value: true });
    expect(state.keeper.look!.colors.primary).toBe("#123456");
  });

  it("edits the keeper's look without touching the team's", () => {
    let state = withKeeper();
    const before = state.colors;
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    state = designReducer(state, { type: "SET_BODY_PATTERN", id: "hoops", target: "keeper" });
    expect(state.colors).toEqual(before);
    expect(state.bodyPatternId).toBe(initialDesignState.bodyPatternId);
    expect(state.keeper.look!.colors.primary).toBe("#abcdef");
    expect(state.keeper.look!.bodyPatternId).toBe("hoops");
  });

  it("takes the pattern's default colors for new roles, like the team does", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_BODY_PATTERN", id: "stripes-wide", target: "keeper" });
    expect(state.keeper.look!.colors.secondary).toBe("#111111");
  });

  it("ignores keeper edits while the keeper is not in the order", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    expect(next).toBe(initialDesignState);
  });

  it("lookFor wears the keeper's look and picks a readable number color", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#ffffff", target: "keeper" });
    const view = lookFor(state, "keeper");
    expect(view.colors.primary).toBe("#ffffff");
    expect(view.nameNumberStyle.fill).toBe(contrastColor("#ffffff"));
    expect(view.playerName).toBe(state.playerName);
    expect(lookFor(state, "player")).toBe(state);
  });

  it("lets the keeper's number color be chosen, apart from the team's", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_NN_FILL", value: "#ff00ff", target: "keeper" });
    expect(lookFor(state, "keeper").nameNumberStyle.fill).toBe("#ff00ff");
    expect(state.nameNumberStyle.fill).toBe(initialDesignState.nameNumberStyle.fill);
  });

  it("keeps whether it is in the order on reset, with a fresh look", () => {
    let state = withKeeper();
    state = designReducer(state, { type: "SET_COLOR", slot: "primary", value: "#abcdef", target: "keeper" });
    const reset = designReducer(state, { type: "RESET_DESIGN" });
    expect(reset.keeper.included).toBe(true);
    expect(reset.keeper.look).toEqual(defaultKeeperLook(initialDesignState.colors));
    expect(reset.keeper.nameNumberFill).toBeNull();
    const resetOut = designReducer(initialDesignState, { type: "RESET_DESIGN" });
    expect(resetOut.keeper).toEqual(initialDesignState.keeper);
  });
});
```

Add to `tests/lib/state/design-history.test.ts`:

```ts
import { canResetDesign } from "@/lib/builder/state/design-history";

it("records the keeper's edits and undoes them", () => {
  const edited = run([
    { type: "SET_KEEPER_INCLUDED", value: true },
    { type: "SET_BODY_PATTERN", id: "hoops", target: "keeper" },
  ]);
  expect(edited.present.keeper.look!.bodyPatternId).toBe("hoops");
  const undone = historyReducer(edited, { type: "UNDO" });
  expect(undone.present.keeper.look!.bodyPatternId).not.toBe("hoops");
});

it("groups the keeper's color bursts apart from the team's", () => {
  const edited = run([
    { type: "SET_KEEPER_INCLUDED", value: true },
    { type: "SET_COLOR", slot: "primary", value: "#111111", at: 1000 },
    { type: "SET_COLOR", slot: "primary", value: "#222222", target: "keeper", at: 1100 },
  ]);
  expect(edited.past).toHaveLength(3);
});

it("cannot be reset when only the keeper was added", () => {
  const added = run([{ type: "SET_KEEPER_INCLUDED", value: true }]);
  expect(canResetDesign(added.present)).toBe(false);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/lib/state`
Expected: FAIL (`keeper` undefined, unknown action).

- [ ] **Step 3: Implement in `design-state.ts`**

Add imports: `import { colorDistance, contrastColor } from "../color/contrast";`. Add types and helpers after `ShortsConfig`:

```ts
export type LookTarget = "player" | "keeper";

/** What differs between the player shirt and the keeper's: patterns and colors. */
export type GarmentLook = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
};

export type KeeperConfig = {
  included: boolean;
  /** Null until the keeper is first added. Kept when it is taken out, so the choices come back. */
  look: GarmentLook | null;
  /** The keeper's name/number color; null means black or white, whichever reads on its shirt. */
  nameNumberFill: string | null;
};

// Colors a keeper traditionally wears, in no particular order.
const KEEPER_PRIMARIES = ["#f5b700", "#e8202a", "#1d9bf0", "#7b2cbf", "#ff7a00", "#111111"];

// The candidate farthest from both of the team's colors, so the keeper is never mistaken for a player.
export function pickKeeperPrimary(team: { primary: string; secondary: string }): string {
  let best = KEEPER_PRIMARIES[0];
  let bestScore = -1;
  for (const candidate of KEEPER_PRIMARIES) {
    const score = Math.min(colorDistance(candidate, team.primary), colorDistance(candidate, team.secondary));
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

export function defaultKeeperLook(team: { primary: string; secondary: string }): GarmentLook {
  const primary = pickKeeperPrimary(team);
  const trim = contrastColor(primary);
  return {
    bodyPatternId: "plain-body",
    sleevePatternId: "sleeve-primary",
    colors: { primary, secondary: trim, accent: trim, collar: trim },
  };
}
```

Add `keeper: KeeperConfig;` to `DesignState` (after `shorts`), `initialDesignState` gets `keeper: { included: false, look: null, nameNumberFill: null },`.

Edit the actions: add `target?: LookTarget` to the four types:

```ts
  | { type: "SET_BODY_PATTERN"; id: string; target?: LookTarget }
  | { type: "SET_SLEEVE_PATTERN"; id: string; target?: LookTarget }
  | { type: "SET_COLOR"; slot: ColorSlot; value: string; target?: LookTarget }
  ...
  | { type: "SET_NN_FILL"; value: string; target?: LookTarget }
  ...
  | { type: "SET_KEEPER_INCLUDED"; value: boolean }
```

Export `LookAction` after `DesignAction`:

```ts
export type LookAction = Extract<
  DesignAction,
  { type: "SET_BODY_PATTERN" | "SET_SLEEVE_PATTERN" | "SET_COLOR" | "SET_NN_FILL" }
>;
```

Add `lookFor` and the keeper reducer before `designReducer`:

```ts
// The design as one of the two shirts wears it. Everything the keeper shares with the team
// (crest, sponsors, name, number, typeface) comes through unchanged.
export function lookFor(state: DesignState, target: LookTarget): DesignState {
  const { keeper } = state;
  if (target !== "keeper" || !keeper.included || !keeper.look) return state;
  return {
    ...state,
    ...keeper.look,
    nameNumberStyle: {
      ...state.nameNumberStyle,
      fill: keeper.nameNumberFill ?? contrastColor(keeper.look.colors.primary),
    },
  };
}

// Runs a look action against the keeper's shirt by applying it to the keeper-as-a-design and
// reading the look back, so patterns and colors follow the same rules as the team's.
function reduceKeeper(state: DesignState, action: LookAction): DesignState {
  const view = lookFor(state, "keeper");
  if (view === state) return state;
  const next = designReducer(view, action);
  if (next === view) return state;
  return {
    ...state,
    keeper: {
      ...state.keeper,
      look: { bodyPatternId: next.bodyPatternId, sleevePatternId: next.sleevePatternId, colors: next.colors },
      nameNumberFill: action.type === "SET_NN_FILL" ? next.nameNumberStyle.fill : state.keeper.nameNumberFill,
    },
  };
}
```

At the very top of `designReducer`'s body (before `switch`):

```ts
  if ("target" in action && action.target === "keeper") return reduceKeeper(state, action);
```

New cases and the reset change:

```ts
    case "SET_KEEPER_INCLUDED":
      if (state.keeper.included === action.value) return state;
      return {
        ...state,
        keeper: {
          ...state.keeper,
          included: action.value,
          look: state.keeper.look ?? (action.value ? defaultKeeperLook(state.colors) : null),
        },
      };
```
and in `RESET_DESIGN`'s returned object add:

```ts
        keeper: {
          included: state.keeper.included,
          look: state.keeper.included ? defaultKeeperLook(initialDesignState.colors) : null,
          nameNumberFill: null,
        },
```

- [ ] **Step 4: Implement in `design-history.ts`**

`groupKey` becomes target-aware:

```ts
function groupKey(action: DesignAction): string | null {
  const who = "target" in action && action.target === "keeper" ? "keeper:" : "";
  switch (action.type) {
    case "SET_COLOR":
      return `${who}color:${action.slot}`;
    ...
    case "SET_NN_FILL":
      return `${who}nn:fill`;
```
(leave the other cases as they are). In `sameDesign` add:

```ts
    a.keeper.included === b.keeper.included &&
    a.keeper.nameNumberFill === b.keeper.nameNumberFill &&
    JSON.stringify(a.keeper.look) === JSON.stringify(b.keeper.look) &&
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run tests/lib/state && npx tsc --noEmit`
Expected: PASS, no type errors. If `tsc` complains that `target` is missing on a narrowed action in `groupKey`, keep the `"target" in action` guard exactly as written.

- [ ] **Step 6: Commit**

```bash
git add lib/builder/state tests/lib/state
git commit -m "feat: the keeper's shirt is a second look in the design state"
```

---

### Task 6: Which shirt is shown and edited

**Files:**
- Modify: `lib/builder/state/design-context.tsx`, `components/builder/viewer/use-jersey-texture.ts`
- Test: `tests/lib/state/design-context.test.tsx`, `tests/components/viewer/use-jersey-texture.test.tsx`

**Interfaces:**
- Consumes: `lookFor`, `LookTarget`, `LookAction` (Task 5).
- Produces: `useDesign()` gains `editing: LookTarget` (always "player" while the keeper is out of the order), `setEditing(target: LookTarget): void`, `viewed: DesignState` (= `lookFor(state, editing)`); new hook `useEditedLook(): { view: DesignState; editing: LookTarget; dispatchLook(action: LookAction): void }`, which adds `target: "keeper"` to actions while the keeper is being edited.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/state/design-context.test.tsx` (use the file's existing render helper; if it has none, use `renderHook` with `DesignProvider` as the wrapper like `use-jersey-texture.test.tsx`'s `mount`):

```tsx
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { DesignProvider, useDesign, useEditedLook } from "@/lib/builder/state/design-context";

const wrapper = ({ children }: { children: ReactNode }) => <DesignProvider>{children}</DesignProvider>;
const mount = () => renderHook(() => ({ design: useDesign(), look: useEditedLook() }), { wrapper });

describe("which shirt is shown", () => {
  it("shows the player shirt until the keeper is chosen", () => {
    const { result } = mount();
    act(() => result.current.design.setEditing("keeper"));
    expect(result.current.design.editing).toBe("player");

    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.design.setEditing("keeper"));
    expect(result.current.design.editing).toBe("keeper");
    expect(result.current.design.viewed.colors.primary).toBe(result.current.design.state.keeper.look!.colors.primary);
  });

  it("goes back to the player shirt when the keeper is taken out", () => {
    const { result } = mount();
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.design.setEditing("keeper"));
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    expect(result.current.design.editing).toBe("player");
    expect(result.current.design.viewed).toBe(result.current.design.state);
  });

  it("edits the shirt being shown", () => {
    const { result } = mount();
    act(() => result.current.design.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => result.current.look.dispatchLook({ type: "SET_COLOR", slot: "primary", value: "#111111" }));
    expect(result.current.design.state.colors.primary).toBe("#111111");

    act(() => result.current.design.setEditing("keeper"));
    act(() => result.current.look.dispatchLook({ type: "SET_COLOR", slot: "primary", value: "#222222" }));
    expect(result.current.design.state.colors.primary).toBe("#111111");
    expect(result.current.design.state.keeper.look!.colors.primary).toBe("#222222");
    expect(result.current.look.view.colors.primary).toBe("#222222");
  });
});
```
(Add `describe, it, expect` imports from vitest if the file lacks them.)

Add to `tests/components/viewer/use-jersey-texture.test.tsx` a test following that file's conventions: mount, dispatch `SET_KEEPER_INCLUDED` true, `setEditing("keeper")`, then `await waitFor` until `lastCall()[1].colors.primary` (the design argument handed to `drawDesignToCanvas`) equals the keeper's primary. Check the position of the design argument in `drawDesignToCanvas`'s signature (`lastCall()[3]` is the images, so the design is one of the earlier arguments) before writing the assertion.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/lib/state/design-context.test.tsx tests/components/viewer/use-jersey-texture.test.tsx`
Expected: FAIL (`setEditing` is not a function).

- [ ] **Step 3: Implement `design-context.tsx`**

Replace the imports and add the new members:

```tsx
import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from "react";
import { canResetDesign, createHistory, historyReducer, type DesignDispatchAction, type HistoryAction } from "./design-history";
import { lookFor, type DesignState, type LookAction, type LookTarget } from "./design-state";

export type DesignContextValue = {
  state: DesignState;
  dispatch: (action: DesignDispatchAction) => void;
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  /** Which shirt the viewer shows and the panels edit. Always "player" while the keeper is out of the order. */
  editing: LookTarget;
  setEditing: (target: LookTarget) => void;
  /** The design as the shirt being shown wears it: what the viewer draws. */
  viewed: DesignState;
};
```

In `DesignProvider`, before `value`:

```tsx
  // UI state, not part of the design: it is not undone and is not saved with an order.
  const [wanted, setEditing] = useState<LookTarget>("player");
  const editing: LookTarget = history.present.keeper.included ? wanted : "player";
```
and extend the memo:

```tsx
      canReset: canResetDesign(history.present),
      editing,
      setEditing,
      viewed: lookFor(history.present, editing),
    }),
    [history, dispatch, editing]
```

Add the hook at the bottom:

```tsx
// What a panel that edits "the shirt" needs: that shirt's design and a dispatch aimed at it.
export function useEditedLook() {
  const { dispatch, editing, viewed } = useDesign();
  const dispatchLook = useCallback(
    (action: LookAction) => dispatch(editing === "keeper" ? { ...action, target: "keeper" } : action),
    [dispatch, editing]
  );
  return { view: viewed, editing, dispatchLook };
}
```

- [ ] **Step 4: Point the texture at the shown shirt**

In `use-jersey-texture.ts` change `const { state } = useDesign();` to `const { viewed: state } = useDesign();`. Nothing else in the file changes.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/lib/state tests/components/viewer && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/builder/state/design-context.tsx components/builder/viewer/use-jersey-texture.ts tests
git commit -m "feat: the viewer and the panels work on the shirt being shown"
```

---

### Task 7: Keeper switch, selector and panels

**Files:**
- Create: `components/builder/panels/EditingBadge.tsx`
- Modify: `components/builder/panels/GarmentsPanel.tsx`, `DesignPanel.tsx`, `ColorsPanel.tsx`, `TextPanel.tsx`, `components/builder/viewer/StageToolbar.tsx`
- Test: `tests/components/panels.test.tsx`, `tests/components/viewer/StageToolbar.test.tsx`

**Interfaces:**
- Consumes: `useDesign`, `useEditedLook` (Task 6), `SET_KEEPER_INCLUDED` (Task 5).
- Produces: a switch named "Sumar camiseta de arquero" in Prendas; a radiogroup "Camiseta" (radios "Jugador", "Arquero") in the stage toolbar, shown only when the keeper is in the order.

- [ ] **Step 1: Write the failing tests**

Add to `tests/components/panels.test.tsx`:

```tsx
describe("keeper in the panels", () => {
  it("adds the keeper from Prendas", () => {
    const { api } = renderWithDesign(<GarmentsPanel />);
    const toggle = screen.getByRole("switch", { name: "Sumar camiseta de arquero" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(api.current!.state.keeper.included).toBe(true);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("Diseño and Colores edit the keeper's shirt while it is shown", () => {
    const { api } = renderWithDesign(
      <>
        <DesignPanel />
        <ColorsPanel />
      </>
    );
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.setEditing("keeper"));
    expect(screen.getByText("Editando la camiseta del arquero")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.keeper.look!.bodyPatternId).toBe("diagonal");
    expect(api.current!.state.bodyPatternId).toBe(initialDesignState.bodyPatternId);

    fireEvent.change(screen.getByLabelText("Color primario"), { target: { value: "#123456" } });
    expect(api.current!.state.keeper.look!.colors.primary).toBe("#123456");
    expect(api.current!.state.colors.primary).toBe(initialDesignState.colors.primary);
  });

  it("hides the shorts color while the keeper is shown, since the shorts follow the team", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SHORTS_INCLUDED", value: true }));
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.getByText("Color del short")).toBeInTheDocument();
    act(() => api.current!.setEditing("keeper"));
    expect(screen.queryByText("Color del short")).toBeNull();
  });

  it("gives the keeper its own text color in Texto", () => {
    const { api } = renderWithDesign(<TextPanel />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    act(() => api.current!.setEditing("keeper"));
    fireEvent.change(screen.getByLabelText("Color del texto (arquero)"), { target: { value: "#ff00ff" } });
    expect(api.current!.state.keeper.nameNumberFill).toBe("#ff00ff");
    expect(api.current!.state.nameNumberStyle.fill).toBe(initialDesignState.nameNumberStyle.fill);
  });
});
```
(Import `initialDesignState` from `@/lib/builder/state/design-state` if the file does not already.)

Note: `TextPanel`'s color input is currently a `<label>` wrapping text and input; the test finds it by label text, so keep the input inside the label.

Add to `tests/components/viewer/StageToolbar.test.tsx`:

```tsx
describe("shirt selector", () => {
  it("only shows when the keeper is in the order", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    expect(screen.queryByRole("radiogroup", { name: "Camiseta" })).toBeNull();
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    expect(screen.getByRole("radio", { name: "Jugador" })).toHaveAttribute("aria-checked", "true");
  });

  it("switches what is shown", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("radio", { name: "Arquero" }));
    expect(api.current!.editing).toBe("keeper");
    expect(screen.getByRole("radio", { name: "Arquero" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Jugador" }));
    expect(api.current!.editing).toBe("player");
  });

  it("goes back to the player when the keeper is taken out", () => {
    const { api } = renderWithDesign(<StageToolbar />);
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: true }));
    fireEvent.click(screen.getByRole("radio", { name: "Arquero" }));
    act(() => api.current!.dispatch({ type: "SET_KEEPER_INCLUDED", value: false }));
    expect(api.current!.editing).toBe("player");
    expect(screen.queryByRole("radiogroup", { name: "Camiseta" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/components/panels.test.tsx tests/components/viewer/StageToolbar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `EditingBadge.tsx`**

```tsx
"use client";
import { useDesign } from "@/lib/builder/state/design-context";

// Reminds which shirt a panel is changing, only while that is the keeper's.
export function EditingBadge() {
  const { editing } = useDesign();
  if (editing !== "keeper") return null;
  return (
    <p className="mb-3 rounded-xl bg-accent-soft px-3 py-2 text-sm font-medium">Editando la camiseta del arquero</p>
  );
}
```

- [ ] **Step 4: `GarmentsPanel.tsx`**

After the closing `</div>` of the `radiogroup` (the `grid` div) and before `</PanelShell>`, replace the empty line with:

```tsx
      <button
        type="button"
        role="switch"
        aria-checked={state.keeper.included}
        aria-labelledby="keeper-label"
        aria-describedby="keeper-hint"
        onClick={() => dispatch({ type: "SET_KEEPER_INCLUDED", value: !state.keeper.included })}
        className={`${OPTION} ${border(state.keeper.included)} mt-3 w-full justify-between md:p-4`}
      >
        <span className="flex flex-col">
          <span id="keeper-label" className="text-base font-semibold">
            Sumar camiseta de arquero
          </span>
          <span id="keeper-hint" className="font-normal text-muted">
            Colores y patrón propios. Comparte escudo y sponsors.
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
            state.keeper.included ? "bg-foreground" : "bg-black/20"
          }`}
        >
          <span
            className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
              state.keeper.included ? "translate-x-5" : ""
            }`}
          />
        </span>
      </button>
```

- [ ] **Step 5: `DesignPanel.tsx`**

Replace `const { state, dispatch } = useDesign();` with `const { view, dispatchLook } = useEditedLook();` (import `useEditedLook` instead of `useDesign`). In the body use `view` wherever `state` was and `dispatchLook` wherever `dispatch` was:

```tsx
      <EditingBadge />
      <div role="tablist" ...>   {/* unchanged */}
      <PatternGrid
        patterns={isTorso ? BODY_PATTERNS : SLEEVE_PATTERNS}
        selectedId={isTorso ? view.bodyPatternId : view.sleevePatternId}
        colorsFor={(p) => colorsAfterPatternChange(view, isTorso ? "body" : "sleeve", p.id)}
        onSelect={(id) =>
          dispatchLook(isTorso ? { type: "SET_BODY_PATTERN", id } : { type: "SET_SLEEVE_PATTERN", id })
        }
      />
```
Import `EditingBadge` from `./EditingBadge`. Put `<EditingBadge />` as the first child of `PanelShell`.

- [ ] **Step 6: `ColorsPanel.tsx`**

```tsx
  const { state, dispatch, editing } = useDesign();
  const { view, dispatchLook } = useEditedLook();
  const rows = [
    ...visibleColors(view.bodyPatternId, view.sleevePatternId).map((c) => ({ slot: c.role, label: c.label })),
    { slot: "collar" as const, label: "Color del cuello" },
  ];
```
Inside the rows map use `view.colors[slot]` for the displayed value and `dispatchLook({ type: "SET_COLOR", slot, value: e.target.value })` for changes. Put `<EditingBadge />` first in `PanelShell`. Change the shorts block's condition to `state.shorts.included && editing === "player" &&` (the shorts follow the team's colors, so the block would mislead). Keep the shorts swatches reading from `state.colors`. Import `useEditedLook` and `EditingBadge`.

- [ ] **Step 7: `TextPanel.tsx`**

Add `const { view, editing, dispatchLook } = useEditedLook();` next to the existing `useDesign()` call. Name, number, style and outline keep using `state`/`dispatch` (shared). Change only:

- thumbnail background: `view.colors.primary`, and `color: view.nameNumberStyle.fill`
- the fill input:

```tsx
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          {editing === "keeper" ? "Color del texto (arquero)" : "Color del texto"}
          <input
            type="color"
            value={view.nameNumberStyle.fill}
            onChange={(e) => dispatchLook({ type: "SET_NN_FILL", value: e.target.value })}
            className={COLOR_INPUT}
          />
        </label>
```
The existing `style` const (`state.nameNumberStyle`) keeps feeding `selectedId` and `outline`.

- [ ] **Step 8: `StageToolbar.tsx`**

```tsx
const SHIRTS = [
  { target: "player", label: "Jugador" },
  { target: "keeper", label: "Arquero" },
] as const;
```
Destructure `const { state, dispatch, canReset, editing, setEditing } = useDesign();` and change the container and content:

```tsx
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap items-center justify-center gap-2 px-4">
      {state.keeper.included && (
        <div
          role="radiogroup"
          aria-label="Camiseta"
          className="pointer-events-auto flex h-11 rounded-full bg-white/80 p-1 shadow-sm"
        >
          {SHIRTS.map(({ target, label }) => (
            <button
              key={target}
              type="button"
              role="radio"
              aria-checked={editing === target}
              onClick={() => setEditing(target)}
              className={`rounded-full px-4 text-sm font-semibold transition ${
                editing === target ? "bg-foreground text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {/* existing reset <button> unchanged */}
    </div>
```

- [ ] **Step 9: Run tests, typecheck, lint**

Run: `npx vitest run tests/components && npx tsc --noEmit && npm run lint`
Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add components tests
git commit -m "feat: add the keeper from Prendas and switch which shirt is shown and edited"
```

---

### Task 8: Crest creator panel

**Files:**
- Create: `components/builder/panels/CrestCreator.tsx`
- Modify: `components/builder/panels/CrestPanel.tsx`
- Test: `tests/components/panels.test.tsx`

**Interfaces:**
- Consumes: `CREST_SHAPES`, `CREST_SYMBOLS`, `CREST_DIVISIONS`, `INITIAL_CREST`, `cleanInitials`, `MAX_INITIALS`, `crestDataUrl`, action `SET_CREST_CONFIG`.
- Produces: `CrestPanel` with tabs **Subir el mío** and **Crear escudo**. Accessible names the tests rely on: tab "Crear escudo"; radiogroups "Forma" (radios "Forma 1".."Forma 25"), "Fondo" (radios "Liso", "Mitad", "Franjas", "Banda"), "Símbolo" (radios "Sin símbolo", each symbol label, "Iniciales"); color inputs "Color principal del escudo" and "Color secundario del escudo"; text input "Iniciales"; preview image alt "Vista previa del escudo".

- [ ] **Step 1: Invoke the `hallmark` skill**

The user asked to use `hallmark` when a tool panel needs improving. Invoke it for the design pass on this panel (compact mobile bottom sheet that scrolls at `max-h-[28dvh]`, desktop column 22rem wide, existing look: `PanelShell`, `rounded-2xl bg-white/70` cards, `border-foreground` selected state). The behavior and accessible names below are fixed; layout, spacing and visual treatment of the grids may follow hallmark's guidance. Keep to the panel's existing conventions rather than inventing a new style.

- [ ] **Step 2: Write the failing tests**

Add to `tests/components/panels.test.tsx` (the file already mocks `loadImage`):

```tsx
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";

describe("crest creator", () => {
  it("puts a first crest on the shirt when there is none", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    expect(api.current!.state.crestConfig).toEqual(INITIAL_CREST);
    expect(api.current!.state.logoDataUrl).toBe(crestDataUrl(INITIAL_CREST));
  });

  it("leaves an uploaded crest alone until the creator is used", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    act(() => api.current!.dispatch({ type: "SET_LOGO", dataUrl: "data:image/png;base64,AAAA" }));
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    expect(api.current!.state.logoDataUrl).toBe("data:image/png;base64,AAAA");
    expect(api.current!.state.crestConfig).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Forma 3" }));
    expect(api.current!.state.crestConfig?.shapeId).toBe(CREST_SHAPES[2].id);
    expect(api.current!.state.logoDataUrl).toBe(crestDataUrl(api.current!.state.crestConfig!));
  });

  it("chooses shape, background, colors and symbol", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));

    fireEvent.click(screen.getByRole("radio", { name: "Forma 7" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mitad" }));
    fireEvent.change(screen.getByLabelText("Color principal del escudo"), { target: { value: "#112233" } });
    fireEvent.change(screen.getByLabelText("Color secundario del escudo"), { target: { value: "#ffcc00" } });
    fireEvent.click(screen.getByRole("radio", { name: "Estrella" }));

    expect(api.current!.state.crestConfig).toEqual({
      shapeId: CREST_SHAPES[6].id,
      divisionId: "half",
      colors: { primary: "#112233", secondary: "#ffcc00" },
      symbol: { kind: "icon", id: "star" },
    });
  });

  it("takes initials, cleaned and limited to three", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("radio", { name: "Iniciales" }));
    fireEvent.change(screen.getByLabelText("Iniciales"), { target: { value: "a b<c>d" } });
    expect(api.current!.state.crestConfig?.symbol).toEqual({ kind: "initials", text: "ABC" });
    fireEvent.click(screen.getByRole("radio", { name: "Sin símbolo" }));
    expect(api.current!.state.crestConfig?.symbol).toBeNull();
  });

  it("removes the made crest", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear escudo" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(api.current!.state.crestConfig).toBeNull();
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("opens on the creator when the crest was made, and on the upload otherwise", () => {
    const first = renderWithDesign(<CrestPanel />);
    expect(screen.getByRole("tab", { name: "Subir el mío" })).toHaveAttribute("aria-selected", "true");
    first.unmount();

    const { api } = renderWithDesign(<CrestPanel />);
    act(() => api.current!.dispatch({ type: "SET_CREST_CONFIG", config: INITIAL_CREST }));
  });
});
```
The last test's final render does not reopen the panel; replace it with a `DesignProvider`-seeded check only if the existing helper can start from a state. If it cannot, drop the second half and keep the first assertion (the default tab), since the "opens on the creator when made" branch is a one-line initial state.

The existing upload tests in this file use the label "Subir escudo" for the file input; with the default tab being upload they must keep passing unchanged.

- [ ] **Step 3: Run to see them fail**

Run: `npx vitest run tests/components/panels.test.tsx`
Expected: FAIL (no tab "Crear escudo").

- [ ] **Step 4: Implement `CrestCreator.tsx`**

```tsx
"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import { CREST_SHAPES } from "@/lib/builder/catalog/crest-shapes";
import { CREST_SYMBOLS } from "@/lib/builder/catalog/crest-symbols";
import {
  CREST_DIVISIONS,
  INITIAL_CREST,
  MAX_INITIALS,
  cleanInitials,
  type CrestConfig,
} from "@/lib/builder/crest/crest-config";
import { crestDataUrl } from "@/lib/builder/crest/crest-svg";

const CHIP = "flex items-center justify-center rounded-xl border-2 bg-white/70 text-sm font-medium";
const border = (checked: boolean) => (checked ? "border-foreground" : "border-transparent hover:border-line");
const COLOR_INPUT = "h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent";

function Group({ label, children, className }: { label: string; children: React.ReactNode; className: string }) {
  return (
    <div className="mt-5">
      <p id={`crest-${label}`} className="mb-2 text-sm font-semibold">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`crest-${label}`} className={className}>
        {children}
      </div>
    </div>
  );
}

export function CrestCreator() {
  const { state, dispatch } = useDesign();
  // Until the first edit the creator shows the starting crest; the shirt keeps what it had.
  const config = state.crestConfig ?? INITIAL_CREST;
  const update = (patch: Partial<CrestConfig>) =>
    dispatch({ type: "SET_CREST_CONFIG", config: { ...config, ...patch } });
  const symbol = config.symbol;
  const symbolChoice = symbol === null ? "none" : symbol.kind === "icon" ? symbol.id : "initials";

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
      <img src={crestDataUrl(config)} alt="Vista previa del escudo" className="mx-auto h-24 w-24" />

      <Group label="Forma" className="grid grid-cols-5 gap-2">
        {CREST_SHAPES.map((shape, index) => {
          const checked = shape.id === config.shapeId;
          return (
            <button
              key={shape.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`Forma ${index + 1}`}
              onClick={() => update({ shapeId: shape.id })}
              className={`${CHIP} aspect-square p-1.5 ${border(checked)}`}
            >
              <svg
                aria-hidden="true"
                viewBox={`${shape.box.x} ${shape.box.y} ${shape.box.width} ${shape.box.height}`}
                className="h-full w-full text-foreground"
              >
                <path d={shape.d} fill="currentColor" />
              </svg>
            </button>
          );
        })}
      </Group>

      <Group label="Fondo" className="grid grid-cols-4 gap-2">
        {CREST_DIVISIONS.map((division) => {
          const checked = division.id === config.divisionId;
          return (
            <button
              key={division.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => update({ divisionId: division.id })}
              className={`${CHIP} h-10 ${border(checked)}`}
            >
              {division.label}
            </button>
          );
        })}
      </Group>

      <div className="mt-3 flex flex-col gap-2">
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Color principal del escudo
          <input
            type="color"
            value={config.colors.primary}
            onChange={(e) => update({ colors: { ...config.colors, primary: e.target.value } })}
            className={COLOR_INPUT}
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Color secundario del escudo
          <input
            type="color"
            value={config.colors.secondary}
            onChange={(e) => update({ colors: { ...config.colors, secondary: e.target.value } })}
            className={COLOR_INPUT}
          />
        </label>
      </div>

      <Group label="Símbolo" className="grid grid-cols-5 gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={symbolChoice === "none"}
          onClick={() => update({ symbol: null })}
          className={`${CHIP} h-10 text-xs ${border(symbolChoice === "none")}`}
        >
          Sin símbolo
        </button>
        {CREST_SYMBOLS.map((def) => {
          const checked = symbolChoice === def.id;
          return (
            <button
              key={def.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={def.label}
              onClick={() => update({ symbol: { kind: "icon", id: def.id } })}
              className={`${CHIP} h-10 p-2 ${border(checked)}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full text-foreground">
                <path d={def.d} fill="currentColor" fillRule="evenodd" />
              </svg>
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={symbolChoice === "initials"}
          onClick={() => update({ symbol: { kind: "initials", text: symbol?.kind === "initials" ? symbol.text : "" } })}
          className={`${CHIP} h-10 text-xs ${border(symbolChoice === "initials")}`}
        >
          Iniciales
        </button>
      </Group>

      {symbol?.kind === "initials" && (
        <input
          type="text"
          aria-label="Iniciales"
          maxLength={MAX_INITIALS}
          autoComplete="off"
          value={symbol.text}
          onChange={(e) => update({ symbol: { kind: "initials", text: cleanInitials(e.target.value) } })}
          className="mt-3 w-full rounded-xl border border-line bg-white/80 px-3 py-2 text-base uppercase outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        />
      )}
    </div>
  );
}
```
Note: `maxLength` on the input would block pasting "a b<c>d" before cleaning in a real browser but `fireEvent.change` bypasses it; keep `maxLength` off if a manual check shows pasted text being cut before cleaning (then rely on `cleanInitials` alone).

- [ ] **Step 5: Implement `CrestPanel.tsx`**

```tsx
"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { INITIAL_CREST } from "@/lib/builder/crest/crest-config";
import { useImageUpload } from "@/lib/builder/io/use-image-upload";
import { UploadIcon } from "../icons";
import { CrestCreator } from "./CrestCreator";
import { PanelShell } from "./PanelShell";

type Mode = "upload" | "create";
const MODES: { id: Mode; label: string }[] = [
  { id: "upload", label: "Subir el mío" },
  { id: "create", label: "Crear escudo" },
];

export function CrestPanel() {
  const { state, dispatch } = useDesign();
  const { error, handleFile, cancelPending } = useImageUpload((dataUrl) => dispatch({ type: "SET_LOGO", dataUrl }));
  const [mode, setMode] = useState<Mode>(state.crestConfig ? "create" : "upload");

  // Opening the creator with no crest at all shows a first one at once; an uploaded crest is
  // only replaced when the user actually picks something in the creator.
  function choose(next: Mode) {
    setMode(next);
    if (next === "create" && !state.logoDataUrl) dispatch({ type: "SET_CREST_CONFIG", config: INITIAL_CREST });
  }

  return (
    <PanelShell
      title="Escudo"
      hint={mode === "upload" ? "PNG, JPG o SVG. Máximo 2 MB." : "Armá un escudo si todavía no tenés uno."}
    >
      <div role="tablist" aria-label="Origen del escudo" className="mb-4 grid grid-cols-2 rounded-2xl bg-black/5 p-1">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => choose(id)}
            className={[
              "rounded-xl py-2 text-sm font-semibold transition",
              mode === id ? "bg-white shadow-sm" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/70 p-6 text-sm font-medium hover:border-accent focus-within:ring-2 focus-within:ring-foreground/60">
            <UploadIcon className="h-7 w-7 text-muted" />
            <span>Subir escudo</span>
            <input
              type="file"
              aria-label="Subir escudo"
              accept="image/png,image/jpeg,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {error && (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </>
      ) : (
        <CrestCreator />
      )}

      {state.logoDataUrl && (
        <button
          type="button"
          onClick={() => {
            cancelPending();
            dispatch({ type: "SET_LOGO", dataUrl: null });
          }}
          className="mt-3 self-start rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          Quitar escudo
        </button>
      )}
    </PanelShell>
  );
}
```

- [ ] **Step 6: Run tests, typecheck, lint**

Run: `npx vitest run tests/components/panels.test.tsx && npx tsc --noEmit && npm run lint`
Expected: PASS. Fix any failure in an existing upload test by checking it still finds "Subir escudo" in the default tab.

- [ ] **Step 7: Look at it**

With the user's dev server (`localhost:3000`, never kill it), screenshot the Escudo panel in "Crear escudo" with headless Chrome as in the how-we-work notes, at desktop width and at ~500px. Check the grids read well, the 25 shapes fit without a horizontal scroll, and the crest shows on the 3D shirt. Say plainly what could not be seen.

- [ ] **Step 8: Commit**

```bash
git add components/builder/panels tests/components/panels.test.tsx
git commit -m "feat: the crest panel can build a crest from shape, background, colors and symbol"
```

---

### Task 9: Keeper in the roster and the order

**Files:**
- Modify: `lib/checkout/order.ts`, `lib/checkout/order-storage.ts`, `lib/checkout/payment.ts`, `components/checkout/RosterTable.tsx`, `components/checkout/CheckoutView.tsx`, `components/checkout/ConfirmationPage.tsx`
- Test: `tests/lib/checkout/order.test.ts`, `tests/lib/checkout/order-storage.test.ts`, `tests/lib/checkout/payment.test.ts`, `tests/components/checkout/RosterTable.test.tsx`, `tests/components/checkout/ConfirmationPage.test.tsx`

**Interfaces:**
- Produces: `PlayerLine.keeper: boolean` (default `false`); `Order.keeperThumbnails?: Thumbnails | null`; `orderFromDesign(design, thumbnails, previous, keeperThumbnails: Thumbnails | null = null)`; `RosterTable` prop `withKeeper?: boolean` (default `false`).

- [ ] **Step 1: Write the failing tests**

`tests/lib/checkout/order.test.ts`: change the existing add-player expectation to include `keeper: false` (`{ id: "b", name: "", number: "", size: "M", shortsSize: "M", keeper: false }`) and add:

```ts
it("marks and unmarks a keeper, ignoring anything that is not a boolean", () => {
  const order = orderWith(createPlayerLine("a"));
  const marked = orderReducer(order, { type: "UPDATE_PLAYER", id: "a", patch: { keeper: true } });
  expect(marked.roster[0].keeper).toBe(true);
  const junk = orderReducer(marked, { type: "UPDATE_PLAYER", id: "a", patch: { keeper: "yes" as unknown as boolean } });
  expect(junk.roster[0].keeper).toBe(true);
  expect(orderReducer(marked, { type: "UPDATE_PLAYER", id: "a", patch: { keeper: false } }).roster[0].keeper).toBe(false);
});

it("keeps the keeper's thumbnails when the order is made from the design", () => {
  const keeperThumbnails = { front: "KF", back: "KB" };
  const order = orderFromDesign(initialDesignState, null, null, keeperThumbnails);
  expect(order.keeperThumbnails).toEqual(keeperThumbnails);
  expect(orderFromDesign(initialDesignState, null, null).keeperThumbnails).toBeNull();
});
```

`tests/lib/checkout/order-storage.test.ts`:

```ts
it("loads a roster saved before the keeper existed, with nobody as keeper", () => {
  clearOrder();
  window.sessionStorage.setItem(
    ORDER_KEY,
    JSON.stringify({
      design: initialDesignState,
      thumbnails: null,
      roster: [{ id: "a", name: "Leo", number: "10", size: "M", shortsSize: "M" }],
    })
  );
  expect(loadOrder()?.roster[0].keeper).toBe(false);
});

it("rejects an order whose keeper thumbnails are not a pair of images", () => {
  clearOrder();
  window.sessionStorage.setItem(
    ORDER_KEY,
    JSON.stringify({ design: initialDesignState, thumbnails: null, keeperThumbnails: { front: 1 }, roster: [createPlayerLine("a")] })
  );
  expect(loadOrder()).toBeNull();
});
```

`tests/lib/checkout/payment.test.ts`: add

```ts
it("only counts a roster line as keeper when the keeper is in the design", async () => {
  const roster = [createPlayerLine("a", { keeper: true }), createPlayerLine("b")];
  const without = await payWithRipple({ design: initialDesignState, thumbnails: null, roster }, contact, async () => {});
  expect(without.roster.map((l) => l.keeper)).toEqual([false, false]);

  const design = { ...initialDesignState, keeper: { ...initialDesignState.keeper, included: true } };
  const withKeeper = await payWithRipple({ design, thumbnails: null, roster }, contact, async () => {});
  expect(withKeeper.roster.map((l) => l.keeper)).toEqual([true, false]);
});
```
(Use the `contact` fixture already defined in that file; import `createPlayerLine` and `initialDesignState` if needed.)

`tests/components/checkout/RosterTable.test.tsx`: extend `Harness` with `withKeeper = false` forwarded to `RosterTable`, then add:

```tsx
it("has no keeper column unless the keeper is in the design", () => {
  render(<Harness initial={order(createPlayerLine("a"))} />);
  expect(screen.queryByLabelText("Arquero: jugador 1")).toBeNull();
});

it("marks who plays in goal", () => {
  render(<Harness initial={order(createPlayerLine("a"), createPlayerLine("b"))} withKeeper />);
  expect(screen.getByText("Marcá quién es el arquero.")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Arquero: jugador 2"));
  expect(screen.getByLabelText("Arquero: jugador 2")).toBeChecked();
  expect(screen.getByLabelText("Arquero: jugador 1")).not.toBeChecked();
  expect(screen.queryByText("Marcá quién es el arquero.")).toBeNull();
});
```

`tests/components/checkout/ConfirmationPage.test.tsx`: add a test that a confirmation whose roster line has `keeper: true` shows "Arquero" in that line's row and a line without it does not (follow the file's existing way of rendering a confirmation).

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/lib/checkout tests/components/checkout`
Expected: FAIL.

- [ ] **Step 3: `order.ts`**

```ts
export type PlayerLine = {
  id: string;
  name: string;
  number: string;
  size: Size;
  shortsSize: Size;
  /** Wears the keeper's shirt. Only counts while the keeper is in the design. */
  keeper: boolean;
};
```
`Order` gets `keeperThumbnails?: Thumbnails | null;` (comment: the keeper's shirt, when the design has one). `createPlayerLine` default `{ id, name: "", number: "", size: "M", shortsSize: "M", keeper: false, ...patch }`. In `cleanPatch` add `if (typeof patch.keeper === "boolean") clean.keeper = patch.keeper;`. `orderFromDesign` gets the fourth parameter `keeperThumbnails: Thumbnails | null = null` and includes `keeperThumbnails` in both returned objects.

- [ ] **Step 4: `order-storage.ts`**

In `isPlayerLine` add `(value.keeper === undefined || typeof value.keeper === "boolean") &&` (before the `shortsSize` clause, keeping the final expression a single boolean chain). In `isOrder` add the keeper thumbnails check:

```ts
  const keeperOk = value.keeperThumbnails === undefined || value.keeperThumbnails === null || isImagePair(value.keeperThumbnails);
  return thumbsOk && keeperOk && Array.isArray(value.roster) && ...
```
In `withShortsDefaults` map: `roster: order.roster.map((line) => ({ ...line, shortsSize: line.shortsSize ?? "M", keeper: line.keeper ?? false }))`.

- [ ] **Step 5: `payment.ts`**

```ts
  const keeperIncluded = order.design.keeper.included;
  ...
    roster: order.roster.map((line) => ({ ...line, keeper: line.keeper && keeperIncluded })),
```

- [ ] **Step 6: `RosterTable.tsx`**

Replace the two column constants with a lookup (Tailwind needs whole class strings):

```tsx
const COLUMNS = {
  base: "grid-cols-[minmax(0,1fr)_3rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_2.5rem]",
  shorts: "grid-cols-[minmax(0,1fr)_3rem_3.75rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_6.5rem_2.5rem]",
  keeper: "grid-cols-[minmax(0,1fr)_3rem_3.75rem_3rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_4.5rem_2.5rem]",
  both: "grid-cols-[minmax(0,1fr)_3rem_3.75rem_3.75rem_3rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_6.5rem_4.5rem_2.5rem]",
};

function columnsFor(withShorts: boolean, withKeeper: boolean): string {
  if (withShorts && withKeeper) return COLUMNS.both;
  if (withShorts) return COLUMNS.shorts;
  return withKeeper ? COLUMNS.keeper : COLUMNS.base;
}
```
Add `withKeeper?: boolean` to `Props` and `RowProps` (`withKeeper: boolean`), compute `const columns = columnsFor(withShorts, withKeeper)` in the row and the header, and replace the two uses of the old constants with `columns`. After the shorts size `<select>` and before the remove button, add:

```tsx
      {withKeeper && (
        <label className="flex h-10 items-center justify-center">
          <input
            type="checkbox"
            aria-label={`Arquero: jugador ${n}`}
            checked={line.keeper}
            onChange={(e) => dispatch({ type: "UPDATE_PLAYER", id: line.id, patch: { keeper: e.target.checked } })}
            className="h-5 w-5"
          />
        </label>
      )}
```
In the header add `{withKeeper && <span>Arquero</span>}` after the shorts header. `RosterTable({ roster, errors, dispatch, withShorts, withKeeper = false })` passes `withKeeper` to rows, and below the `<ul>`:

```tsx
      {withKeeper && !roster.some((line) => line.keeper) && (
        <p className="mt-3 text-sm text-muted">Marcá quién es el arquero.</p>
      )}
```

- [ ] **Step 7: `CheckoutView.tsx` and `ConfirmationPage.tsx`**

`CheckoutView`: pass `withKeeper={order.design.keeper.included}` to `<RosterTable>`. `ConfirmationPage`: in the line's right-hand text, after the size/shorts text add `{line.keeper && " · Arquero"}`.

- [ ] **Step 8: Run tests, typecheck, lint**

Run: `npx vitest run tests/lib/checkout tests/components/checkout && npx tsc --noEmit && npm run lint`
Expected: PASS. `tsc` will point at every place that builds a `PlayerLine` by hand; add `keeper: false` there.

- [ ] **Step 9: Commit**

```bash
git add lib/checkout components/checkout tests
git commit -m "feat: mark who plays in goal in the roster"
```

---

### Task 10: Keeper photos in the review and checkout

**Files:**
- Modify: `components/builder/Header.tsx`, `components/builder/BuilderPage.tsx`, `components/checkout/DesignPreview.tsx`
- Test: `tests/components/BuilderPage.test.tsx`, `tests/components/Header.test.tsx`, `tests/components/checkout/CheckoutView.test.tsx`

**Interfaces:**
- Consumes: `captureThumbnails` (`lib/checkout/thumbnails.ts`, existing), `setEditing` (Task 6), `Order.keeperThumbnails`, `orderFromDesign`'s fourth parameter (Task 9).
- Produces: `Header`'s `onReview(design: DesignState, showKit: (target: LookTarget) => void)`; `DesignPreview` shows a second pair of photos titled "Arquero" when `order.keeperThumbnails` is set.

- [ ] **Step 1: Write the failing tests**

`tests/components/BuilderPage.test.tsx`: this file mocks `@/lib/checkout/thumbnails` with a factory (around line 13); add `captureThumbnails: vi.fn()` to it and a handle like the existing `captureDesignImages` one. Add:

```tsx
it("also photographs the keeper's shirt when the keeper is in the design, then goes back to the player", async () => {
  captureDesignImages.mockResolvedValue({ thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } });
  captureThumbnails.mockResolvedValue({ front: "KF", back: "KB" });
  // Render the page, switch the keeper on in Prendas, press "Revisar diseño" (copy the way the
  // neighboring "Revisar diseño" tests do it), then:
  await waitFor(() => expect(captureThumbnails).toHaveBeenCalledTimes(1));
  expect(loadOrder()!.keeperThumbnails).toEqual({ front: "KF", back: "KB" });
  expect(screen.getByRole("radio", { name: "Jugador" })).toHaveAttribute("aria-checked", "true");
});

it("does not photograph a keeper when there is none", async () => {
  captureDesignImages.mockResolvedValue({ thumbnails: { front: "F", back: "B" }, images: { front: "FF", back: "BB" } });
  // press "Revisar diseño" as in the test above, without adding the keeper
  await waitFor(() => expect(loadOrder()).not.toBeNull());
  expect(captureThumbnails).not.toHaveBeenCalled();
  expect(loadOrder()!.keeperThumbnails).toBeNull();
});
```
`tests/components/Header.test.tsx`: wherever it asserts `onReview` was called with the design, change it to `expect(onReview).toHaveBeenCalledWith(expect.objectContaining({ projectName: ... }), expect.any(Function))` (read the existing assertion and keep its intent).

`tests/components/checkout/CheckoutView.test.tsx`: add a test rendering an order with `keeperThumbnails: { front: "data:image/jpeg;base64,KF", back: "data:image/jpeg;base64,KB" }` and expecting images with alt "Camiseta del arquero de frente" and "Camiseta del arquero de espalda"; and one without it expecting `queryByAltText("Camiseta del arquero de frente")` to be null.

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run tests/components/BuilderPage.test.tsx tests/components/Header.test.tsx tests/components/checkout/CheckoutView.test.tsx`
Expected: FAIL.

- [ ] **Step 3: `Header.tsx`**

Change the prop type to `onReview: (design: DesignState, showKit: (target: LookTarget) => void) => void;`, import `type LookTarget` from the design state, take `setEditing` from `useDesign()` (`const { state, dispatch, setEditing } = useDesign();`) and call `onReview(state, setEditing)` on click.

- [ ] **Step 4: `BuilderPage.tsx`**

Import `captureThumbnails` next to `captureDesignImages`, and `type { Thumbnails } from "@/lib/checkout/order"`, `type { LookTarget } from "@/lib/builder/state/design-state"`. Rewrite `handleReview`:

```tsx
  async function handleReview(design: DesignState, showKit: (target: LookTarget) => void) {
    if (reviewing || sharing) return;
    setReviewing(true);
    let captured = null;
    let keeperThumbnails: Thumbnails | null = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const options = { canvas, showView: (side: ViewSide) => requestView(side, true), wait: pause };
      try {
        captured = await captureDesignImages(options);
      } catch {
        captured = null;
      }
      // The keeper's shirt is photographed after the player's: the viewer shows it for a moment,
      // then goes back to the player. Only small photos: the AI try-on uses the player shirt.
      if (captured && design.keeper.included) {
        showKit("keeper");
        try {
          keeperThumbnails = await captureThumbnails(options);
        } catch {
          keeperThumbnails = null;
        } finally {
          showKit("player");
        }
      }
    }
    // The big images (for the AI try-on) are kept apart; stale ones must not outlive a failed capture.
    if (captured) saveDesignImages(captured.images);
    else clearDesignImages();
    saveOrder(orderFromDesign(design, captured?.thumbnails ?? null, loadOrder(), keeperThumbnails));
    router.push("/checkout", { transitionTypes: ["nav-forward"] });
  }
```
(`ViewSide` is already imported in this file.)

- [ ] **Step 5: `DesignPreview.tsx`**

After the existing `thumbnails ? (...) : (...)` block and before `<AiTryOn />`:

```tsx
      {order.keeperThumbnails && (
        <div className="mt-4">
          <h3 className="mb-2 text-sm font-semibold">Arquero</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
            <img src={order.keeperThumbnails.front} alt="Camiseta del arquero de frente" className="w-full rounded-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL made in the browser, nothing to optimize */}
            <img src={order.keeperThumbnails.back} alt="Camiseta del arquero de espalda" className="w-full rounded-2xl" />
          </div>
        </div>
      )}
```
Show it only when `order.design.keeper.included`: `{order.design.keeper.included && order.keeperThumbnails && (`.

- [ ] **Step 6: Run the whole suite and typecheck**

Run: `npm test > test-out.txt; code=$?; tail -30 test-out.txt; echo exit=$code; npx tsc --noEmit; npm run lint`
Expected: exit 0, no type or lint errors. Delete `test-out.txt` afterwards (do not commit it).

- [ ] **Step 7: Commit**

```bash
git add components tests
git commit -m "feat: photograph the keeper's shirt when reviewing and show it in the checkout"
```

---

### Task 11: Full verification and a look at the app

**Files:** none new.

- [ ] **Step 1: Everything green**

Run, reading each real exit code: `npm test > out.txt; echo $?`, `npx tsc --noEmit; echo $?`, `npm run lint; echo $?`, `npm run build > build.txt; echo $?`.
Expected: all 0. If the build fails, read `build.txt` before changing anything.

- [ ] **Step 2: Screenshots** (the user's dev server on `localhost:3000`, never killed; recipe in the how-we-work notes)

Check, and say plainly which could not be checked:
1. Escudo panel, "Crear escudo": the 25 shapes grid, symbols grid, preview; a made crest visible on the 3D chest (front view).
2. Prendas with the keeper switch on; the toolbar's Jugador | Arquero selector; the keeper shirt in the viewer with its number readable on the back.
3. Checkout: roster with the keeper column (with and without shorts), the keeper photos in "Tu diseño".
4. Mobile width (~500px): the toolbar selector wrapping, the creator inside the folded bottom sheet.

- [ ] **Step 3: Update memory**

Write a project memory (`keeper-crest.md`) with the decisions that are not in the code: keeper shares crest/sponsors/typeface but has its own look and name/number color (auto contrast); crest creator scope; the open items (symbols to tune by eye, example keeper price, short follows the player look, AI try-on and story still player-only). Add its line to `MEMORY.md`.

- [ ] **Step 4: Hand off**

Tell the user what was verified and what was not seen on screen. Push and the compare-URL PR only when they ask ("subamos y pr").
