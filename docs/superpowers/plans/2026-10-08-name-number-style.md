# Estilo de nombre y número — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el nombre y el número de la espalda se puedan dibujar con 6 estilos (fuente, contorno, sombra, color) elegibles y ajustables desde el panel "Nombre y número".

**Architecture:** Un campo nuevo `nameNumberStyle` en `DesignState` (con sus acciones, dentro del historial de deshacer) describe el estilo. Un catálogo puro de presets da los valores iniciales y la fuente (como variable CSS de `next/font/google`). El compositor 2D lee el estilo y dibuja sombra → contorno → relleno; `JerseyModel` resuelve la familia tipográfica real desde la variable CSS y espera a que cargue antes de repintar. `TextPanel` muestra la cuadrícula de presets y los controles.

**Tech Stack:** Next.js 16.3.7 (App Router, `next/font/google`), React 19, TypeScript, Tailwind 4, three / react-three-fiber, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-08-name-number-style-design.md`

## Global Constraints

- Presets y fuentes exactos: Clásico = Oswald 700; Moderno = Montserrat 800; Retro = Righteous 400; Bloque = Anton 400; Elegante = Playfair Display 900; Contorno = Alfa Slab One 400.
- Las fuentes se cargan con `next/font/google`, subset `latin`, solo esos pesos. El proyecto usa Next 16.3.7 con cambios respecto a lo conocido: la guía está en `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`.
- Nada de esto toca el modelo 3D ni el mapeo UV. Las posiciones del nombre (v=0.15) y del número (v=0.55) en `bodyBack` no cambian, y el texto de la espalda se sigue dibujando rotado 180° (`Math.PI`).
- El nombre y el número comparten el mismo estilo.
- Un nombre largo se reduce para que quepa en el ancho de `bodyBack`.
- Texto de la interfaz en español, igual que el resto de la app.
- Los mensajes de commit terminan con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Comandos: tests con `npm test` (vitest run); un solo archivo con `npx vitest run <ruta>`; lint con `npm run lint`.

## Review Focus

- Nombre muy largo (p. ej. 26 letras): debe achicarse hasta caber en el 80 % del ancho de la espalda, no salirse de la camiseta. → Task 2.
- `presetId` desconocido en el estado: el compositor y el panel deben caer al preset Clásico, no romperse. → Tasks 1 y 2.
- Sombra con el texto rotado 180°: el desplazamiento de la sombra del canvas no sigue la transformación, así que debe invertirse para que en el modelo caiga hacia abajo. → Task 2.
- Fuente aún sin cargar o variable CSS sin resolver: se usa `sans-serif` y se repinta cuando la fuente termina de cargar. → Tasks 2 y 3.
- Contorno de grosor 0: no se llama a `strokeText`. Grosor fuera de rango: se limita a 0–0.12. → Tasks 1 y 2.
- Arrastrar el selector de color o el grosor: debe ser un solo paso de deshacer, no decenas. → Task 1.

---

## File Structure

- Create `lib/builder/name-number-presets.ts` — tipo `NameNumberStyle`, catálogo de presets, helpers puros.
- Create `lib/builder/resolve-font-family.ts` — lee una variable CSS de `<html>` y devuelve la lista de familias para `ctx.font`.
- Modify `lib/builder/design-state.ts` — campo, acciones y reducer.
- Modify `lib/builder/design-history.ts` — agrupación de deshacer e igualdad.
- Modify `lib/builder/texture-compositor.ts` — dibujo con estilo, ajuste de ancho, sombra invertida.
- Modify `app/layout.tsx` — 6 fuentes de Google como variables CSS.
- Modify `components/builder/JerseyModel.tsx` — resolver familia, esperar carga, repintar.
- Modify `components/builder/panels/TextPanel.tsx` — cuadrícula de presets y controles.
- Tests: `tests/lib/name-number-presets.test.ts` (nuevo), `tests/lib/resolve-font-family.test.ts` (nuevo), `tests/lib/design-state.test.ts`, `tests/lib/design-history.test.ts`, `tests/lib/texture-compositor.test.ts`, `tests/components/panels.test.tsx`.

---

### Task 1: Catálogo de presets, estado e historial

**Files:**
- Create: `lib/builder/name-number-presets.ts`
- Modify: `lib/builder/design-state.ts`
- Modify: `lib/builder/design-history.ts:25-54`
- Test: `tests/lib/name-number-presets.test.ts` (new), `tests/lib/design-state.test.ts`, `tests/lib/design-history.test.ts`

**Interfaces:**
- Produces (`name-number-presets.ts`):
  - `type NameNumberStyle = { presetId: string; fill: string; outlineColor: string; outlineWidth: number; shadow: boolean }`
  - `type NameNumberPreset = { id: string; label: string; cssVar: string; weight: number; nameScale: number; numberScale: number; fill: string; outlineColor: string; outlineWidth: number; shadow: boolean }`
  - `const NAME_NUMBER_PRESETS: NameNumberPreset[]`
  - `const DEFAULT_PRESET_ID = "classic"`
  - `const MAX_OUTLINE_WIDTH = 0.12`
  - `findNameNumberPreset(id: string): NameNumberPreset | undefined`
  - `getNameNumberPreset(id: string): NameNumberPreset` (cae al preset por defecto)
  - `styleFromPreset(id: string): NameNumberStyle | null` (null si el id no existe)
- Produces (`design-state.ts`): `DesignState.nameNumberStyle: NameNumberStyle` y las acciones `SET_NN_PRESET {id}`, `SET_NN_FILL {value}`, `SET_NN_OUTLINE_COLOR {value}`, `SET_NN_OUTLINE_WIDTH {value}`, `SET_NN_SHADOW {value: boolean}`.

- [ ] **Step 1: Escribir los tests del catálogo**

Crear `tests/lib/name-number-presets.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  NAME_NUMBER_PRESETS,
  DEFAULT_PRESET_ID,
  MAX_OUTLINE_WIDTH,
  findNameNumberPreset,
  getNameNumberPreset,
  styleFromPreset,
} from "@/lib/builder/name-number-presets";

describe("name-number presets", () => {
  it("has six presets with unique ids and a font variable and weight each", () => {
    expect(NAME_NUMBER_PRESETS).toHaveLength(6);
    const ids = NAME_NUMBER_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of NAME_NUMBER_PRESETS) {
      expect(p.cssVar).toMatch(/^--font-nn-/);
      expect(p.weight).toBeGreaterThanOrEqual(400);
      expect(p.outlineWidth).toBeGreaterThanOrEqual(0);
      expect(p.outlineWidth).toBeLessThanOrEqual(MAX_OUTLINE_WIDTH);
    }
  });

  it("uses the agreed fonts and weights", () => {
    const byId = Object.fromEntries(NAME_NUMBER_PRESETS.map((p) => [p.id, p]));
    expect(byId.classic).toMatchObject({ cssVar: "--font-nn-oswald", weight: 700 });
    expect(byId.modern).toMatchObject({ cssVar: "--font-nn-montserrat", weight: 800 });
    expect(byId.retro).toMatchObject({ cssVar: "--font-nn-righteous", weight: 400 });
    expect(byId.block).toMatchObject({ cssVar: "--font-nn-anton", weight: 400 });
    expect(byId.elegant).toMatchObject({ cssVar: "--font-nn-playfair", weight: 900 });
    expect(byId.outline).toMatchObject({ cssVar: "--font-nn-alfa-slab", weight: 400 });
  });

  it("finds presets and falls back to the default for an unknown id", () => {
    expect(findNameNumberPreset("retro")?.label).toBe("Retro");
    expect(findNameNumberPreset("nope")).toBeUndefined();
    expect(getNameNumberPreset("nope").id).toBe(DEFAULT_PRESET_ID);
  });

  it("builds a style from a preset's defaults, or null for an unknown id", () => {
    const retro = findNameNumberPreset("retro")!;
    expect(styleFromPreset("retro")).toEqual({
      presetId: "retro",
      fill: retro.fill,
      outlineColor: retro.outlineColor,
      outlineWidth: retro.outlineWidth,
      shadow: retro.shadow,
    });
    expect(styleFromPreset("nope")).toBeNull();
  });
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npx vitest run tests/lib/name-number-presets.test.ts`
Expected: FAIL (el módulo `name-number-presets` no existe).

- [ ] **Step 3: Crear el catálogo**

Crear `lib/builder/name-number-presets.ts`:

```ts
export type NameNumberStyle = {
  presetId: string;
  fill: string;
  outlineColor: string;
  /** Visible outline thickness as a fraction of the font size (0 = no outline). */
  outlineWidth: number;
  shadow: boolean;
};

export type NameNumberPreset = Omit<NameNumberStyle, "presetId"> & {
  id: string;
  label: string;
  /** CSS variable exposed by next/font in app/layout.tsx; holds the font-family list. */
  cssVar: string;
  weight: number;
  /** Multipliers over the base font sizes used by the compositor. */
  nameScale: number;
  numberScale: number;
};

export const MAX_OUTLINE_WIDTH = 0.12;
export const DEFAULT_PRESET_ID = "classic";

export const NAME_NUMBER_PRESETS: NameNumberPreset[] = [
  {
    id: "classic",
    label: "Clásico",
    cssVar: "--font-nn-oswald",
    weight: 700,
    nameScale: 1,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "modern",
    label: "Moderno",
    cssVar: "--font-nn-montserrat",
    weight: 800,
    nameScale: 0.9,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0.02,
    shadow: false,
  },
  {
    id: "retro",
    label: "Retro",
    cssVar: "--font-nn-righteous",
    weight: 400,
    nameScale: 1,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#d62828",
    outlineWidth: 0.03,
    shadow: true,
  },
  {
    id: "block",
    label: "Bloque",
    cssVar: "--font-nn-anton",
    weight: 400,
    nameScale: 1.05,
    numberScale: 1.1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "elegant",
    label: "Elegante",
    cssVar: "--font-nn-playfair",
    weight: 900,
    nameScale: 0.95,
    numberScale: 1,
    fill: "#f5d77a",
    outlineColor: "#000000",
    outlineWidth: 0,
    shadow: false,
  },
  {
    id: "outline",
    label: "Contorno",
    cssVar: "--font-nn-alfa-slab",
    weight: 400,
    nameScale: 0.9,
    numberScale: 1,
    fill: "#ffffff",
    outlineColor: "#000000",
    outlineWidth: 0.06,
    shadow: false,
  },
];

export function findNameNumberPreset(id: string): NameNumberPreset | undefined {
  return NAME_NUMBER_PRESETS.find((p) => p.id === id);
}

export function getNameNumberPreset(id: string): NameNumberPreset {
  return findNameNumberPreset(id) ?? findNameNumberPreset(DEFAULT_PRESET_ID)!;
}

export function styleFromPreset(id: string): NameNumberStyle | null {
  const preset = findNameNumberPreset(id);
  if (!preset) return null;
  return {
    presetId: preset.id,
    fill: preset.fill,
    outlineColor: preset.outlineColor,
    outlineWidth: preset.outlineWidth,
    shadow: preset.shadow,
  };
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run tests/lib/name-number-presets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Escribir los tests del reducer**

Leer el final de `tests/lib/design-state.test.ts` para respetar su estilo e imports, y agregar al final del archivo un bloque (importando `designReducer` e `initialDesignState` solo si todavía no están importados):

```ts
describe("name/number style", () => {
  it("starts with the classic preset's values", () => {
    expect(initialDesignState.nameNumberStyle).toEqual({
      presetId: "classic",
      fill: "#ffffff",
      outlineColor: "#000000",
      outlineWidth: 0,
      shadow: false,
    });
  });

  it("applies a preset's defaults, discarding manual tweaks", () => {
    const tweaked = designReducer(initialDesignState, { type: "SET_NN_FILL", value: "#ff0000" });
    const next = designReducer(tweaked, { type: "SET_NN_PRESET", id: "retro" });
    expect(next.nameNumberStyle).toEqual({
      presetId: "retro",
      fill: "#ffffff",
      outlineColor: "#d62828",
      outlineWidth: 0.03,
      shadow: true,
    });
  });

  it("ignores an unknown preset id", () => {
    const next = designReducer(initialDesignState, { type: "SET_NN_PRESET", id: "nope" });
    expect(next).toBe(initialDesignState);
  });

  it("changes only the targeted field", () => {
    const fill = designReducer(initialDesignState, { type: "SET_NN_FILL", value: "#123456" });
    expect(fill.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, fill: "#123456" });
    const color = designReducer(initialDesignState, { type: "SET_NN_OUTLINE_COLOR", value: "#abcdef" });
    expect(color.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, outlineColor: "#abcdef" });
    const shadow = designReducer(initialDesignState, { type: "SET_NN_SHADOW", value: true });
    expect(shadow.nameNumberStyle).toEqual({ ...initialDesignState.nameNumberStyle, shadow: true });
  });

  it("clamps the outline width to 0..0.12", () => {
    const over = designReducer(initialDesignState, { type: "SET_NN_OUTLINE_WIDTH", value: 5 });
    expect(over.nameNumberStyle.outlineWidth).toBe(0.12);
    const under = designReducer(initialDesignState, { type: "SET_NN_OUTLINE_WIDTH", value: -1 });
    expect(under.nameNumberStyle.outlineWidth).toBe(0);
    const ok = designReducer(initialDesignState, { type: "SET_NN_OUTLINE_WIDTH", value: 0.05 });
    expect(ok.nameNumberStyle.outlineWidth).toBe(0.05);
  });
});
```

Y agregar al final de `tests/lib/design-history.test.ts`, dentro de un nuevo `describe`:

```ts
describe("name/number style history", () => {
  it("makes a preset change one undoable step", () => {
    const changed = run([{ type: "SET_NN_PRESET", id: "block" }]);
    expect(changed.present.nameNumberStyle.presetId).toBe("block");
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.nameNumberStyle.presetId).toBe("classic");
  });

  it("collapses a burst of fill-color edits into one undo step (Review Focus 6)", () => {
    const burst = run([
      { type: "SET_NN_FILL", value: "#111111", at: 10_000 },
      { type: "SET_NN_FILL", value: "#222222", at: 10_100 },
      { type: "SET_NN_FILL", value: "#333333", at: 10_200 },
    ]);
    expect(burst.past).toHaveLength(1);
    expect(burst.present.nameNumberStyle.fill).toBe("#333333");
  });

  it("collapses a burst of outline-width edits into one undo step", () => {
    const burst = run([
      { type: "SET_NN_OUTLINE_WIDTH", value: 0.01, at: 10_000 },
      { type: "SET_NN_OUTLINE_WIDTH", value: 0.02, at: 10_100 },
    ]);
    expect(burst.past).toHaveLength(1);
  });

  it("ignores a change that leaves the style identical", () => {
    const base = createHistory();
    const same = historyReducer(base, { type: "SET_NN_SHADOW", value: false });
    expect(same).toBe(base);
  });
});
```

- [ ] **Step 6: Ver que fallan**

Run: `npx vitest run tests/lib/design-state.test.ts tests/lib/design-history.test.ts`
Expected: FAIL (`nameNumberStyle` indefinido, acciones desconocidas).

- [ ] **Step 7: Implementar en el estado**

En `lib/builder/design-state.ts`:

1. Cambiar el import de arriba para agregar:
```ts
import { MAX_OUTLINE_WIDTH, styleFromPreset, type NameNumberStyle } from "./name-number-presets";
```
2. En `DesignState`, después de `playerNumber: string;` agregar `nameNumberStyle: NameNumberStyle;`.
3. En `DesignAction`, antes de `| { type: "SET_PROJECT_NAME"; value: string }` agregar:
```ts
  | { type: "SET_NN_PRESET"; id: string }
  | { type: "SET_NN_FILL"; value: string }
  | { type: "SET_NN_OUTLINE_COLOR"; value: string }
  | { type: "SET_NN_OUTLINE_WIDTH"; value: number }
  | { type: "SET_NN_SHADOW"; value: boolean }
```
(el `;` final queda en la última acción, `SET_PROJECT_NAME`).
4. En `initialDesignState`, después de `playerNumber: "",` agregar `nameNumberStyle: styleFromPreset("classic")!,`.
5. En `designReducer`, antes de `case "SET_PROJECT_NAME":` agregar:
```ts
    case "SET_NN_PRESET": {
      const style = styleFromPreset(action.id);
      return style ? { ...state, nameNumberStyle: style } : state;
    }
    case "SET_NN_FILL":
      return { ...state, nameNumberStyle: { ...state.nameNumberStyle, fill: action.value } };
    case "SET_NN_OUTLINE_COLOR":
      return { ...state, nameNumberStyle: { ...state.nameNumberStyle, outlineColor: action.value } };
    case "SET_NN_OUTLINE_WIDTH":
      return {
        ...state,
        nameNumberStyle: {
          ...state.nameNumberStyle,
          outlineWidth: Math.min(MAX_OUTLINE_WIDTH, Math.max(0, action.value)),
        },
      };
    case "SET_NN_SHADOW":
      return { ...state, nameNumberStyle: { ...state.nameNumberStyle, shadow: action.value } };
```

- [ ] **Step 8: Implementar en el historial**

En `lib/builder/design-history.ts`:

1. En `groupKey`, antes de `default:` agregar:
```ts
    case "SET_NN_FILL":
      return "nn:fill";
    case "SET_NN_OUTLINE_COLOR":
      return "nn:outline-color";
    case "SET_NN_OUTLINE_WIDTH":
      return "nn:outline-width";
```
2. En `sameDesign`, antes de `a.projectName === b.projectName` agregar:
```ts
    a.nameNumberStyle.presetId === b.nameNumberStyle.presetId &&
    a.nameNumberStyle.fill === b.nameNumberStyle.fill &&
    a.nameNumberStyle.outlineColor === b.nameNumberStyle.outlineColor &&
    a.nameNumberStyle.outlineWidth === b.nameNumberStyle.outlineWidth &&
    a.nameNumberStyle.shadow === b.nameNumberStyle.shadow &&
```

- [ ] **Step 9: Ver que pasa todo**

Run: `npm test`
Expected: PASS en toda la suite.

- [ ] **Step 10: Commit**

```bash
git add lib/builder/name-number-presets.ts lib/builder/design-state.ts lib/builder/design-history.ts tests/lib/name-number-presets.test.ts tests/lib/design-state.test.ts tests/lib/design-history.test.ts
git commit -m "feat: add name/number style state with six presets"
```

---

### Task 2: Dibujo con estilo en el compositor

**Files:**
- Create: `lib/builder/resolve-font-family.ts`
- Modify: `lib/builder/texture-compositor.ts:60-66` (firma) y `:127-160` (texto de la espalda)
- Test: `tests/lib/resolve-font-family.test.ts` (new), `tests/lib/texture-compositor.test.ts`

**Interfaces:**
- Consumes (Task 1): `getNameNumberPreset(id)`, `NameNumberStyle` de `./name-number-presets`; `design.nameNumberStyle`.
- Produces:
  - `resolveFontFamily(cssVar: string, fallback = "sans-serif"): string` en `lib/builder/resolve-font-family.ts`.
  - `drawDesignToCanvas(ctx, canvasSize, design, images, regions, nameNumberFontFamily = "sans-serif")` — sexto parámetro opcional con la lista de familias ya resuelta, lista para `ctx.font`.

- [ ] **Step 1: Test del resolvedor**

Crear `tests/lib/resolve-font-family.test.ts`:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { resolveFontFamily } from "@/lib/builder/resolve-font-family";

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
```

- [ ] **Step 2: Ver que falla**

Run: `npx vitest run tests/lib/resolve-font-family.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar el resolvedor**

Crear `lib/builder/resolve-font-family.ts`:

```ts
// next/font exposes each font as a CSS variable on <html> whose value is the
// real (hashed) family name plus its metric-compatible fallback. The canvas
// can't read `var(...)`, so the value is resolved here.
export function resolveFontFamily(cssVar: string, fallback = "sans-serif"): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return value ? `${value}, ${fallback}` : fallback;
}
```

- [ ] **Step 4: Ver que pasa**

Run: `npx vitest run tests/lib/resolve-font-family.test.ts`
Expected: PASS. Si el primer test falla porque jsdom devuelve vacío para propiedades personalizadas, reemplazar el `setProperty` por insertar `<style>:root{--font-test:'Oswald','Oswald Fallback'}</style>` en `document.head` y quitarlo en `afterEach`; el resto no cambia.

- [ ] **Step 5: Actualizar el mock del contexto y escribir los tests del compositor**

En `tests/lib/texture-compositor.test.ts`, reemplazar `createMockCtx` por:

```ts
function createMockCtx() {
  const ctx = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    // Width grows with the font size, like a real font: 0.6 px per character per px of size.
    measureText: vi.fn((text: string) => {
      const px = parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? "10");
      return { width: text.length * px * 0.6 };
    }),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "miter",
    font: "",
    textAlign: "left",
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}
```

Agregar arriba el import `import { styleFromPreset } from "@/lib/builder/name-number-presets";` y, dentro del `describe("drawDesignToCanvas", ...)`, antes del `describe("sleeve orientation", ...)`, este bloque:

```ts
  describe("name and number style", () => {
    const blank = { bodyPatternImage: null, sleevePatternImage: null, logoImage: null };
    const withStyle = (patch: Partial<typeof initialDesignState>) => ({ ...initialDesignState, ...patch });

    it("uses the preset's weight and the given font family, scaled by the base size", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10" }), blank, regions, "'Oswald', sans-serif");
      // classic: weight 700, number base 0.12 * 1000 = 120px, scale 1
      expect(fonts[0]).toBe("700 120px 'Oswald', sans-serif");
    });

    it("fills with the style's fill color", () => {
      const ctx = createMockCtx();
      let fill = "";
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => (fill = ctx.fillStyle as string));
      const design = withStyle({
        playerNumber: "7",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, fill: "#f5d77a" },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      expect(fill).toBe("#f5d77a");
    });

    it("does not stroke when the outline width is 0 (Review Focus 5)", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10", playerName: "PEREZ" }), blank, regions);
      expect(ctx.strokeText).not.toHaveBeenCalled();
    });

    it("strokes before filling, with a round join and the outline color and width", () => {
      const ctx = createMockCtx();
      const seen: Record<string, unknown> = {};
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => {
        seen.strokeStyle = ctx.strokeStyle;
        seen.lineWidth = ctx.lineWidth;
        seen.lineJoin = ctx.lineJoin;
      });
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...styleFromPreset("outline")!, outlineColor: "#112233", outlineWidth: 0.05 },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      const stroke = (ctx.strokeText as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      const fill = (ctx.fillText as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
      expect(stroke).toBeLessThan(fill);
      expect(seen.strokeStyle).toBe("#112233");
      expect(seen.lineJoin).toBe("round");
      // visible outline = 0.05 of the font size; strokes are centered, so the line is twice that.
      // outline preset number size: 0.12 * 1000 * 1 = 120px -> 0.05 * 120 * 2 = 12
      expect(seen.lineWidth).toBeCloseTo(12, 5);
    });

    it("casts the shadow downward on the model despite the 180deg rotation (Review Focus 3)", () => {
      const ctx = createMockCtx();
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, shadow: true },
      });
      drawDesignToCanvas(ctx, 1000, design, blank, regions);
      // Canvas shadow offsets ignore the transform; the content is rotated by PI,
      // so a downward shadow on the model is an upward (negative y) offset here.
      expect(ctx.shadowOffsetY).toBeLessThan(0);
      expect(ctx.shadowColor).not.toBe("transparent");
    });

    it("draws no shadow when the style has none", () => {
      const ctx = createMockCtx();
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10" }), blank, regions);
      expect(ctx.shadowColor).toBe("transparent");
    });

    it("keeps the shadow on the outline only, not on the fill, when both exist", () => {
      const ctx = createMockCtx();
      const shadowAtStroke: string[] = [];
      const shadowAtFill: string[] = [];
      (ctx.strokeText as ReturnType<typeof vi.fn>).mockImplementation(() => shadowAtStroke.push(ctx.shadowColor));
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => shadowAtFill.push(ctx.shadowColor));
      drawDesignToCanvas(ctx, 1000, withStyle({ playerNumber: "10", nameNumberStyle: styleFromPreset("retro")! }), blank, regions);
      expect(shadowAtStroke[0]).not.toBe("transparent");
      expect(shadowAtFill[0]).toBe("transparent");
    });

    it("shrinks a very long name to fit 80% of the back panel width (Review Focus 1)", () => {
      const ctx = createMockCtx();
      let widthAtDraw = 0;
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation((text: string) => {
        widthAtDraw = (ctx.measureText as ReturnType<typeof vi.fn>)(text).width;
      });
      const longName = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: longName }), blank, regions);
      // bodyBack is 0.4 wide -> 400px; 80% -> 320px.
      expect(widthAtDraw).toBeLessThanOrEqual(320.01);
      expect(widthAtDraw).toBeGreaterThan(300);
    });

    it("does not shrink a short name", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      drawDesignToCanvas(ctx, 1000, withStyle({ playerName: "LEO" }), blank, regions);
      // classic: name base 0.05 * 1000 = 50px, scale 1
      expect(fonts[0]).toMatch(/^700 50px /);
    });

    it("falls back to the classic preset for an unknown preset id (Review Focus 2)", () => {
      const ctx = createMockCtx();
      const fonts: string[] = [];
      (ctx.fillText as ReturnType<typeof vi.fn>).mockImplementation(() => fonts.push(ctx.font));
      const design = withStyle({
        playerNumber: "10",
        nameNumberStyle: { ...initialDesignState.nameNumberStyle, presetId: "gone" },
      });
      expect(() => drawDesignToCanvas(ctx, 1000, design, blank, regions)).not.toThrow();
      expect(fonts[0]).toMatch(/^700 120px /);
    });
  });
```

- [ ] **Step 6: Ver que fallan**

Run: `npx vitest run tests/lib/texture-compositor.test.ts`
Expected: FAIL en los tests nuevos (no hay `strokeText`, tamaño de fuente fijo, etc.). Los viejos pueden pasar o fallar por `measureText`; se arreglan en el paso siguiente.

- [ ] **Step 7: Implementar el dibujo**

En `lib/builder/texture-compositor.ts`:

1. Agregar a los imports de arriba:
```ts
import { getNameNumberPreset, type NameNumberPreset, type NameNumberStyle } from "./name-number-presets";
```
2. Cambiar la firma de `drawDesignToCanvas` agregando un parámetro final:
```ts
  regions: UVRegions,
  nameNumberFontFamily = "sans-serif"
): void {
```
3. Reemplazar los dos bloques `if (design.playerName) { ... }` y `if (design.playerNumber) { ... }` (líneas 127–146) por:
```ts
  const nnStyle = design.nameNumberStyle;
  const nnPreset = getNameNumberPreset(nnStyle.presetId);
  const backWidth = (regions.bodyBack.u1 - regions.bodyBack.u0) * canvasSize;
  const maxTextWidth = backWidth * MAX_BACK_TEXT_WIDTH_FRACTION;

  if (design.playerName) {
    // Upper portion of bodyBack: vFrac=0 is bodyBack.v0, the edge shared
    // with bodyFront's top (see logo comment above), i.e. near the collar.
    // A small offset from 0 keeps it just below the collar, above the number.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, 0.15, canvasSize);
    drawBackText(ctx, design.playerName, cx, cy, {
      basePx: canvasSize * NAME_FONT_FRACTION * nnPreset.nameScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
    });
  }

  if (design.playerNumber) {
    // Below the name (further from the collar edge), larger font, centered
    // in bodyBack.
    const { x: cx, y: cy } = pointInRegionToCanvas(regions.bodyBack, 0.5, 0.55, canvasSize);
    drawBackText(ctx, design.playerNumber, cx, cy, {
      basePx: canvasSize * NUMBER_FONT_FRACTION * nnPreset.numberScale,
      maxWidth: maxTextWidth,
      style: nnStyle,
      preset: nnPreset,
      fontFamily: nameNumberFontFamily,
    });
  }
```
4. Reemplazar la función `fillTextRotated180` (y su comentario inmediato anterior, líneas 149–160 — conservar el comentario sobre la rotación de la isla UV) por:
```ts
// The OBJ's back UV island is rotated 180deg relative to the front (measured
// on public/models/jersey_ss.obj: on the front v grows with world-y, on the
// back it shrinks; and u runs right-to-left as seen from behind). Content
// drawn upright into bodyBack would show upside-down on the model, so back
// content is drawn rotated by PI.
const NAME_FONT_FRACTION = 0.05;
const NUMBER_FONT_FRACTION = 0.12;
// Back text never takes more than this share of the back panel's width.
const MAX_BACK_TEXT_WIDTH_FRACTION = 0.8;
const SHADOW_COLOR = "rgba(0, 0, 0, 0.45)";

type BackTextOptions = {
  basePx: number;
  maxWidth: number;
  style: NameNumberStyle;
  preset: NameNumberPreset;
  fontFamily: string;
};

// Draws shadow -> outline -> fill, centered on (x, y), rotated 180deg.
function drawBackText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  { basePx, maxWidth, style, preset, fontFamily }: BackTextOptions
): void {
  ctx.save();
  const fontFor = (px: number) => `${preset.weight} ${px}px ${fontFamily}`;
  ctx.font = fontFor(basePx);
  ctx.textAlign = "center";
  const measured = ctx.measureText(text).width;
  const px = measured > maxWidth ? basePx * (maxWidth / measured) : basePx;
  ctx.font = fontFor(px);

  ctx.translate(x, y);
  ctx.rotate(Math.PI);
  ctx.lineJoin = "round";

  if (style.shadow) {
    ctx.shadowColor = SHADOW_COLOR;
    ctx.shadowBlur = px * 0.06;
    ctx.shadowOffsetX = 0;
    // Shadow offsets ignore the transform, so against the rotated content a
    // downward shadow on the model is an upward (negative y) offset here.
    ctx.shadowOffsetY = -px * 0.05;
  }

  if (style.outlineWidth > 0) {
    // A stroke is centered on the glyph edge and the fill covers its inner
    // half, so the line is twice the visible thickness.
    ctx.lineWidth = px * style.outlineWidth * 2;
    ctx.strokeStyle = style.outlineColor;
    ctx.strokeText(text, 0, 0);
    // The outline already cast the shadow; the fill must not add a second one.
    ctx.shadowColor = "transparent";
  }

  ctx.fillStyle = style.fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
```

- [ ] **Step 8: Ver que pasa todo**

Run: `npm test`
Expected: PASS en toda la suite, incluidos los tests viejos de orientación de la espalda (`rotate` antes de `fillText`, etc.).

- [ ] **Step 9: Commit**

```bash
git add lib/builder/resolve-font-family.ts lib/builder/texture-compositor.ts tests/lib/resolve-font-family.test.ts tests/lib/texture-compositor.test.ts
git commit -m "feat: draw name and number with preset font, outline and shadow"
```

---

### Task 3: Cargar las fuentes y conectarlas al modelo

**Files:**
- Modify: `app/layout.tsx`
- Modify: `components/builder/JerseyModel.tsx:1-16` (imports), `:70` (estado), `:238-258` (repintado)

**Interfaces:**
- Consumes (Task 1): `getNameNumberPreset`, `design.nameNumberStyle.presetId`. (Task 2): `resolveFontFamily`, sexto parámetro de `drawDesignToCanvas`.
- Produces: variables CSS `--font-nn-oswald`, `--font-nn-montserrat`, `--font-nn-righteous`, `--font-nn-anton`, `--font-nn-playfair`, `--font-nn-alfa-slab` en `<html>` (las que el catálogo y la cuadrícula del panel referencian).

Sin test automático: `next/font/google` no se puede cargar en Vitest. Se verifica con lint, build y un chequeo manual (Step 5).

- [ ] **Step 1: Declarar las fuentes en el layout**

En `app/layout.tsx`, cambiar el import y agregar las fuentes:

```tsx
import { Geist, Geist_Mono, Oswald, Montserrat, Righteous, Anton, Playfair_Display, Alfa_Slab_One } from "next/font/google";
```

Después de `geistMono` agregar (sin `preload`: se descargan solo cuando se usan, para no cargar 6 fuentes en cada visita):

```tsx
const nnOswald = Oswald({ variable: "--font-nn-oswald", subsets: ["latin"], preload: false });
const nnMontserrat = Montserrat({ variable: "--font-nn-montserrat", subsets: ["latin"], preload: false });
const nnRighteous = Righteous({ variable: "--font-nn-righteous", subsets: ["latin"], weight: "400", preload: false });
const nnAnton = Anton({ variable: "--font-nn-anton", subsets: ["latin"], weight: "400", preload: false });
const nnPlayfair = Playfair_Display({ variable: "--font-nn-playfair", subsets: ["latin"], preload: false });
const nnAlfaSlab = Alfa_Slab_One({ variable: "--font-nn-alfa-slab", subsets: ["latin"], weight: "400", preload: false });
```

Y en el `className` de `<html>`:

```tsx
      className={`${geistSans.variable} ${geistMono.variable} ${nnOswald.variable} ${nnMontserrat.variable} ${nnRighteous.variable} ${nnAnton.variable} ${nnPlayfair.variable} ${nnAlfaSlab.variable} h-full antialiased`}
```

- [ ] **Step 2: Resolver la familia y esperar la carga en `JerseyModel`**

En `components/builder/JerseyModel.tsx`:

1. Agregar a los imports:
```ts
import { getNameNumberPreset } from "@/lib/builder/name-number-presets";
import { resolveFontFamily } from "@/lib/builder/resolve-font-family";
```
2. Después de `const [logoImage, setLogoImage] = ...;` agregar:
```ts
  // Bumped when the name/number font finishes loading, to repaint the canvas
  // (the first paint would otherwise keep the fallback font).
  const [fontsVersion, setFontsVersion] = useState(0);
  const nnPreset = getNameNumberPreset(state.nameNumberStyle.presetId);
```
3. Antes del comentario "Cheap and undebounced", agregar el efecto de carga:
```ts
  // Loads the chosen name/number font on demand (the fonts are declared with
  // preload: false) and asks for a repaint once it is available.
  useEffect(() => {
    let cancelled = false;
    const family = resolveFontFamily(nnPreset.cssVar);
    document.fonts
      .load(`${nnPreset.weight} 48px ${family}`, "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ")
      .then(() => {
        if (!cancelled) setFontsVersion((v) => v + 1);
      })
      .catch((err) => {
        console.error("Failed to load name/number font", err);
      });
    return () => {
      cancelled = true;
    };
  }, [nnPreset]);
```
4. En el efecto de repintado, pasar la familia como sexto argumento y agregar `fontsVersion` a las dependencias:
```ts
      JERSEY_MODEL.uvRegions,
      resolveFontFamily(nnPreset.cssVar)
    );
    texture.needsUpdate = true;
  }, [state, canvas, texture, patternImages, logoImage, fontsVersion, nnPreset]);
```

- [ ] **Step 3: Lint y tipos**

Run: `npm run lint` y `npx tsc --noEmit`
Expected: sin errores. Si `Oswald`, `Montserrat` o `Playfair_Display` exigen `weight` en esta versión, agregar `weight: "variable"` es innecesario: son variables. Si el compilador pide `weight`, usar el peso del preset (`"700"`, `"800"`, `"900"`).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: compila (descarga las fuentes de Google en el build; necesita red). Si falla por nombre de fuente inexistente, el error lo dice y se corrige el nombre.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`, abrir la app, ir a "Nombre y número", escribir nombre y número y girar a la vista de espalda. Esperado: el texto aparece con Oswald en blanco (preset por defecto) y no con sans-serif genérica. Revisar la pestaña Network: la fuente se pide solo al mostrar texto.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx components/builder/JerseyModel.tsx
git commit -m "feat: load name/number fonts and repaint the jersey when they are ready"
```

---

### Task 4: Panel de estilos

**Files:**
- Modify: `components/builder/panels/TextPanel.tsx`
- Test: `tests/components/panels.test.tsx` (describe "SponsorPanel and TextPanel")

**Interfaces:**
- Consumes (Task 1): `NAME_NUMBER_PRESETS`, `getNameNumberPreset`, `MAX_OUTLINE_WIDTH`; acciones `SET_NN_PRESET`, `SET_NN_FILL`, `SET_NN_OUTLINE_COLOR`, `SET_NN_OUTLINE_WIDTH`, `SET_NN_SHADOW`; `state.nameNumberStyle`.
- Produces: radios con el nombre accesible del preset (`Clásico`, `Moderno`, `Retro`, `Bloque`, `Elegante`, `Contorno`), inputs con etiquetas `Color del texto`, `Color del contorno`, `Grosor del contorno`, `Sombra`.

- [ ] **Step 1: Tests**

En `tests/components/panels.test.tsx`, dentro de `describe("SponsorPanel and TextPanel", ...)`, agregar:

```tsx
  it("lists the six style presets and marks the current one", () => {
    renderWithDesign(<TextPanel />);
    for (const name of ["Clásico", "Moderno", "Retro", "Bloque", "Elegante", "Contorno"]) {
      expect(screen.getByRole("radio", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: "Clásico" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Retro" })).toHaveAttribute("aria-checked", "false");
  });

  it("applies a preset and syncs the controls to its defaults", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Retro" }));
    expect(api.current!.state.nameNumberStyle.presetId).toBe("retro");
    expect(screen.getByLabelText("Color del contorno")).toHaveValue("#d62828");
    expect(screen.getByLabelText("Sombra")).toBeChecked();
    expect(screen.getByRole("radio", { name: "Retro" })).toHaveAttribute("aria-checked", "true");
  });

  it("adjusts fill, outline and shadow independently of the preset", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.change(screen.getByLabelText("Color del texto"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Color del contorno"), { target: { value: "#00ff00" } });
    fireEvent.change(screen.getByLabelText("Grosor del contorno"), { target: { value: "0.05" } });
    fireEvent.click(screen.getByLabelText("Sombra"));
    expect(api.current!.state.nameNumberStyle).toEqual({
      presetId: "classic",
      fill: "#ff0000",
      outlineColor: "#00ff00",
      outlineWidth: 0.05,
      shadow: true,
    });
  });

  it("falls back to the classic selection when the state holds an unknown preset (Review Focus 2)", () => {
    const { api } = renderWithDesign(<TextPanel />);
    act(() => api.current!.dispatch({ type: "SET_NN_PRESET", id: "gone" }));
    expect(screen.getByRole("radio", { name: "Clásico" })).toHaveAttribute("aria-checked", "true");
  });
```

Nota para el implementador: el cuarto test despacha un id inexistente; el reducer lo ignora (Task 1), así que el estado sigue en "classic" y el test fija que el panel nunca queda sin selección. Es válido que pase desde el principio.

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/components/panels.test.tsx`
Expected: FAIL en los tres primeros tests nuevos (no hay radios ni controles).

- [ ] **Step 3: Implementar el panel**

Reemplazar `components/builder/panels/TextPanel.tsx` por:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import { MAX_OUTLINE_WIDTH, NAME_NUMBER_PRESETS, getNameNumberPreset } from "@/lib/builder/name-number-presets";
import { CheckIcon } from "../icons";
import { PanelShell } from "./PanelShell";

const INPUT =
  "rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-foreground/60";
const COLOR_INPUT = "h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent";
const THUMB_FONT_PX = 28;

export function TextPanel() {
  const { state, dispatch } = useDesign();
  const style = state.nameNumberStyle;
  const selectedId = getNameNumberPreset(style.presetId).id;

  return (
    <PanelShell title="Nombre y número" hint="Se muestran en la espalda.">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input
            type="text"
            value={state.playerName}
            onChange={(e) => dispatch({ type: "SET_PLAYER_NAME", value: e.target.value.toUpperCase() })}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Número
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={state.playerNumber}
            onChange={(e) => dispatch({ type: "SET_PLAYER_NUMBER", value: e.target.value.replace(/\D/g, "") })}
            className={INPUT}
          />
        </label>

        <div role="radiogroup" aria-label="Estilo" className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-3">
          {NAME_NUMBER_PRESETS.map((preset) => {
            const selected = preset.id === selectedId;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => dispatch({ type: "SET_NN_PRESET", id: preset.id })}
                className={[
                  "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/70 p-2 text-xs font-medium transition md:p-3 md:text-sm",
                  selected ? "border-accent shadow-sm" : "border-transparent hover:border-line",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="flex aspect-square w-full items-center justify-center rounded-xl"
                  style={{
                    background: state.colors.primary,
                    color: preset.fill,
                    fontFamily: `var(${preset.cssVar}), sans-serif`,
                    fontWeight: preset.weight,
                    fontSize: THUMB_FONT_PX,
                    WebkitTextStroke: `${preset.outlineWidth * THUMB_FONT_PX}px ${preset.outlineColor}`,
                    paintOrder: "stroke fill",
                    textShadow: preset.shadow ? "0 2px 3px rgba(0,0,0,0.45)" : undefined,
                  }}
                >
                  10
                </span>
                <span>{preset.label}</span>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Color del texto
          <input
            type="color"
            value={style.fill}
            onChange={(e) => dispatch({ type: "SET_NN_FILL", value: e.target.value })}
            className={COLOR_INPUT}
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Color del contorno
          <input
            type="color"
            value={style.outlineColor}
            onChange={(e) => dispatch({ type: "SET_NN_OUTLINE_COLOR", value: e.target.value })}
            className={COLOR_INPUT}
          />
        </label>
        <label className="flex flex-col gap-2 rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Grosor del contorno
          <input
            type="range"
            min={0}
            max={MAX_OUTLINE_WIDTH}
            step={0.005}
            value={style.outlineWidth}
            onChange={(e) => dispatch({ type: "SET_NN_OUTLINE_WIDTH", value: Number(e.target.value) })}
          />
        </label>
        <label className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
          Sombra
          <input
            type="checkbox"
            checked={style.shadow}
            onChange={(e) => dispatch({ type: "SET_NN_SHADOW", value: e.target.checked })}
            className="h-5 w-5"
          />
        </label>
      </div>
    </PanelShell>
  );
}
```

El panel asume que `CheckIcon` está exportado desde `components/builder/icons.tsx` (ya lo usa `PatternGrid`).

- [ ] **Step 4: Ver que pasa**

Run: `npm test`
Expected: PASS en toda la suite, incluido el test existente de foco visible (`Nombre` y `Número` siguen siendo etiquetas únicas) y `BuilderPage.test.tsx`.

- [ ] **Step 5: Verificación manual**

Con `npm run dev`: abrir "Nombre y número", elegir cada preset y comprobar que (a) la miniatura muestra el "10" con su fuente, (b) la camiseta en la espalda cambia de fuente, contorno y sombra, (c) arrastrar el selector de color y luego Ctrl+Z deshace todo el arrastre de una vez, (d) el nombre muy largo ("ABCDEFGHIJKLMNOPQRSTUVWXYZ" no cabe en el input pero uno de 14 letras sí) se achica sin salirse.

- [ ] **Step 6: Commit**

```bash
git add components/builder/panels/TextPanel.tsx tests/components/panels.test.tsx
git commit -m "feat: style picker and controls in the name and number panel"
```

---

### Task 5: Verificación final

**Files:** ninguno nuevo.

- [ ] **Step 1: Suite, lint y tipos**

Run: `npm test`, `npm run lint`, `npx tsc --noEmit`
Expected: todo en verde.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 3: Recorrido manual de punta a punta**

Con `npm run dev`: cada uno de los 6 presets en la camiseta; cambiar color de relleno y de contorno; grosor 0 y máximo; sombra encendida y apagada (la sombra cae hacia abajo en el modelo); deshacer y rehacer cada cambio; descargar la imagen con el botón de la barra y comprobar que el nombre y número salen con el estilo elegido; recargar la página y comprobar que la primera pintura ya usa la fuente (no un parpadeo permanente a sans-serif).

- [ ] **Step 4: Informar**

Reportar qué se verificó (tests, lint, build, recorrido manual) y qué quedó sin probar, si algo.
