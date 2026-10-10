# Compartir: imagen de historia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que **Compartir** (header) arme una imagen de historia de 1080×1920 con la camiseta de frente y de espalda sobre el fondo del equipo, con una frase divertida y el enlace "Diseñá la tuya", la muestre en un diálogo con un momento de revelado animado y la comparta con el menú nativo (o la descargue). Se elimina "Descargar PNG".

**Architecture:** La lógica vive en `lib/share/` como funciones puras o casi puras (geometría, frases, composición en canvas 2D, compartir) y un hook `useShareStory` que orquesta captura → composición → estado. La secuencia de captura "girar, esperar, leer" se extrae de `lib/checkout/thumbnails.ts` a una función genérica `captureViews` que usan las miniaturas del checkout y las camisetas de la historia. Un diálogo (`ShareStoryDialog`) muestra los estados armando, listo y error. La vista previa es el mismo PNG que se comparte.

**Tech Stack:** Next.js 16.3.7 (App Router), React 19, Tailwind 4, Vitest + Testing Library (jsdom), canvas 2D, Web Share API.

**Spec:** `docs/superpowers/specs/2026-10-09-share-story-design.md`

## Global Constraints

- Idioma de la interfaz: español rioplatense (voseo): "Armando tu camiseta…", "Probá de nuevo".
- Imagen: **1080×1920**, PNG. Fondo `public/share/story-background.png` (941×1672, se escala llenando el lienzo). Logo `public/brand/gepe-logo-white.png`.
- **Zona segura** de Instagram: el logo, la frase y el enlace quedan entre y = 270 y y = 1670.
- Dirección del enlace: constante `SHARE_URL = "gepe.com"` en `lib/share/story-layout.ts` (provisoria, a cambiar por la real).
- Fuentes del texto sobre canvas: Oswald (`--font-nn-oswald`) para la frase y Montserrat (`--font-nn-montserrat`) para el enlace, vía `resolveFontFamily`; se espera a `document.fonts.load` antes de dibujar.
- `VIEW_SETTLE_MS = 1300` (espera a que la cámara termine de girar) es una constante ajustable según capturas.
- Con `prefers-reduced-motion: reduce` no hay confeti ni animación de entrada.
- Los componentes usan el alias `@/`; las pruebas espejan las carpetas (`tests/lib/share/`, `tests/components/share/`).
- **No escribir tests con regex usando `node -e`**: se pierden los escapes (`\d` pasa a `d`) y la aserción queda vacía. Usar siempre las herramientas Write/Edit.
- Antes de cada commit: `npm test`, `npx tsc --noEmit` y `npm run lint` en verde. Nunca encadenar `git commit` después de un test con `;` ni con `&&` en el mismo comando: cada uno va en su paso.
- Cada commit termina con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (como segundo `-m`).
- No hay `gh`: no se hace PR hasta que el usuario lo pida (entonces: push y URL de comparación prefilleada).
- Rama de trabajo: `feat/share-story` (ya creada sobre `origin/main` con el checkout mergeado).

## Review Focus

Lo que el spec implica pero que un camino feliz no ejercita; cada línea tiene su prueba en la tarea indicada.

1. Cerrar el diálogo mientras la cámara todavía gira: no aparece una imagen vieja ni se reabre solo, y volver a abrir funciona — Tarea 6.
2. Un doble toque en Compartir no arranca dos capturas a la vez — Tarea 6.
3. Una captura vacía (el modelo aún no cargó, todo transparente) termina en error con Reintentar, no en una imagen en blanco — Tareas 3 y 6.
4. Una frase larga se achica hasta entrar y una absurdamente larga no rompe el dibujo — Tarea 4.
5. Cancelar el menú de compartir no es un error; si el navegador no puede compartir archivos se descarga — Tarea 5.
6. Falla al generar el PNG (`toBlob` devuelve `null`) o al cargar el fondo: error con Reintentar — Tareas 4 y 6.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `lib/share/phrases.ts` (nuevo) | Frases y `nextPhrase` |
| `lib/share/geometry.ts` (nuevo) | `fitInside`, `coverCrop`, `contentBounds` |
| `lib/share/story-layout.ts` (nuevo) | Constantes de la imagen y `SHARE_URL` |
| `lib/builder/io/capture-views.ts` (nuevo) | `captureViews` genérico y `VIEW_SETTLE_MS` |
| `lib/checkout/thumbnails.ts` (modifica) | `captureThumbnails` usa `captureViews` |
| `lib/share/shirt-image.ts` (nuevo) | `shirtImageOf`: copia transparente recortada al contenido |
| `lib/share/compose-story.ts` (nuevo) | `layoutPhrase`, `drawStory`, `renderStory` |
| `lib/share/share-image.ts` (nuevo) | `shareImage`, `storyFileName`, `shareText`, `downloadBlob` |
| `lib/share/use-share-story.ts` (nuevo) | Hook que orquesta captura, composición y estado |
| `components/share/Confetti.tsx`, `ShareStoryDialog.tsx` (nuevo) | Diálogo con revelado |
| `app/globals.css` (modifica) | Animaciones `story-in` y `confetti-fall` |
| `components/builder/Header.tsx`, `BuilderPage.tsx` (modifica) | Compartir activo y flujo |
| `components/builder/viewer/StageToolbar.tsx`, `lib/builder/io/export-image.ts`, `components/builder/icons.tsx` (modifica) | Se quita Descargar PNG |

---

### Task 1: Frases

**Files:**
- Create: `lib/share/phrases.ts`
- Test: `tests/lib/share/phrases.test.ts`

**Interfaces:**
- Produces: `STORY_PHRASES: readonly string[]`, `nextPhrase(current: string | null, random?: () => number): string` (nunca devuelve `current`).

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/share/phrases.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STORY_PHRASES, nextPhrase } from "@/lib/share/phrases";

describe("STORY_PHRASES", () => {
  it("has distinct, non-empty, short phrases", () => {
    expect(STORY_PHRASES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(STORY_PHRASES).size).toBe(STORY_PHRASES.length);
    for (const phrase of STORY_PHRASES) {
      expect(phrase.trim()).not.toBe("");
      expect(phrase.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("nextPhrase", () => {
  it("never returns the current phrase, whatever the random value", () => {
    for (const current of STORY_PHRASES) {
      for (const value of [0, 0.25, 0.5, 0.75, 0.9999, 1]) {
        expect(nextPhrase(current, () => value)).not.toBe(current);
      }
    }
  });

  it("can return any phrase when there is no current one", () => {
    const n = STORY_PHRASES.length;
    const seen = new Set(STORY_PHRASES.map((_, i) => nextPhrase(null, () => (i + 0.5) / n)));
    expect(seen.size).toBe(n);
  });

  it("always returns a known phrase, even for a random value of exactly 1", () => {
    expect(STORY_PHRASES).toContain(nextPhrase(null, () => 1));
  });

  it("treats a current phrase that is not in the list as no current phrase", () => {
    expect(STORY_PHRASES).toContain(nextPhrase("otra cosa", () => 0));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/share/phrases.test.ts`
Expected: FAIL (no se puede resolver `@/lib/share/phrases`).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/share/phrases.ts`:

```ts
export const STORY_PHRASES: readonly string[] = [
  "Esta camiseta es para ganar",
  "Se viene el campeón",
  "Así se ve ganar",
  "Hoy se juega con estilo",
  "El once más lindo de la liga",
  "Con esta no se pierde",
  "Presentando a los nuevos campeones",
  "Ya hay camiseta, faltan los goles",
  "La del barrio, la del tercer tiempo",
  "Para salir campeones",
];

// A random phrase other than the one on screen. `random` is injectable for tests.
export function nextPhrase(current: string | null, random: () => number = Math.random): string {
  const options = STORY_PHRASES.filter((phrase) => phrase !== current);
  const index = Math.min(options.length - 1, Math.floor(random() * options.length));
  return options[index];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/share/phrases.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share/phrases.ts tests/lib/share/phrases.test.ts
git commit -m "feat: add the story phrases and a no-repeat picker" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Geometría y constantes de la imagen

**Files:**
- Create: `lib/share/geometry.ts`, `lib/share/story-layout.ts`
- Test: `tests/lib/share/geometry.test.ts`

**Interfaces:**
- Produces:
  - `type Rect = { x: number; y: number; w: number; h: number }`
  - `fitInside(srcW: number, srcH: number, box: Rect): Rect` (contiene y centra, escala hacia arriba si hace falta)
  - `coverCrop(srcW: number, srcH: number, width: number, height: number): Rect` (porción de la fuente que llena `width×height` recortando el sobrante)
  - `contentBounds(data: ArrayLike<number>, width: number, height: number, alphaThreshold?: number): Rect | null` (rectángulo de píxeles RGBA cuyo alfa supera el umbral, 24 por defecto)
  - `story-layout.ts`: `STORY_WIDTH`, `STORY_HEIGHT`, `BACKGROUND_SRC`, `LOGO_SRC`, `LOGO`, `PHRASE`, `FRONT_RECT`, `BACK_RECT`, `HALO`, `CTA`, `SHARE_URL`.

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/share/geometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { contentBounds, coverCrop, fitInside } from "@/lib/share/geometry";

describe("fitInside", () => {
  const box = { x: 10, y: 20, w: 100, h: 100 };

  it("fits a wide source by width and centers it vertically", () => {
    expect(fitInside(200, 100, box)).toEqual({ x: 10, y: 45, w: 100, h: 50 });
  });

  it("fits a tall source by height and centers it horizontally", () => {
    expect(fitInside(100, 200, box)).toEqual({ x: 35, y: 20, w: 50, h: 100 });
  });

  it("scales a small source up to the box", () => {
    expect(fitInside(50, 50, box)).toEqual({ x: 10, y: 20, w: 100, h: 100 });
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wide source", () => {
    expect(coverCrop(200, 100, 100, 100)).toEqual({ x: 50, y: 0, w: 100, h: 100 });
  });

  it("crops the top and bottom of a tall source", () => {
    expect(coverCrop(100, 200, 100, 100)).toEqual({ x: 0, y: 50, w: 100, h: 100 });
  });

  it("uses the whole source when the ratio already matches", () => {
    expect(coverCrop(100, 200, 50, 100)).toEqual({ x: 0, y: 0, w: 100, h: 200 });
  });

  it("barely crops the 941x1672 background into 1080x1920", () => {
    const crop = coverCrop(941, 1672, 1080, 1920);
    expect(crop.h).toBeCloseTo(1672, 5);
    expect(crop.w).toBeGreaterThan(940);
    expect(crop.w).toBeLessThanOrEqual(941);
    expect(crop.x).toBeGreaterThanOrEqual(0);
  });
});

describe("contentBounds", () => {
  // 4 wide x 3 tall RGBA image, fully transparent.
  function image() {
    return new Uint8ClampedArray(4 * 3 * 4);
  }
  function setAlpha(data: Uint8ClampedArray, x: number, y: number, alpha: number) {
    data[(y * 4 + x) * 4 + 3] = alpha;
  }

  it("returns the box around the visible pixels", () => {
    const data = image();
    setAlpha(data, 1, 1, 255);
    setAlpha(data, 2, 2, 100);
    expect(contentBounds(data, 4, 3)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
  });

  it("ignores almost transparent pixels", () => {
    const data = image();
    setAlpha(data, 0, 0, 10);
    setAlpha(data, 3, 1, 255);
    expect(contentBounds(data, 4, 3)).toEqual({ x: 3, y: 1, w: 1, h: 1 });
  });

  it("returns null for a fully transparent image", () => {
    expect(contentBounds(image(), 4, 3)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/share/geometry.test.ts`
Expected: FAIL (no se puede resolver `@/lib/share/geometry`).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/share/geometry.ts`:

```ts
export type Rect = { x: number; y: number; w: number; h: number };

// Largest rectangle with the source's proportions that fits in `box`, centered
// in it. Small sources are scaled up to the box.
export function fitInside(srcW: number, srcH: number, box: Rect): Rect {
  const scale = Math.min(box.w / srcW, box.h / srcH);
  const w = srcW * scale;
  const h = srcH * scale;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

// The part of a source image that fills `width x height` when scaled to cover
// it (CSS "object-fit: cover"): the overflow is cropped evenly on both sides.
export function coverCrop(srcW: number, srcH: number, width: number, height: number): Rect {
  const scale = Math.max(width / srcW, height / srcH);
  const w = width / scale;
  const h = height / scale;
  return { x: (srcW - w) / 2, y: (srcH - h) / 2, w, h };
}

// Box around the pixels of an RGBA image whose alpha is above the threshold
// (the soft edge of a shadow counts as content), or null if there are none.
export function contentBounds(
  data: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 24
): Rect | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
```

Crear `lib/share/story-layout.ts` (constantes; las posiciones son provisorias y se calibran con capturas):

```ts
import type { Rect } from "./geometry";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export const BACKGROUND_SRC = "/share/story-background.png";
export const LOGO_SRC = "/brand/gepe-logo-white.png";

// Address printed under "Diseñá la tuya en". Provisional: replace with the real one.
export const SHARE_URL = "gepe.com";

// Instagram covers about 250 px at the top and the bottom with its own UI, so
// text and logo stay between y = 270 and y = 1670.
export const LOGO = { width: 220, y: 270 };

export const PHRASE = {
  y: 450, // top of the first line
  maxWidth: 860,
  maxLines: 2,
  maxSize: 72,
  minSize: 40,
  lineHeight: 1.05,
  weight: 700,
  color: "#f5b400",
};

// The two shirts are staggered on a diagonal: front up-left, back down-right.
export const FRONT_RECT: Rect = { x: 60, y: 640, w: 560, h: 520 };
export const BACK_RECT: Rect = { x: 460, y: 1000, w: 560, h: 520 };

// Soft glow behind each shirt so dark shirts read against the black background.
export const HALO = {
  radius: 0.62, // fraction of the shirt box width
  inner: "rgba(255,232,160,0.22)",
  outer: "rgba(255,232,160,0)",
};

export const CTA = {
  label: "Diseñá la tuya en",
  labelY: 1590, // top of the text
  labelSize: 36,
  labelWeight: 600,
  labelColor: "rgba(255,255,255,0.85)",
  urlY: 1650,
  urlSize: 54,
  urlWeight: 800,
  urlColor: "#f5b400",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/share/geometry.test.ts`
Expected: PASS. Luego `npx tsc --noEmit` debe seguir en verde.

- [ ] **Step 5: Commit**

```bash
git add lib/share/geometry.ts lib/share/story-layout.ts tests/lib/share/geometry.test.ts
git commit -m "feat: add the story geometry helpers and layout constants" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Captura genérica y camisetas recortadas

**Files:**
- Create: `lib/builder/io/capture-views.ts`, `lib/share/shirt-image.ts`
- Modify: `lib/checkout/thumbnails.ts`
- Test: `tests/lib/io/capture-views.test.ts`, `tests/lib/share/shirt-image.test.ts` (y el existente `tests/lib/checkout/thumbnails.test.ts` protege el refactor)

**Interfaces:**
- Consumes: `ViewSide` de `@/lib/builder/geometry/camera-math`; `contentBounds` (Tarea 2).
- Produces:
  - `VIEW_SETTLE_MS = 1300`, `type CaptureViewsOptions = { canvas: HTMLCanvasElement; showView: (side: ViewSide) => void; wait: (ms: number) => Promise<void> }`, `captureViews<T>(options, grab: (source: HTMLCanvasElement) => T | null): Promise<{ front: T; back: T } | null>`.
  - `shirtImageOf(source: HTMLCanvasElement, createCanvas?: () => HTMLCanvasElement): HTMLCanvasElement | null`.
  - `lib/checkout/thumbnails.ts` sigue exportando `VIEW_SETTLE_MS`, `THUMBNAIL_WIDTH`, `thumbnailOf`, `captureThumbnails` con el mismo comportamiento.

- [ ] **Step 1: Write the failing tests**

Crear `tests/lib/io/capture-views.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { VIEW_SETTLE_MS, captureViews } from "@/lib/builder/io/capture-views";

const canvas = { width: 10, height: 10 } as HTMLCanvasElement;

describe("captureViews", () => {
  it("shows the front, waits, grabs, then the back, waits, grabs", async () => {
    const log: string[] = [];
    let grabs = 0;
    const result = await captureViews(
      {
        canvas,
        showView: (side) => log.push(`show-${side}`),
        wait: async (ms) => {
          log.push(`wait-${ms}`);
        },
      },
      () => {
        grabs += 1;
        log.push(`grab-${grabs}`);
        return `view-${grabs}`;
      }
    );

    expect(result).toEqual({ front: "view-1", back: "view-2" });
    expect(log).toEqual([
      "show-front",
      `wait-${VIEW_SETTLE_MS}`,
      "grab-1",
      "show-back",
      `wait-${VIEW_SETTLE_MS}`,
      "grab-2",
    ]);
  });

  it("returns null when either grab fails", async () => {
    const options = { canvas, showView: () => {}, wait: async () => {} };
    expect(await captureViews(options, () => null)).toBeNull();

    let calls = 0;
    expect(await captureViews(options, () => (++calls === 2 ? null : "ok"))).toBeNull();
  });

  it("keeps a falsy but valid grab result", async () => {
    const options = { canvas, showView: () => {}, wait: async () => {} };
    expect(await captureViews(options, () => "")).toEqual({ front: "", back: "" });
  });
});
```

Crear `tests/lib/share/shirt-image.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { shirtImageOf } from "@/lib/share/shirt-image";

// A 4x3 capture whose only visible pixels are at (1,1) and (2,2).
function pixels(visible: Array<[number, number]>) {
  const data = new Uint8ClampedArray(4 * 3 * 4);
  for (const [x, y] of visible) data[(y * 4 + x) * 4 + 3] = 255;
  return data;
}

function fakeCanvas(ctx: unknown) {
  return { width: 0, height: 0, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement;
}

const source = { width: 4, height: 3 } as HTMLCanvasElement;

describe("shirtImageOf", () => {
  it("copies the capture with its transparency and crops it to the visible pixels", () => {
    const copyCtx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels([[1, 1], [2, 2]]) })) };
    const outCtx = { drawImage: vi.fn() };
    const copy = fakeCanvas(copyCtx);
    const out = fakeCanvas(outCtx);
    const canvases = [copy, out];

    const result = shirtImageOf(source, () => canvases.shift()!);

    expect(result).toBe(out);
    expect(copy.width).toBe(4);
    expect(copy.height).toBe(3);
    expect(copyCtx.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(copyCtx.getImageData).toHaveBeenCalledWith(0, 0, 4, 3);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(outCtx.drawImage).toHaveBeenCalledWith(copy, 1, 1, 2, 2, 0, 0, 2, 2);
  });

  it("returns null for a capture with nothing visible (the model has not loaded yet)", () => {
    const copyCtx = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ data: pixels([]) })) };
    expect(shirtImageOf(source, () => fakeCanvas(copyCtx))).toBeNull();
  });

  it("returns null for an empty canvas or without a 2d context", () => {
    expect(shirtImageOf({ width: 0, height: 0 } as HTMLCanvasElement, () => fakeCanvas({}))).toBeNull();
    expect(shirtImageOf(source, () => fakeCanvas(null))).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/io/capture-views.test.ts tests/lib/share/shirt-image.test.ts`
Expected: FAIL (no se pueden resolver los módulos).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/builder/io/capture-views.ts`:

```ts
import type { ViewSide } from "@/lib/builder/geometry/camera-math";

// How long the camera needs to finish turning before we read the canvas. The
// rig eases 12% of the remaining angle per frame (~60 frames for a half turn).
export const VIEW_SETTLE_MS = 1300;

export type CaptureViewsOptions = {
  canvas: HTMLCanvasElement;
  // Asks the viewer to turn to a side (from the default pose).
  showView: (side: ViewSide) => void;
  wait: (ms: number) => Promise<void>;
};

// Turns the viewer to the front and then to the back, reading the canvas with
// `grab` once the camera has settled on each side. Null if either read fails.
export async function captureViews<T>(
  { canvas, showView, wait }: CaptureViewsOptions,
  grab: (source: HTMLCanvasElement) => T | null
): Promise<{ front: T; back: T } | null> {
  showView("front");
  await wait(VIEW_SETTLE_MS);
  const front = grab(canvas);

  showView("back");
  await wait(VIEW_SETTLE_MS);
  const back = grab(canvas);

  return front !== null && back !== null ? { front, back } : null;
}
```

Crear `lib/share/shirt-image.ts`:

```ts
import { contentBounds } from "./geometry";

// A full-size copy of the WebGL canvas (kept transparent) cropped to the pixels
// that show the shirt, so every shirt fills its box the same way whatever the
// screen size. The copy is made right away because the WebGL buffer changes as
// soon as the camera moves on.
export function shirtImageOf(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): HTMLCanvasElement | null {
  if (source.width === 0 || source.height === 0) return null;

  const copy = createCanvas();
  copy.width = source.width;
  copy.height = source.height;
  const copyCtx = copy.getContext("2d");
  if (!copyCtx) return null;
  copyCtx.drawImage(source, 0, 0);

  const { data } = copyCtx.getImageData(0, 0, copy.width, copy.height);
  const bounds = contentBounds(data, copy.width, copy.height);
  if (!bounds) return null;

  const out = createCanvas();
  out.width = bounds.w;
  out.height = bounds.h;
  const outCtx = out.getContext("2d");
  if (!outCtx) return null;
  outCtx.drawImage(copy, bounds.x, bounds.y, bounds.w, bounds.h, 0, 0, bounds.w, bounds.h);
  return out;
}
```

Modificar `lib/checkout/thumbnails.ts`: reemplazar la constante `VIEW_SETTLE_MS` y la función `captureThumbnails` para que usen `captureViews`. El archivo completo queda:

```ts
import { VIEW_SETTLE_MS, captureViews, type CaptureViewsOptions } from "@/lib/builder/io/capture-views";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import type { Thumbnails } from "./order";

export { VIEW_SETTLE_MS };
export const THUMBNAIL_WIDTH = 400;

// A small JPEG of the WebGL canvas over the stage background, so the order
// stays light enough for sessionStorage even with a big crest or sponsors.
export function thumbnailOf(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): string | null {
  if (source.width === 0 || source.height === 0) return null;
  const out = createCanvas();
  out.width = THUMBNAIL_WIDTH;
  out.height = Math.max(1, Math.round((source.height * THUMBNAIL_WIDTH) / source.width));
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  paintStageBackground(ctx, out.width, out.height);
  ctx.drawImage(source, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", 0.85);
}

type CaptureOptions = CaptureViewsOptions & {
  createCanvas?: () => HTMLCanvasElement;
};

export async function captureThumbnails({ createCanvas, ...options }: CaptureOptions): Promise<Thumbnails | null> {
  return captureViews(options, (source) => thumbnailOf(source, createCanvas));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/io/capture-views.test.ts tests/lib/share/shirt-image.test.ts tests/lib/checkout/thumbnails.test.ts`
Expected: PASS (los 4 tests existentes de miniaturas siguen verdes: el refactor no cambia el comportamiento). Luego `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/io/capture-views.ts lib/share/shirt-image.ts lib/checkout/thumbnails.ts tests/lib/io/capture-views.test.ts tests/lib/share/shirt-image.test.ts
git commit -m "feat: share the turn-and-capture sequence and crop shirt captures to their content" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Composición de la imagen

**Files:**
- Create: `lib/share/compose-story.ts`
- Test: `tests/lib/share/compose-story.test.ts`

**Interfaces:**
- Consumes: `fitInside`, `coverCrop` (Tarea 2), constantes de `story-layout.ts`, `loadImage` de `@/lib/builder/texture/image-loader`, `resolveFontFamily` de `@/lib/builder/texture/resolve-font-family`.
- Produces:
  - `type ShirtViews = { front: HTMLCanvasElement; back: HTMLCanvasElement }`, `type StoryAssets = { background: HTMLImageElement; logo: HTMLImageElement }`, `type StoryFonts = { display: string; body: string }`
  - `layoutPhrase(ctx: CanvasRenderingContext2D, text: string, fontFamily: string): { size: number; lines: string[] }`
  - `drawStory(ctx: CanvasRenderingContext2D, assets: StoryAssets, views: ShirtViews, phrase: string, fonts: StoryFonts): void`
  - `renderStory(views: ShirtViews, phrase: string, deps?: RenderDeps): Promise<Blob>` con `type RenderDeps = { loadAssets: () => Promise<StoryAssets>; loadFonts: () => Promise<StoryFonts>; createCanvas: () => HTMLCanvasElement }`.

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/share/compose-story.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import {
  drawStory,
  layoutPhrase,
  renderStory,
  type RenderDeps,
  type ShirtViews,
  type StoryAssets,
  type StoryFonts,
} from "@/lib/share/compose-story";
import { BACK_RECT, CTA, FRONT_RECT, LOGO, PHRASE, SHARE_URL, STORY_HEIGHT, STORY_WIDTH } from "@/lib/share/story-layout";

// A fake 2d context that records what is drawn. Text is as wide as a real font
// would be, roughly: 0.6 px per character per px of font size.
function createCtx() {
  const calls: string[] = [];
  const fontsAtText: string[] = [];
  const ctx = {
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetY: 0,
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn((image: { id: string }) => {
      calls.push(`image:${image.id}`);
    }),
    fillText: vi.fn((text: string) => {
      calls.push(`text:${text}`);
      fontsAtText.push(ctx.font);
    }),
    measureText: vi.fn((text: string) => {
      const px = parseFloat(/([\d.]+)px/.exec(ctx.font)?.[1] ?? "10");
      return { width: text.length * px * 0.6 };
    }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, mock: ctx, calls, fontsAtText };
}

const assets = {
  background: { id: "background", naturalWidth: 941, naturalHeight: 1672 },
  logo: { id: "logo", naturalWidth: 512, naturalHeight: 381 },
} as unknown as StoryAssets;
const views = {
  front: { id: "front", width: 300, height: 600 },
  back: { id: "back", width: 600, height: 300 },
} as unknown as ShirtViews;
const fonts: StoryFonts = { display: "Oswald, sans-serif", body: "Montserrat, sans-serif" };

describe("layoutPhrase", () => {
  it("keeps a short phrase on one line at the biggest size, in capitals", () => {
    const { ctx } = createCtx();
    expect(layoutPhrase(ctx, "Se viene el campeón", fonts.display)).toEqual({
      size: PHRASE.maxSize,
      lines: ["SE VIENE EL CAMPEÓN"],
    });
  });

  it("wraps a longer phrase onto two lines before shrinking it", () => {
    const { ctx } = createCtx();
    expect(layoutPhrase(ctx, "Presentando a los nuevos campeones", fonts.display)).toEqual({
      size: PHRASE.maxSize,
      lines: ["PRESENTANDO A LOS", "NUEVOS CAMPEONES"],
    });
  });

  it("shrinks a long phrase until it fits in two lines", () => {
    const { ctx } = createCtx();
    const { size, lines } = layoutPhrase(ctx, "Una frase un poco mas larga que las que usamos hoy", fonts.display);
    expect(size).toBeLessThan(PHRASE.maxSize);
    expect(size).toBeGreaterThanOrEqual(PHRASE.minSize);
    expect(lines.length).toBeLessThanOrEqual(PHRASE.maxLines);
  });

  it("does not break on an absurdly long phrase: it stops at the smallest size", () => {
    const { ctx } = createCtx();
    const { size, lines } = layoutPhrase(ctx, "palabra ".repeat(40).trim(), fonts.display);
    expect(size).toBe(PHRASE.minSize);
    expect(lines.length).toBeGreaterThan(0);
  });
});

describe("drawStory", () => {
  it("draws background, logo, phrase, shirts and the call to action, in that order", () => {
    const { ctx, calls } = createCtx();
    drawStory(ctx, assets, views, "Se viene el campeón", fonts);
    expect(calls).toEqual([
      "image:background",
      "image:logo",
      "text:SE VIENE EL CAMPEÓN",
      "image:front",
      "image:back",
      `text:${CTA.label}`,
      `text:${SHARE_URL}`,
    ]);
  });

  it("fills the whole story with the background, cropping only the overflow", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const args = mock.drawImage.mock.calls[0] as unknown as number[];
    expect(args.slice(5)).toEqual([0, 0, STORY_WIDTH, STORY_HEIGHT]);
    expect(args[4]).toBeCloseTo(1672, 3); // source height used: all of it
    expect(args[3]).toBeLessThanOrEqual(941);
  });

  it("centers the logo at its width, keeping its proportions", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const call = mock.drawImage.mock.calls.find((c) => (c[0] as unknown as { id: string }).id === "logo")!;
    const [, x, y, w, h] = call as unknown as number[];
    expect(x).toBeCloseTo((STORY_WIDTH - LOGO.width) / 2, 5);
    expect(y).toBe(LOGO.y);
    expect(w).toBe(LOGO.width);
    expect(h).toBeCloseTo((LOGO.width * 381) / 512, 5);
  });

  it("fits each shirt inside its box, centered", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    const find = (id: string) =>
      mock.drawImage.mock.calls.find((c) => (c[0] as unknown as { id: string }).id === id)! as unknown as number[];

    // front is 300x600 in a 560x520 box: limited by height, so 260x520.
    const front = find("front");
    expect(front[1]).toBeCloseTo(FRONT_RECT.x + (FRONT_RECT.w - 260) / 2, 3);
    expect(front[2]).toBeCloseTo(FRONT_RECT.y, 3);
    expect(front[3]).toBeCloseTo(260, 3);
    expect(front[4]).toBeCloseTo(520, 3);

    // back is 600x300 in a 560x520 box: limited by width, so 560x280.
    const back = find("back");
    expect(back[1]).toBeCloseTo(BACK_RECT.x, 3);
    expect(back[2]).toBeCloseTo(BACK_RECT.y + (BACK_RECT.h - 280) / 2, 3);
    expect(back[3]).toBeCloseTo(560, 3);
    expect(back[4]).toBeCloseTo(280, 3);
  });

  it("paints both halos before the first shirt so they never tint a shirt", () => {
    const { ctx, mock } = createCtx();
    drawStory(ctx, assets, views, "Así se ve ganar", fonts);
    expect(mock.createRadialGradient).toHaveBeenCalledTimes(2);
    const lastHalo = Math.max(...mock.createRadialGradient.mock.invocationCallOrder);
    const frontCall = mock.drawImage.mock.calls.findIndex((c) => (c[0] as unknown as { id: string }).id === "front");
    expect(lastHalo).toBeLessThan(mock.drawImage.mock.invocationCallOrder[frontCall]);
  });

  it("uses the display font for the phrase and the body font for the call to action", () => {
    const { ctx, fontsAtText } = createCtx();
    drawStory(ctx, assets, views, "Se viene el campeón", fonts);
    expect(fontsAtText[0]).toContain("Oswald");
    expect(fontsAtText[1]).toContain("Montserrat");
    expect(fontsAtText[2]).toContain("Montserrat");
  });
});

describe("renderStory", () => {
  function deps(overrides: Partial<RenderDeps> = {}) {
    const { ctx, calls } = createCtx();
    const blob = new Blob(["png"], { type: "image/png" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
    } as unknown as HTMLCanvasElement;
    return {
      calls,
      blob,
      canvas,
      deps: {
        loadAssets: vi.fn(async () => assets),
        loadFonts: vi.fn(async () => fonts),
        createCanvas: () => canvas,
        ...overrides,
      },
    };
  }

  it("draws on a 1080x1920 canvas and resolves with the PNG", async () => {
    const { calls, blob, canvas, deps: d } = deps();
    await expect(renderStory(views, "Se viene el campeón", d)).resolves.toBe(blob);
    expect(canvas.width).toBe(STORY_WIDTH);
    expect(canvas.height).toBe(STORY_HEIGHT);
    expect(calls[0]).toBe("image:background");
    expect((canvas.toBlob as ReturnType<typeof vi.fn>).mock.calls[0][1]).toBe("image/png");
  });

  it("rejects when the PNG cannot be produced", async () => {
    const { canvas, deps: d } = deps();
    (canvas.toBlob as ReturnType<typeof vi.fn>).mockImplementation((callback: BlobCallback) => callback(null));
    await expect(renderStory(views, "Así se ve ganar", d)).rejects.toThrow();
  });

  it("rejects when the background cannot be loaded, without drawing anything", async () => {
    const { calls, deps: d } = deps({ loadAssets: vi.fn(async () => Promise.reject(new Error("404"))) });
    await expect(renderStory(views, "Así se ve ganar", d)).rejects.toThrow("404");
    expect(calls).toEqual([]);
  });

  it("rejects without a 2d context", async () => {
    const { canvas, deps: d } = deps();
    (canvas.getContext as ReturnType<typeof vi.fn>).mockReturnValue(null);
    await expect(renderStory(views, "Así se ve ganar", d)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/share/compose-story.test.ts`
Expected: FAIL (no se puede resolver `@/lib/share/compose-story`).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/share/compose-story.ts`:

```ts
import { loadImage } from "@/lib/builder/texture/image-loader";
import { resolveFontFamily } from "@/lib/builder/texture/resolve-font-family";
import { coverCrop, fitInside, type Rect } from "./geometry";
import {
  BACKGROUND_SRC,
  BACK_RECT,
  CTA,
  FRONT_RECT,
  HALO,
  LOGO,
  LOGO_SRC,
  PHRASE,
  SHARE_URL,
  STORY_HEIGHT,
  STORY_WIDTH,
} from "./story-layout";

export type ShirtViews = { front: HTMLCanvasElement; back: HTMLCanvasElement };
export type StoryAssets = { background: HTMLImageElement; logo: HTMLImageElement };
// CSS font-family lists, already resolved from the next/font variables.
export type StoryFonts = { display: string; body: string };

function sizeOf(source: HTMLImageElement | HTMLCanvasElement): { w: number; h: number } {
  return "naturalWidth" in source
    ? { w: source.naturalWidth, h: source.naturalHeight }
    : { w: source.width, h: source.height };
}

function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The phrase in capitals, on at most PHRASE.maxLines lines, at the biggest font
// size (down to PHRASE.minSize) at which every line fits PHRASE.maxWidth. A
// phrase that never fits is returned at the smallest size, as it is.
export function layoutPhrase(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFamily: string
): { size: number; lines: string[] } {
  const upper = text.toLocaleUpperCase("es");
  let best = { size: PHRASE.minSize, lines: [upper] };
  for (let size = PHRASE.maxSize; size >= PHRASE.minSize; size -= 2) {
    ctx.font = `${PHRASE.weight} ${size}px ${fontFamily}`;
    const lines = wrapWords(ctx, upper, PHRASE.maxWidth);
    best = { size, lines };
    if (lines.length <= PHRASE.maxLines && lines.every((line) => ctx.measureText(line).width <= PHRASE.maxWidth)) {
      return best;
    }
  }
  return best;
}

function drawHalo(ctx: CanvasRenderingContext2D, box: Rect): void {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const radius = HALO.radius * box.w;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, HALO.inner);
  glow.addColorStop(1, HALO.outer);
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawShirt(ctx: CanvasRenderingContext2D, shirt: HTMLCanvasElement, box: Rect): void {
  const fit = fitInside(shirt.width, shirt.height, box);
  ctx.drawImage(shirt, fit.x, fit.y, fit.w, fit.h);
}

// Everything is drawn in a fixed order: background, logo, phrase, the glow
// behind each shirt, the shirts (back over front) and the call to action.
export function drawStory(
  ctx: CanvasRenderingContext2D,
  { background, logo }: StoryAssets,
  { front, back }: ShirtViews,
  phrase: string,
  fonts: StoryFonts
): void {
  const bg = sizeOf(background);
  const crop = coverCrop(bg.w, bg.h, STORY_WIDTH, STORY_HEIGHT);
  ctx.drawImage(background, crop.x, crop.y, crop.w, crop.h, 0, 0, STORY_WIDTH, STORY_HEIGHT);

  const logoSize = sizeOf(logo);
  ctx.drawImage(logo, (STORY_WIDTH - LOGO.width) / 2, LOGO.y, LOGO.width, (LOGO.width * logoSize.h) / logoSize.w);

  const layout = layoutPhrase(ctx, phrase, fonts.display);
  ctx.save();
  ctx.font = `${PHRASE.weight} ${layout.size}px ${fonts.display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = PHRASE.color;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 2;
  layout.lines.forEach((line, i) => {
    ctx.fillText(line, STORY_WIDTH / 2, PHRASE.y + i * layout.size * PHRASE.lineHeight);
  });
  ctx.restore();

  drawHalo(ctx, FRONT_RECT);
  drawHalo(ctx, BACK_RECT);
  drawShirt(ctx, front, FRONT_RECT);
  drawShirt(ctx, back, BACK_RECT);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `${CTA.labelWeight} ${CTA.labelSize}px ${fonts.body}`;
  ctx.fillStyle = CTA.labelColor;
  ctx.fillText(CTA.label, STORY_WIDTH / 2, CTA.labelY);
  ctx.font = `${CTA.urlWeight} ${CTA.urlSize}px ${fonts.body}`;
  ctx.fillStyle = CTA.urlColor;
  ctx.fillText(SHARE_URL, STORY_WIDTH / 2, CTA.urlY);
  ctx.restore();
}

export type RenderDeps = {
  loadAssets: () => Promise<StoryAssets>;
  loadFonts: () => Promise<StoryFonts>;
  createCanvas: () => HTMLCanvasElement;
};

// The two assets are fetched once and reused by every "Otra frase".
let assetsPromise: Promise<StoryAssets> | null = null;
function cachedAssets(): Promise<StoryAssets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([loadImage(BACKGROUND_SRC), loadImage(LOGO_SRC)])
      .then(([background, logo]) => ({ background, logo }))
      .catch((error) => {
        assetsPromise = null;
        throw error;
      });
  }
  return assetsPromise;
}

// The fonts load on demand (next/font, preload: false): ask for them before
// drawing, or the canvas would use the fallback font.
async function loadStoryFonts(): Promise<StoryFonts> {
  const display = resolveFontFamily("--font-nn-oswald");
  const body = resolveFontFamily("--font-nn-montserrat");
  if (typeof document !== "undefined" && document.fonts) {
    await Promise.all([
      document.fonts.load(`${PHRASE.weight} ${PHRASE.maxSize}px ${display}`),
      document.fonts.load(`${CTA.labelWeight} ${CTA.labelSize}px ${body}`),
      document.fonts.load(`${CTA.urlWeight} ${CTA.urlSize}px ${body}`),
    ]).catch(() => undefined);
  }
  return { display, body };
}

const defaultDeps: RenderDeps = {
  loadAssets: cachedAssets,
  loadFonts: loadStoryFonts,
  createCanvas: () => document.createElement("canvas"),
};

export async function renderStory(
  views: ShirtViews,
  phrase: string,
  deps: RenderDeps = defaultDeps
): Promise<Blob> {
  const [assets, fonts] = await Promise.all([deps.loadAssets(), deps.loadFonts()]);
  const canvas = deps.createCanvas();
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context to compose the story");
  drawStory(ctx, assets, views, phrase, fonts);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))), "image/png");
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/share/compose-story.test.ts`
Expected: PASS. Si algún valor numérico del test de "fits each shirt" difiere por redondeo, ajustar solo la precisión de `toBeCloseTo`, no la implementación. Luego `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add lib/share/compose-story.ts tests/lib/share/compose-story.test.ts
git commit -m "feat: compose the 1080x1920 story image on a canvas" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Compartir o descargar el archivo

**Files:**
- Create: `lib/share/share-image.ts`
- Test: `tests/lib/share/share-image.test.ts`

**Interfaces:**
- Produces: `type ShareResult = "shared" | "cancelled" | "downloaded"`, `storyFileName(projectName: string): string`, `shareText(url: string): string`, `downloadBlob(blob: Blob, name: string): void`, `shareImage(blob: Blob, options: { name: string; text: string }, deps?: { nav?: ShareNavigator; download?: (blob: Blob, name: string) => void }): Promise<ShareResult>` con `type ShareNavigator = { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean }`.

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/share/share-image.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { shareImage, shareText, storyFileName } from "@/lib/share/share-image";

const blob = new Blob(["png"], { type: "image/png" });
const options = { name: "mi-diseno-historia.png", text: "Mirá mi camiseta" };

describe("storyFileName", () => {
  it("turns the project name into a safe file name", () => {
    expect(storyFileName("Los del Viernes")).toBe("los-del-viernes-historia.png");
    expect(storyFileName("  Camiseta Ñandú Él!  ")).toBe("camiseta-nandu-el-historia.png");
  });

  it("falls back to a generic name when nothing usable is left", () => {
    expect(storyFileName("!!!")).toBe("mi-camiseta-historia.png");
    expect(storyFileName("")).toBe("mi-camiseta-historia.png");
  });
});

describe("shareText", () => {
  it("invites to design theirs, with the address", () => {
    expect(shareText("gepe.com")).toBe("Mirá mi camiseta. Diseñá la tuya en gepe.com");
  });
});

describe("shareImage", () => {
  it("shares the file with the native menu when the browser can share files", async () => {
    const nav = {
      canShare: vi.fn<(data: ShareData) => boolean>(() => true),
      share: vi.fn<(data: ShareData) => Promise<void>>(async () => {}),
    };
    const download = vi.fn();

    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("shared");

    const data = nav.share.mock.calls[0][0] as ShareData;
    expect(data.text).toBe(options.text);
    expect(data.files).toHaveLength(1);
    expect(data.files![0].name).toBe(options.name);
    expect(data.files![0].type).toBe("image/png");
    expect(nav.canShare).toHaveBeenCalledWith({ files: data.files });
    expect(download).not.toHaveBeenCalled();
  });

  it("treats cancelling the menu as a result, not an error, and does not download", async () => {
    const nav = {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new DOMException("cancelled", "AbortError");
      }),
    };
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });

  it("downloads the file when sharing fails for any other reason", async () => {
    const nav = {
      canShare: () => true,
      share: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav, download })).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledWith(blob, options.name);
  });

  it("downloads the file when the browser cannot share files", async () => {
    const download = vi.fn();
    await expect(shareImage(blob, options, { nav: { canShare: () => false, share: vi.fn() }, download })).resolves.toBe(
      "downloaded"
    );
    await expect(shareImage(blob, options, { nav: { share: vi.fn() }, download })).resolves.toBe("downloaded");
    await expect(shareImage(blob, options, { nav: {}, download })).resolves.toBe("downloaded");
    await expect(shareImage(blob, options, { nav: undefined, download })).resolves.toBe("downloaded");
    expect(download).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/share/share-image.test.ts`
Expected: FAIL (no se puede resolver `@/lib/share/share-image`).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/share/share-image.ts`:

```ts
export type ShareResult = "shared" | "cancelled" | "downloaded";

export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
};

// "Los del Viernes" -> "los-del-viernes-historia.png"
export function storyFileName(projectName: string): string {
  const slug = projectName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "mi-camiseta"}-historia.png`;
}

export function shareText(url: string): string {
  return `Mirá mi camiseta. Diseñá la tuya en ${url}`;
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isAbort(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError";
}

type ShareDeps = {
  nav?: ShareNavigator;
  download?: (blob: Blob, name: string) => void;
};

// The native share menu (WhatsApp, Instagram...) with the image attached when
// the browser can share files; otherwise, or if sharing fails, the file is
// downloaded. Closing the menu is not an error.
export async function shareImage(
  blob: Blob,
  { name, text }: { name: string; text: string },
  { nav = typeof navigator === "undefined" ? undefined : navigator, download = downloadBlob }: ShareDeps = {}
): Promise<ShareResult> {
  const file = new File([blob], name, { type: blob.type || "image/png" });
  if (nav?.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (isAbort(error)) return "cancelled";
    }
  }
  download(blob, name);
  return "downloaded";
}
```

Nota: `{ nav: undefined }` explícito en un parámetro con valor por defecto **aplica el valor por defecto** (`navigator`), así que el último caso del test (`nav: undefined`) usaría el `navigator` real de jsdom, que no tiene `share`; sigue terminando en descarga y el test pasa. Si se quiere probar "sin navigator" de forma estricta, pasar `nav: {}`, que ya está cubierto.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/share/share-image.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/share/share-image.ts tests/lib/share/share-image.test.ts
git commit -m "feat: share the story with the native menu or download it" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Hook que orquesta el flujo

**Files:**
- Create: `lib/share/use-share-story.ts`
- Test: `tests/lib/share/use-share-story.test.tsx`

**Interfaces:**
- Consumes: `renderStory`, `type ShirtViews` (Tarea 4); `nextPhrase` (Tarea 1); `shareImage`, `shareText`, `storyFileName`, `type ShareResult` (Tarea 5); `SHARE_URL` (Tarea 2).
- Produces: `type ShareStoryState = { status: "closed" } | { status: "preparing" } | { status: "ready"; imageUrl: string; phrase: string } | { status: "error" }` y `useShareStory(captureShirts: () => Promise<ShirtViews | null>)` que devuelve `{ state, open(): Promise<void>, retry(): Promise<void>, anotherPhrase(): Promise<void>, share(projectName: string): Promise<ShareResult | null>, close(): void }`. `open` y `retry` son la misma función.

- [ ] **Step 1: Write the failing test**

Crear `tests/lib/share/use-share-story.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

const renderStory = vi.fn();
vi.mock("@/lib/share/compose-story", () => ({
  renderStory: (...args: unknown[]) => renderStory(...args),
}));

const shareImage = vi.fn();
vi.mock("@/lib/share/share-image", async () => {
  const actual = await vi.importActual<typeof import("@/lib/share/share-image")>("@/lib/share/share-image");
  return { ...actual, shareImage: (...args: unknown[]) => shareImage(...args) };
});

import { STORY_PHRASES } from "@/lib/share/phrases";
import type { ShirtViews } from "@/lib/share/compose-story";
import { SHARE_URL } from "@/lib/share/story-layout";
import { useShareStory } from "@/lib/share/use-share-story";

const views = { front: {}, back: {} } as unknown as ShirtViews;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

let urlCount = 0;
beforeEach(() => {
  urlCount = 0;
  renderStory.mockReset();
  shareImage.mockReset();
  renderStory.mockImplementation(async () => new Blob(["png"], { type: "image/png" }));
  URL.createObjectURL = vi.fn(() => `blob:story-${(urlCount += 1)}`);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("useShareStory", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useShareStory(async () => views));
    expect(result.current.state).toEqual({ status: "closed" });
  });

  it("captures the shirts, composes the story and becomes ready with a phrase", async () => {
    const capture = vi.fn(async () => views);
    const { result } = renderHook(() => useShareStory(capture));

    await act(async () => {
      await result.current.open();
    });

    expect(capture).toHaveBeenCalledTimes(1);
    const state = result.current.state;
    expect(state.status).toBe("ready");
    if (state.status !== "ready") throw new Error("unreachable");
    expect(state.imageUrl).toBe("blob:story-1");
    expect(STORY_PHRASES).toContain(state.phrase);
    expect(renderStory).toHaveBeenCalledWith(views, state.phrase);
  });

  it("shows 'preparing' while the camera is still turning", async () => {
    const pending = deferred<ShirtViews | null>();
    const { result } = renderHook(() => useShareStory(() => pending.promise));

    let opening!: Promise<void>;
    act(() => {
      opening = result.current.open();
    });
    expect(result.current.state).toEqual({ status: "preparing" });

    await act(async () => {
      pending.resolve(views);
      await opening;
    });
    expect(result.current.state.status).toBe("ready");
  });

  it("ignores a second open while one is in progress (double tap)", async () => {
    const pending = deferred<ShirtViews | null>();
    const capture = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useShareStory(capture));

    let first!: Promise<void>;
    act(() => {
      first = result.current.open();
      void result.current.open();
    });
    expect(capture).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve(views);
      await first;
    });
  });

  it("goes to error when a capture comes back empty, and retry captures again", async () => {
    const capture = vi.fn<() => Promise<ShirtViews | null>>().mockResolvedValueOnce(null).mockResolvedValue(views);
    const { result } = renderHook(() => useShareStory(capture));

    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state).toEqual({ status: "error" });
    expect(renderStory).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.retry();
    });
    expect(capture).toHaveBeenCalledTimes(2);
    expect(result.current.state.status).toBe("ready");
  });

  it("goes to error when the capture throws or the image cannot be composed", async () => {
    const { result, rerender } = renderHook(({ capture }) => useShareStory(capture), {
      initialProps: { capture: (async () => Promise.reject(new Error("tainted"))) as () => Promise<ShirtViews | null> },
    });
    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state).toEqual({ status: "error" });

    renderStory.mockRejectedValueOnce(new Error("no blob"));
    rerender({ capture: async () => views });
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state).toEqual({ status: "error" });
  });

  it("'anotherPhrase' recomposes with a different phrase without capturing again, and frees the old image", async () => {
    const capture = vi.fn(async () => views);
    const { result } = renderHook(() => useShareStory(capture));
    await act(async () => {
      await result.current.open();
    });
    const first = result.current.state;
    if (first.status !== "ready") throw new Error("unreachable");

    await act(async () => {
      await result.current.anotherPhrase();
    });

    const second = result.current.state;
    if (second.status !== "ready") throw new Error("unreachable");
    expect(second.phrase).not.toBe(first.phrase);
    expect(second.imageUrl).toBe("blob:story-2");
    expect(capture).toHaveBeenCalledTimes(1);
    expect(renderStory).toHaveBeenCalledTimes(2);
    expect(renderStory).toHaveBeenLastCalledWith(views, second.phrase);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-1");
  });

  it("closing while the camera is still turning leaves nothing behind, and opening again works", async () => {
    const pending = deferred<ShirtViews | null>();
    const capture = vi
      .fn<() => Promise<ShirtViews | null>>()
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValue(views);
    const { result } = renderHook(() => useShareStory(capture));

    let first!: Promise<void>;
    act(() => {
      first = result.current.open();
    });
    act(() => result.current.close());
    expect(result.current.state).toEqual({ status: "closed" });

    await act(async () => {
      pending.resolve(views);
      await first;
    });
    expect(result.current.state).toEqual({ status: "closed" });
    expect(renderStory).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.open();
    });
    expect(result.current.state.status).toBe("ready");
  });

  it("close frees the image, and so does unmounting", async () => {
    const { result, unmount } = renderHook(() => useShareStory(async () => views));
    await act(async () => {
      await result.current.open();
    });
    act(() => result.current.close());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-1");

    await act(async () => {
      await result.current.open();
    });
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:story-2");
  });

  it("shares the composed image under a name taken from the project, with the address in the text", async () => {
    shareImage.mockResolvedValue("shared");
    const { result } = renderHook(() => useShareStory(async () => views));
    expect(await result.current.share("Los del Viernes")).toBeNull();

    await act(async () => {
      await result.current.open();
    });
    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.share("Los del Viernes");
    });

    expect(outcome).toBe("shared");
    const [blob, options] = shareImage.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(options.name).toBe("los-del-viernes-historia.png");
    expect(options.text).toContain(SHARE_URL);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/share/use-share-story.test.tsx`
Expected: FAIL (no se puede resolver `@/lib/share/use-share-story`).

- [ ] **Step 3: Write minimal implementation**

Crear `lib/share/use-share-story.ts`:

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderStory, type ShirtViews } from "./compose-story";
import { nextPhrase } from "./phrases";
import { shareImage, shareText, storyFileName, type ShareResult } from "./share-image";
import { SHARE_URL } from "./story-layout";

export type ShareStoryState =
  | { status: "closed" }
  | { status: "preparing" }
  | { status: "ready"; imageUrl: string; phrase: string }
  | { status: "error" };

// Drives the whole flow from event handlers (no effects that could run twice):
// capture the two sides, compose the image, show it, and recompose it with
// another phrase on demand. The captured shirts are kept so "otra frase" does
// not turn the camera again.
export function useShareStory(captureShirts: () => Promise<ShirtViews | null>) {
  const [state, setState] = useState<ShareStoryState>({ status: "closed" });
  // Bumped on every open and close: an async step that finds a newer number
  // belongs to a flow that was closed or replaced, and must not publish.
  const generation = useRef(0);
  const busy = useRef(false);
  const views = useRef<ShirtViews | null>(null);
  const blob = useRef<Blob | null>(null);
  const phrase = useRef<string | null>(null);
  const url = useRef<string | null>(null);

  const revoke = useCallback(() => {
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
  }, []);

  // Free the image when the page goes away.
  useEffect(() => revoke, [revoke]);

  const publish = useCallback(
    (image: Blob, text: string) => {
      revoke();
      blob.current = image;
      phrase.current = text;
      url.current = URL.createObjectURL(image);
      setState({ status: "ready", imageUrl: url.current, phrase: text });
    },
    [revoke]
  );

  const open = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    generation.current += 1;
    const mine = generation.current;
    views.current = null;
    blob.current = null;
    revoke();
    setState({ status: "preparing" });
    try {
      const captured = await captureShirts();
      if (mine !== generation.current) return;
      if (!captured) throw new Error("The shirts could not be captured");
      views.current = captured;
      const first = nextPhrase(null);
      const image = await renderStory(captured, first);
      if (mine !== generation.current) return;
      publish(image, first);
    } catch {
      if (mine === generation.current) setState({ status: "error" });
    } finally {
      if (mine === generation.current) busy.current = false;
    }
  }, [captureShirts, publish, revoke]);

  const anotherPhrase = useCallback(async () => {
    const captured = views.current;
    if (!captured || busy.current) return;
    busy.current = true;
    const mine = generation.current;
    try {
      const next = nextPhrase(phrase.current);
      const image = await renderStory(captured, next);
      if (mine !== generation.current) return;
      publish(image, next);
    } catch {
      if (mine === generation.current) setState({ status: "error" });
    } finally {
      if (mine === generation.current) busy.current = false;
    }
  }, [publish]);

  const share = useCallback(async (projectName: string): Promise<ShareResult | null> => {
    if (!blob.current) return null;
    return shareImage(blob.current, { name: storyFileName(projectName), text: shareText(SHARE_URL) });
  }, []);

  const close = useCallback(() => {
    generation.current += 1;
    busy.current = false;
    views.current = null;
    blob.current = null;
    phrase.current = null;
    revoke();
    setState({ status: "closed" });
  }, [revoke]);

  return { state, open, retry: open, anotherPhrase, share, close };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/share/use-share-story.test.tsx`
Expected: PASS. Luego `npx tsc --noEmit` y `npm run lint` (el hook no hace `setState` dentro de efectos, así que no debe marcar `react-hooks/set-state-in-effect`).

- [ ] **Step 5: Commit**

```bash
git add lib/share/use-share-story.ts tests/lib/share/use-share-story.test.tsx
git commit -m "feat: add the hook that captures, composes and publishes the story" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Diálogo con revelado y confeti

**Files:**
- Create: `components/share/Confetti.tsx`, `components/share/ShareStoryDialog.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/share/ShareStoryDialog.test.tsx`

**Interfaces:**
- Consumes: `ShareStoryState` (Tarea 6), `ShareResult` (Tarea 5), `useDesign` de `@/lib/builder/state/design-context`, `ShareIcon`, `ShirtIcon` de `@/components/builder/icons`.
- Produces: `<ShareStoryDialog state onShare onAnother onRetry onClose />` con `onShare: (projectName: string) => Promise<ShareResult | null>`, `onAnother: () => void`, `onRetry: () => void`, `onClose: () => void`. Renderiza `null` con `status: "closed"`. Dentro de un `DesignProvider`.
- Textos: diálogo (`role="dialog"`, nombre "Compartir tu camiseta"); estado armando con `role="status"` "Armando tu camiseta…"; imagen con `alt="Tu camiseta, lista para compartir"`; botones "Compartir", "Otra frase", "Cerrar", "Reintentar"; error "No pudimos armar la imagen."; nota tras descargar "Se descargó la imagen. Subila a tu historia desde la galería."

- [ ] **Step 1: Write the failing test**

Crear `tests/components/share/ShareStoryDialog.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DesignProvider } from "@/lib/builder/state/design-context";
import { ShareStoryDialog } from "@/components/share/ShareStoryDialog";
import type { ShareStoryState } from "@/lib/share/use-share-story";

const ready: ShareStoryState = { status: "ready", imageUrl: "blob:story", phrase: "Se viene el campeón" };

function setup(state: ShareStoryState, overrides: Partial<Parameters<typeof ShareStoryDialog>[0]> = {}) {
  const props = {
    state,
    onShare: vi.fn(async () => "shared" as const),
    onAnother: vi.fn(),
    onRetry: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const ui = (s: ShareStoryState) => (
    <DesignProvider>
      <ShareStoryDialog {...props} state={s} />
    </DesignProvider>
  );
  const utils = render(ui(state));
  return { ...utils, props, ui };
}

describe("ShareStoryDialog", () => {
  it("renders nothing while closed", () => {
    setup({ status: "closed" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the reveal moment while preparing: a status message, no image, and a way out", () => {
    const { props } = setup({ status: "preparing" });
    const dialog = screen.getByRole("dialog", { name: "Compartir tu camiseta" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Armando tu camiseta…");
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the image with its entrance animation and the confetti when ready", () => {
    setup(ready);
    const image = screen.getByAltText("Tu camiseta, lista para compartir");
    expect(image).toHaveAttribute("src", "blob:story");
    expect(image.className).toContain("story-in");
    const confetti = screen.getByTestId("confetti");
    expect(confetti).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Otra frase" })).toBeEnabled();
  });

  it("asks for another phrase", () => {
    const { props } = setup(ready);
    fireEvent.click(screen.getByRole("button", { name: "Otra frase" }));
    expect(props.onAnother).toHaveBeenCalledTimes(1);
  });

  it("shares with the project name, and says nothing when the native menu was used", async () => {
    const { props } = setup(ready);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await waitFor(() => expect(props.onShare).toHaveBeenCalledWith("Mi diseño"));
    expect(screen.queryByText(/Se descargó la imagen/)).toBeNull();
  });

  it("says the image was downloaded when it could not be shared", async () => {
    setup(ready, { onShare: vi.fn(async () => "downloaded" as const) });
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(await screen.findByText("Se descargó la imagen. Subila a tu historia desde la galería.")).toBeInTheDocument();
  });

  it("does not start a second share while one is in progress", async () => {
    let finish!: (value: "shared") => void;
    const onShare = vi.fn(() => new Promise<"shared">((resolve) => (finish = resolve)));
    setup(ready, { onShare });
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(onShare).toHaveBeenCalledTimes(1);
    finish("shared");
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled());
  });

  it("shows an error with Reintentar and Cerrar", () => {
    const { props } = setup({ status: "error" });
    expect(screen.getByText("No pudimos armar la imagen.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", () => {
    const { props } = setup(ready);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("moves the focus into the dialog, keeps Tab inside it, and gives the focus back on close", () => {
    const { rerender, ui } = setup({ status: "closed" });
    // A trigger outside the dialog, focused before it opens.
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();

    rerender(ui(ready));
    expect(screen.getByRole("dialog")).toHaveFocus();

    // Only the dialog's own buttons: the trigger above lives outside it.
    const buttons = within(screen.getByRole("dialog")).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(buttons[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(buttons[buttons.length - 1]).toHaveFocus();

    rerender(ui({ status: "closed" }));
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe("reduced motion", () => {
  it("turns the entrance animation and the confetti off in the stylesheet", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const block = /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
    expect(block).toContain(".story-in");
    expect(block).toContain(".confetti-piece");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/share/ShareStoryDialog.test.tsx`
Expected: FAIL (no se puede resolver `@/components/share/ShareStoryDialog`).

- [ ] **Step 3: Write minimal implementation**

Agregar al final de `app/globals.css`:

```css

/* Share story: reveal animation and confetti. */
@keyframes story-in {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.85) rotate(-3deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.story-in {
  animation: story-in 700ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
}

@keyframes confetti-fall {
  from {
    transform: translate3d(0, -10vh, 0) rotate(0deg);
    opacity: 1;
  }
  to {
    transform: translate3d(var(--drift), 110vh, 0) rotate(var(--spin));
    opacity: 0.9;
  }
}

.confetti-piece {
  position: absolute;
  top: 0;
  width: 10px;
  height: 16px;
  border-radius: 2px;
  animation: confetti-fall 2s ease-in both;
}

@media (prefers-reduced-motion: reduce) {
  .story-in {
    animation: none;
  }
  .confetti-piece {
    display: none;
  }
}
```

Crear `components/share/Confetti.tsx`:

```tsx
import type { CSSProperties } from "react";

const COLORS = ["#f5b400", "#ffffff", "#fdf1cc", "#c98f00", "#0a5c36"];

// Fixed values (no randomness while rendering) so the burst is the same on
// every render and in every test.
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 40) / 100,
  duration: 1.6 + ((i * 29) % 12) / 10,
  drift: ((i * 17) % 41) - 20,
  spin: (i * 47) % 360,
  color: COLORS[i % COLORS.length],
}));

export function Confetti() {
  return (
    <div data-testid="confetti" aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {PIECES.map((piece, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              backgroundColor: piece.color,
              "--drift": `${piece.drift}vw`,
              "--spin": `${piece.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
```

Crear `components/share/ShareStoryDialog.tsx`:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { ShareIcon, ShirtIcon } from "@/components/builder/icons";
import { useDesign } from "@/lib/builder/state/design-context";
import type { ShareResult } from "@/lib/share/share-image";
import type { ShareStoryState } from "@/lib/share/use-share-story";
import { Confetti } from "./Confetti";

type Props = {
  state: ShareStoryState;
  onShare: (projectName: string) => Promise<ShareResult | null>;
  onAnother: () => void;
  onRetry: () => void;
  onClose: () => void;
};

const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/70 bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-60";
const FOCUSABLE = "button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

export function ShareStoryDialog({ state, onShare, onAnother, onRetry, onClose }: Props) {
  const { state: design } = useDesign();
  const dialog = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const open = state.status !== "closed";

  // Take the focus when the dialog opens and give it back when it closes.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, [open]);

  // Escape closes; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    setNote(null);
    try {
      const result = await onShare(design.projectName);
      if (result === "downloaded") setNote("Se descargó la imagen. Subila a tu historia desde la galería.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      {state.status === "ready" && <Confetti />}
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Compartir tu camiseta"
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-sm flex-col items-center gap-4 outline-none"
      >
        <button type="button" onClick={onClose} className={`${SECONDARY_BUTTON} self-end`}>
          Cerrar
        </button>

        {state.status === "preparing" && (
          <div role="status" className="flex flex-col items-center gap-4 py-16 text-white">
            <ShirtIcon className="h-16 w-16 animate-pulse" />
            <p className="text-lg font-semibold">Armando tu camiseta…</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-4 py-12 text-center text-white">
            <p role="alert" className="text-lg font-semibold">
              No pudimos armar la imagen.
            </p>
            <button type="button" onClick={onRetry} className={PRIMARY_BUTTON}>
              Reintentar
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a blob made in the browser, nothing to optimize */}
            <img
              src={state.imageUrl}
              alt="Tu camiseta, lista para compartir"
              className="story-in max-h-[68dvh] w-auto rounded-2xl shadow-2xl"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={onAnother} className={SECONDARY_BUTTON}>
                Otra frase
              </button>
              <button type="button" onClick={handleShare} disabled={sharing} className={PRIMARY_BUTTON}>
                <ShareIcon className="h-5 w-5" />
                Compartir
              </button>
            </div>
            {note && (
              <p role="status" className="text-center text-sm text-white/90">
                {note}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/share/ShareStoryDialog.test.tsx`
Expected: PASS. Luego `npx tsc --noEmit` y `npm run lint`. Si `eslint` marca el comentario `eslint-disable-next-line` del `<img>` como innecesario o falta de regla, dejar el que corresponda según la salida (en `DesignPreview.tsx` ya hay un precedente que pasa lint).

- [ ] **Step 5: Commit**

```bash
git add components/share app/globals.css tests/components/share/ShareStoryDialog.test.tsx
git commit -m "feat: add the share dialog with a reveal moment and confetti" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Conectar Compartir y quitar Descargar PNG

**Files:**
- Modify: `components/builder/Header.tsx`, `components/builder/BuilderPage.tsx`, `components/builder/viewer/StageToolbar.tsx`, `components/builder/icons.tsx`, `lib/builder/io/export-image.ts`
- Test: `tests/components/Header.test.tsx`, `tests/components/BuilderPage.test.tsx`, `tests/components/viewer/StageToolbar.test.tsx`, `tests/lib/io/export-image.test.ts`

**Interfaces:**
- Consumes: `useShareStory` (Tarea 6), `ShareStoryDialog` (Tarea 7), `captureViews` (Tarea 3), `shirtImageOf` (Tarea 3), `pause` de `@/lib/checkout/pause`, `type ShirtViews`.
- Produces: `Header` recibe `{ onReview: (design: DesignState) => void; onShare: () => void; reviewing?: boolean; sharing?: boolean }`. `StageToolbar` ya no recibe props. `exportStagePng` y `DownloadIcon` desaparecen.

- [ ] **Step 1: Update the failing tests**

`tests/components/Header.test.tsx`: en todos los `<Header onReview={...} />` agregar `onShare={() => {}}` (por ejemplo `<Header onReview={() => {}} onShare={() => {}} />`; el de `onReview={onReview}` pasa a `<Header onReview={onReview} onShare={() => {}} />`; el de `reviewing` a `<Header onReview={() => {}} onShare={() => {}} reviewing />`). Reemplazar el primer test y agregar dos:

```tsx
  it("shows the project name and enables both Compartir and Revisar diseño", () => {
    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Nombre del diseño" })).toHaveValue("Mi diseño");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Revisar diseño" })).toBeEnabled();
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("calls onShare when Compartir is pressed", () => {
    const onShare = vi.fn();
    renderWithDesign(<Header onReview={() => {}} onShare={onShare} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("blocks both buttons while sharing, and while reviewing", () => {
    const { unmount } = renderWithDesign(<Header onReview={() => {}} onShare={() => {}} sharing />);
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revisar diseño" })).toBeDisabled();
    unmount();

    renderWithDesign(<Header onReview={() => {}} onShare={() => {}} reviewing />);
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
  });
```

`tests/components/viewer/StageToolbar.test.tsx`: reemplazar `<StageToolbar onDownload={() => {}} />` por `<StageToolbar />`, borrar el test `calls onDownload`, y agregar:

```tsx
  it("no longer offers a PNG download: sharing is the only way out", () => {
    renderWithDesign(<StageToolbar />);
    expect(screen.queryByRole("button", { name: "Descargar PNG" })).toBeNull();
  });
```
(Si `vi` queda sin usar en el import, quitarlo.)

`tests/lib/io/export-image.test.ts`: reemplazar el archivo por:

```ts
import { describe, it, expect, vi } from "vitest";
import { paintStageBackground } from "@/lib/builder/io/export-image";
import { STAGE_STOPS } from "@/lib/builder/stage-style";

function mockCtx() {
  const gradient = { addColorStop: vi.fn() };
  return {
    gradient,
    ctx: {
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D,
  };
}

describe("paintStageBackground", () => {
  it("fills the whole canvas with the linear gradient stops, then the glow", () => {
    const { ctx, gradient } = mockCtx();
    paintStageBackground(ctx, 800, 600);
    for (const [offset, color] of STAGE_STOPS) {
      expect(gradient.addColorStop).toHaveBeenCalledWith(offset, color);
    }
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
    expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 800, 600);
  });
});
```

`tests/components/BuilderPage.test.tsx`: agregar junto a los otros mocks (arriba del `import { BuilderPage }`):

```tsx
const captureViews = vi.fn();
vi.mock("@/lib/builder/io/capture-views", () => ({
  captureViews: (...args: unknown[]) => captureViews(...args),
}));

const renderStory = vi.fn();
vi.mock("@/lib/share/compose-story", () => ({
  renderStory: (...args: unknown[]) => renderStory(...args),
}));
```
En el `beforeEach` existente agregar `captureViews.mockReset(); renderStory.mockReset(); URL.createObjectURL = vi.fn(() => "blob:story"); URL.revokeObjectURL = vi.fn();`. Importar `within` de `@testing-library/react`. Agregar estos tests dentro del `describe("BuilderPage")`:

```tsx
  it("no longer has a Descargar PNG button", () => {
    render(<BuilderPage />);
    expect(screen.queryByRole("button", { name: "Descargar PNG" })).toBeNull();
  });

  it("Compartir turns the camera, shows the story in a dialog and closes it", async () => {
    captureViews.mockImplementation(async ({ showView }: { showView: (side: "front" | "back") => void }) => {
      showView("back");
      return { front: {}, back: {} };
    });
    renderStory.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));

    const dialog = await screen.findByRole("dialog", { name: "Compartir tu camiseta" });
    expect(await within(dialog).findByAltText("Tu camiseta, lista para compartir")).toHaveAttribute("src", "blob:story");
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("blocks Revisar diseño while the dialog is open, and Compartir while reviewing", async () => {
    captureViews.mockResolvedValue({ front: {}, back: {} });
    renderStory.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    render(<BuilderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Revisar diseño" })).toBeDisabled();
  });

  it("blocks Compartir while the design is being reviewed", async () => {
    captureThumbnails.mockReturnValue(new Promise(() => {}));
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Revisar diseño" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled());
  });

  it("shows an error with Reintentar when the shirts cannot be captured", async () => {
    captureViews.mockResolvedValue(null);
    render(<BuilderPage />);
    fireEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(await screen.findByText("No pudimos armar la imagen.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components tests/lib/io`
Expected: FAIL: `Header` no tiene `onShare` y Compartir sigue deshabilitado; `StageToolbar` sigue ofreciendo "Descargar PNG"; `BuilderPage` no abre el diálogo.

- [ ] **Step 3: Write minimal implementation**

`components/builder/Header.tsx`: cambiar la firma y los dos botones.

```tsx
type HeaderProps = {
  onReview: (design: DesignState) => void;
  onShare: () => void;
  reviewing?: boolean;
  sharing?: boolean;
};

export function Header({ onReview, onShare, reviewing = false, sharing = false }: HeaderProps) {
```

y reemplazar el botón de Compartir y el de Revisar diseño por:

```tsx
        <button
          type="button"
          disabled={reviewing || sharing}
          aria-busy={sharing}
          aria-label="Compartir"
          onClick={onShare}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/80 bg-white/70 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <ShareIcon className="h-5 w-5" />
          <span className="hidden md:inline">Compartir</span>
        </button>
        <button
          type="button"
          disabled={reviewing || sharing}
          aria-busy={reviewing}
          onClick={() => onReview(state)}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <span className="sr-only md:not-sr-only">Revisar diseño</span>
          <ArrowRightIcon className="h-5 w-5" />
        </button>
```

`components/builder/viewer/StageToolbar.tsx`: quitar el botón y la prop; el archivo queda:

```tsx
"use client";
import type { ReactNode } from "react";
import { useDesign } from "@/lib/builder/state/design-context";
import { RedoIcon, UndoIcon } from "../icons";

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function StageToolbar() {
  const { dispatch, canUndo, canRedo } = useDesign();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-3 px-4">
      <RoundButton label="Deshacer" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })}>
        <UndoIcon className="h-5 w-5" />
      </RoundButton>
      <RoundButton label="Rehacer" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })}>
        <RedoIcon className="h-5 w-5" />
      </RoundButton>
    </div>
  );
}
```

`components/builder/icons.tsx`: borrar la definición `export const DownloadIcon = ...` (las 3 líneas).

`lib/builder/io/export-image.ts`: borrar el comentario y la función `exportStagePng` (desde `// The WebGL canvas is transparent` hasta el final); queda solo `paintStageBackground`. Ajustar el comentario de arriba si menciona "the exported image" (queda válido: lo usan las miniaturas).

`components/builder/BuilderPage.tsx`:

1. Imports: quitar `import { exportStagePng } ...`; agregar

```tsx
import { captureViews } from "@/lib/builder/io/capture-views";
import type { ShirtViews } from "@/lib/share/compose-story";
import { shirtImageOf } from "@/lib/share/shirt-image";
import { useShareStory } from "@/lib/share/use-share-story";
import { ShareStoryDialog } from "@/components/share/ShareStoryDialog";
```

2. Dentro de `BuilderPage`, después de `const [reviewing, setReviewing] = useState(false);` y de `requestView`, reemplazar `handleDownload` por:

```tsx
  // The two sides of the shirt for the story image: the camera turns (visibly,
  // behind the dialog) and each side is copied with its transparency.
  async function captureShirts(): Promise<ShirtViews | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return captureViews(
      { canvas, showView: (side) => requestView(side, true), wait: pause },
      (source) => shirtImageOf(source)
    );
  }

  const story = useShareStory(captureShirts);
  const sharing = story.state.status !== "closed";
```

3. En `handleReview`, cambiar la guarda a `if (reviewing || sharing) return;`.

4. En el JSX: `<StageToolbar onDownload={handleDownload} />` pasa a `<StageToolbar />`; `<Header onReview={handleReview} reviewing={reviewing} />` pasa a

```tsx
          <Header onReview={handleReview} onShare={story.open} reviewing={reviewing} sharing={sharing} />
```

y justo antes del `{reviewing && (...)}` del aviso, agregar:

```tsx
        <ShareStoryDialog
          state={story.state}
          onShare={story.share}
          onAnother={story.anotherPhrase}
          onRetry={story.retry}
          onClose={story.close}
        />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS (suite completa). Luego `npx tsc --noEmit` y `npm run lint`. Verificar con `grep -rn "exportStagePng\|DownloadIcon\|Descargar PNG" lib components app` que no queda ninguna referencia en el código (solo en los tests que afirman su ausencia).

- [ ] **Step 5: Commit**

```bash
git add components lib tests
git commit -m "feat: Compartir opens the story dialog and Descargar PNG is gone" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Verificación completa y ajustes del spec

**Files:**
- Modify: `docs/superpowers/specs/2026-10-09-share-story-design.md`

- [ ] **Step 1: Alinear el spec con lo implementado**

En `docs/superpowers/specs/2026-10-09-share-story-design.md`:

1. En "Fallas", agregar la viñeta: `- Si la captura devuelve una imagen vacía (el modelo todavía no cargó), se trata como falla de captura: error con **Reintentar**.`
2. En "La imagen (`lib/share/`)", reemplazar la viñeta sobre la captura por una que diga que la secuencia "girar, esperar, leer" se extrajo a `lib/builder/io/capture-views.ts` y la comparten las miniaturas del checkout y la historia.
3. Quitar de "Alcance" la mención a "la vista previa es una `<img>`" si queda duplicada; la decisión ya está en "Decisiones tomadas".

- [ ] **Step 2: Run the whole verification**

Ejecutar, cada uno en su propio paso, y confirmar que todos terminan en verde:

```bash
npm test
```
Expected: todos los tests PASS.

```bash
npx tsc --noEmit
```
Expected: sin errores.

```bash
npm run lint
```
Expected: sin errores.

```bash
npm run build
```
Expected: el build termina bien y `/`, `/checkout` y `/checkout/confirmacion` siguen en la tabla de rutas.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-09-share-story-design.md
git commit -m "docs: align the share spec with the implementation" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Revisión manual con el usuario (no automatizable)**

No puedo ver la app. Pedirle al usuario que corra `npm run dev` y revise, con capturas:

1. **Compartir** abre el diálogo y la cámara gira al frente y luego a la espalda detrás (~2,6 s) mientras dice "Armando tu camiseta…". Si la espalda sale a medio giro, subir `VIEW_SETTLE_MS` en `lib/builder/io/capture-views.ts`.
2. La imagen: el logo, la frase en dorado, las dos camisetas en diagonal con su halo, y "Diseñá la tuya en gepe.com". Calibrar con capturas las posiciones y tamaños de `lib/share/story-layout.ts` (`FRONT_RECT`, `BACK_RECT`, `PHRASE`, `LOGO`, `CTA`, `HALO`).
3. Que las camisetas oscuras se lean sobre el fondo negro (subir `HALO.inner` si hace falta).
4. El confeti y la entrada de la imagen; con "reducir movimiento" activado en el sistema, que no haya ninguno de los dos.
5. **Otra frase** cambia la frase sin que la cámara vuelva a girar.
6. **Compartir** en el celular abre el menú nativo con la imagen; en escritorio descarga `<nombre-del-diseño>-historia.png`.
7. Que ya no exista "Descargar PNG" en la barra del visor.

Dejar anotado lo que no se haya visto en pantalla. No hacer push ni PR hasta que el usuario lo pida. La dirección `gepe.com` es provisoria: cambiar `SHARE_URL` por la real antes de mostrar la imagen fuera del equipo.
