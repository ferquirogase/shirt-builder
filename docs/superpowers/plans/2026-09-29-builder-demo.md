# Camiseta Builder — Demo Cliente (Viewer 3D + Panel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side-only demo of the jersey builder — a 3D viewer
(zoom/rotate) showing a jersey whose texture updates live from a control
panel (body/sleeve pattern, colors, uploaded logo, sponsor text,
name/number) — with no backend, persistence, or checkout yet.

**Architecture:** Next.js App Router page renders a `DesignProvider`
(React Context + reducer holding the current design state) wrapping a 3D
`Viewer3D` (react-three-fiber Canvas + OrbitControls + the jersey mesh) and
a `ControlPanel`. Personalization is done via Canvas 2D compositing: a
2048×2048 offscreen canvas is redrawn in layers (base color → recolored
pattern SVGs → logo → sponsor/name/number text) whenever the design state
changes, and fed into the mesh material as a `THREE.CanvasTexture`.

**Tech Stack:** Next.js (TypeScript, App Router), react-three-fiber +
@react-three/drei, three.js `OBJLoader`, Vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-09-29-camiseta-builder-design.md`

## Global Constraints

- Alcance de este plan: solo el builder cliente (viewer 3D + panel +
  export PNG). Backend, persistencia, checkout y la integración con Rebill
  quedan para un plan posterior — no se implementan aquí.
- Camiseta de fútbol únicamente (no buzos de egresados).
- No usar ningún asset de marca/club real (logos, escudos, templates de
  fabricante) — los patrones son diseños propios.
- El archivo `jersey_ss.obj` usado en este plan es un **placeholder
  técnico**; la licencia de uso comercial del modelo final está pendiente
  de confirmación (ver spec, "Riesgos"). No hardcodear supuestos que
  atarían el pipeline a ese archivo específico.
- Personalización vía Canvas 2D + `THREE.CanvasTexture` — no shaders
  custom, no texturas pre-renderizadas.
- Los SVG de patrones marcan los elementos recoloreables con el atributo
  `data-color-slot="primary"` o `data-color-slot="secondary"`.

---

## File Structure

```
camiseta-builder/
  app/
    layout.tsx                       (scaffolded by create-next-app)
    page.tsx                         (modified: renders BuilderPage)
  components/builder/
    BuilderPage.tsx                  (composes Viewer3D + ControlPanel)
    Viewer3D.tsx                     (R3F Canvas, OrbitControls, JerseyModel)
    JerseyModel.tsx                  (loads OBJ, drives CanvasTexture)
    ControlPanel.tsx                 (colors, patterns, logo, sponsor, name/number)
  lib/builder/
    design-state.ts                  (DesignState type + reducer, pure)
    design-context.tsx               (DesignProvider + useDesign hook)
    patterns.ts                      (pattern catalog)
    svg-recolor.ts                   (recolorSvg pure function)
    uv-regions.ts                    (UV bounding boxes, filled by investigation task)
    uv-checker-texture.ts            (debug checker texture for UV investigation)
    image-loader.ts                  (loadImage, loadPatternImage helpers)
    texture-compositor.ts            (drawDesignToCanvas pure function)
  public/
    models/jersey_ss.obj             (placeholder geometry)
    patterns/
      stripes-v1-body.svg
      plain-body.svg
      sleeve-plain.svg
  tests/lib/
    svg-recolor.test.ts
    design-state.test.ts
    texture-compositor.test.ts
```

---

### Task 1: Scaffold Next.js project + dependencies

**Files:**
- Create: entire Next.js scaffold (`app/`, `next.config.ts`, `package.json`, `tsconfig.json`, etc.)
- Create: `vitest.config.ts`
- Test: `tests/lib/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm run dev` and `npm run test` command for all later tasks.

- [ ] **Step 1: Scaffold the Next.js app**

Run (non-interactive, in `camiseta-builder/`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --no-turbopack --use-npm
```

If it warns about the directory not being empty (it contains `.git/` and
`docs/`), confirm/continue — those don't conflict with the generated files.

- [ ] **Step 2: Install 3D dependencies**

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 5: Add a `test` script to `package.json`**

In the `"scripts"` section of `package.json`, add:

```json
"test": "vitest run"
```

- [ ] **Step 6: Write a smoke test**

Create `tests/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("test setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run the test to verify the setup works**

Run: `npm run test`
Expected: 1 test passes.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with three.js and vitest"
```

---

### Task 2: Add placeholder model and pattern assets

**Files:**
- Create: `public/models/jersey_ss.obj` (copied)
- Create: `public/patterns/stripes-v1-body.svg`
- Create: `public/patterns/plain-body.svg`
- Create: `public/patterns/sleeve-plain.svg`

**Interfaces:**
- Produces: static assets served at `/models/jersey_ss.obj` and
  `/patterns/*.svg`, consumed by Task 5 (model) and Task 4 (catalog).

- [ ] **Step 1: Copy the placeholder OBJ model**

```bash
mkdir -p public/models
cp "C:\Users\FERNANDO\Downloads\kit-recursos\modelos\jersey_ss.obj" "public/models/jersey_ss.obj"
```

- [ ] **Step 2: Create placeholder pattern SVGs**

Create `public/patterns/stripes-v1-body.svg` (vertical stripes, primary
background with secondary stripes — this is a throwaway placeholder to be
swapped for the real designs later):

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="64" y="0" width="48" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="224" y="0" width="48" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="384" y="0" width="48" height="512" />
</svg>
```

Create `public/patterns/plain-body.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
</svg>
```

Create `public/patterns/sleeve-plain.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="0" width="512" height="512" />
</svg>
```

- [ ] **Step 3: Commit**

```bash
git add public/models public/patterns
git commit -m "feat: add placeholder jersey model and pattern SVGs"
```

---

### Task 3: SVG recolor function (TDD)

**Files:**
- Create: `lib/builder/svg-recolor.ts`
- Test: `tests/lib/svg-recolor.test.ts`

**Interfaces:**
- Produces: `recolorSvg(svgMarkup: string, colors: ColorMap): string`,
  `type ColorSlot = "primary" | "secondary"`, `type ColorMap =
  Partial<Record<ColorSlot, string>>` — consumed by Task 9 (image loader)
  and any future pattern preview UI.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/svg-recolor.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { recolorSvg } from "@/lib/builder/svg-recolor";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- svg-recolor`
Expected: FAIL with "Cannot find module '@/lib/builder/svg-recolor'".

- [ ] **Step 3: Implement**

Create `lib/builder/svg-recolor.ts`:

```ts
export type ColorSlot = "primary" | "secondary";
export type ColorMap = Partial<Record<ColorSlot, string>>;

export function recolorSvg(svgMarkup: string, colors: ColorMap): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgMarkup, "image/svg+xml");
  const svg = doc.documentElement;

  svg.querySelectorAll("[data-color-slot]").forEach((el) => {
    const slot = el.getAttribute("data-color-slot") as ColorSlot | null;
    const color = slot ? colors[slot] : undefined;
    if (color) {
      el.setAttribute("fill", color);
    }
  });

  return new XMLSerializer().serializeToString(svg);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- svg-recolor`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/svg-recolor.ts tests/lib/svg-recolor.test.ts
git commit -m "feat: add SVG pattern recolor function"
```

---

### Task 4: Pattern catalog

**Files:**
- Create: `lib/builder/patterns.ts`

**Interfaces:**
- Consumes: static files at `/patterns/*.svg` (Task 2).
- Produces: `type PatternDef = { id: string; label: string; svgPath: string
  }`, `BODY_PATTERNS: PatternDef[]`, `SLEEVE_PATTERNS: PatternDef[]` —
  consumed by Task 8 (JerseyModel) and Task 10 (ControlPanel).

- [ ] **Step 1: Create the catalog**

Create `lib/builder/patterns.ts`:

```ts
export type PatternDef = {
  id: string;
  label: string;
  svgPath: string;
};

export const BODY_PATTERNS: PatternDef[] = [
  { id: "stripes-v1", label: "Rayas verticales", svgPath: "/patterns/stripes-v1-body.svg" },
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg" },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Manga lisa", svgPath: "/patterns/sleeve-plain.svg" },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/builder/patterns.ts
git commit -m "feat: add pattern catalog"
```

---

### Task 5: Design state (Context + reducer, TDD)

**Files:**
- Create: `lib/builder/design-state.ts`
- Create: `lib/builder/design-context.tsx`
- Test: `tests/lib/design-state.test.ts`

**Interfaces:**
- Consumes: `ColorSlot` from `lib/builder/svg-recolor.ts` (Task 3).
- Produces: `type DesignState`, `type DesignAction`, `designReducer`,
  `initialDesignState` (from `design-state.ts`); `DesignProvider`,
  `useDesign()` returning `{ state: DesignState; dispatch:
  Dispatch<DesignAction> }` (from `design-context.tsx`) — consumed by
  Task 8 (JerseyModel) and Task 10 (ControlPanel).

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/design-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { designReducer, initialDesignState } from "@/lib/builder/design-state";

describe("designReducer", () => {
  it("sets a color for the given slot", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_COLOR",
      slot: "primary",
      value: "#ff0000",
    });
    expect(next.colors.primary).toBe("#ff0000");
  });

  it("does not mutate the previous state", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_PLAYER_NUMBER",
      value: "10",
    });
    expect(initialDesignState.playerNumber).toBe("");
    expect(next.playerNumber).toBe("10");
  });

  it("sets the body pattern id", () => {
    const next = designReducer(initialDesignState, {
      type: "SET_BODY_PATTERN",
      id: "plain-body",
    });
    expect(next.bodyPatternId).toBe("plain-body");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- design-state`
Expected: FAIL with "Cannot find module '@/lib/builder/design-state'".

- [ ] **Step 3: Implement the reducer**

Create `lib/builder/design-state.ts`:

```ts
import type { ColorSlot } from "./svg-recolor";

export type DesignState = {
  bodyPatternId: string;
  sleevePatternId: string;
  colors: Record<ColorSlot, string>;
  logoDataUrl: string | null;
  sponsorText: string;
  playerName: string;
  playerNumber: string;
};

export type DesignAction =
  | { type: "SET_BODY_PATTERN"; id: string }
  | { type: "SET_SLEEVE_PATTERN"; id: string }
  | { type: "SET_COLOR"; slot: ColorSlot; value: string }
  | { type: "SET_LOGO"; dataUrl: string | null }
  | { type: "SET_SPONSOR_TEXT"; value: string }
  | { type: "SET_PLAYER_NAME"; value: string }
  | { type: "SET_PLAYER_NUMBER"; value: string };

export const initialDesignState: DesignState = {
  bodyPatternId: "stripes-v1",
  sleevePatternId: "sleeve-plain",
  colors: { primary: "#0a5c36", secondary: "#ffffff" },
  logoDataUrl: null,
  sponsorText: "",
  playerName: "",
  playerNumber: "",
};

export function designReducer(state: DesignState, action: DesignAction): DesignState {
  switch (action.type) {
    case "SET_BODY_PATTERN":
      return { ...state, bodyPatternId: action.id };
    case "SET_SLEEVE_PATTERN":
      return { ...state, sleevePatternId: action.id };
    case "SET_COLOR":
      return { ...state, colors: { ...state.colors, [action.slot]: action.value } };
    case "SET_LOGO":
      return { ...state, logoDataUrl: action.dataUrl };
    case "SET_SPONSOR_TEXT":
      return { ...state, sponsorText: action.value };
    case "SET_PLAYER_NAME":
      return { ...state, playerName: action.value };
    case "SET_PLAYER_NUMBER":
      return { ...state, playerNumber: action.value };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- design-state`
Expected: 3 tests pass.

- [ ] **Step 5: Add the Context/Provider (no test — thin React wiring)**

Create `lib/builder/design-context.tsx`:

```tsx
"use client";
import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { designReducer, initialDesignState, type DesignAction, type DesignState } from "./design-state";

type DesignContextValue = {
  state: DesignState;
  dispatch: Dispatch<DesignAction>;
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(designReducer, initialDesignState);
  return <DesignContext.Provider value={{ state, dispatch }}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/builder/design-state.ts lib/builder/design-context.tsx tests/lib/design-state.test.ts
git commit -m "feat: add design state reducer and context"
```

---

### Task 6: 3D viewer with the placeholder model (manual visual check)

**Files:**
- Create: `components/builder/JerseyModel.tsx` (minimal version — static
  material, texture wiring comes in Task 9)
- Create: `components/builder/Viewer3D.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `<Viewer3D />` component rendering the model with orbit
  controls — consumed by Task 7 (BuilderPage) and extended by Task 9
  (texture wiring).

- [ ] **Step 1: Create the minimal JerseyModel**

Create `components/builder/JerseyModel.tsx`:

```tsx
"use client";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  return <primitive object={obj} scale={0.01} />;
}
```

(`scale={0.01}` because the OBJ's vertex coordinates are in the hundreds —
verify visually in the next step and adjust if the model looks too
large/small.)

- [ ] **Step 2: Create the viewer**

Create `components/builder/Viewer3D.tsx`:

```tsx
"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { JerseyModel } from "./JerseyModel";

export function Viewer3D() {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Canvas camera={{ position: [0, 1.5, 3], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1} />
        <Suspense fallback={null}>
          <JerseyModel />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Render it from the page**

Modify `app/page.tsx` to:

```tsx
import { Viewer3D } from "@/components/builder/Viewer3D";

export default function Home() {
  return (
    <main>
      <Viewer3D />
    </main>
  );
}
```

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: the jersey model is visible, centered, and you can rotate/zoom
it with the mouse. If it's off-center or the wrong scale, adjust the
`scale` prop and/or add a `position` prop on `<primitive>` until it looks
right — note the values you land on in the commit message.

- [ ] **Step 5: Commit**

```bash
git add components/builder/JerseyModel.tsx components/builder/Viewer3D.tsx app/page.tsx
git commit -m "feat: render placeholder jersey model in 3D viewer"
```

---

### Task 7: UV region investigation (manual, produces real config)

**Files:**
- Create: `lib/builder/uv-checker-texture.ts`
- Create: `lib/builder/uv-regions.ts`
- Modify: `components/builder/JerseyModel.tsx` (temporary debug texture,
  reverted at the end of this task)

**Interfaces:**
- Produces: `type UVRect = { u0: number; v0: number; u1: number; v1:
  number }`, `type UVRegions = { bodyFront: UVRect; bodyBack: UVRect;
  sleeveLeft: UVRect; sleeveRight: UVRect }`, `UV_REGIONS: UVRegions`,
  `UV_FLIP_Y: boolean` (from `uv-regions.ts`) — consumed by Task 9
  (texture compositor wiring).

This task exists because the OBJ's UV layout can't be determined from the
raw numbers alone (see spec, "UV map") — it has to be read visually.

- [ ] **Step 1: Add a UV checker texture generator**

Create `lib/builder/uv-checker-texture.ts`:

```ts
import * as THREE from "three";

export function createUVCheckerTexture(size = 1024, cells = 8): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const cellSize = size / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ff5555" : "#5555ff";
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      ctx.fillStyle = "#ffffff";
      ctx.font = `${cellSize * 0.3}px sans-serif`;
      ctx.fillText(`${col},${row}`, col * cellSize + 4, row * cellSize + cellSize * 0.4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
```

Each cell is labeled `col,row`. Cell `(col, row)` covers `u ∈ [col/cells,
(col+1)/cells]`, `v ∈ [row/cells, (row+1)/cells]`.

- [ ] **Step 2: Temporarily apply the checker texture to the model**

In `components/builder/JerseyModel.tsx`, temporarily replace the body with:

```tsx
"use client";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { createUVCheckerTexture } from "@/lib/builder/uv-checker-texture";

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  const texture = useMemo(() => createUVCheckerTexture(), []);

  useEffect(() => {
    const material = new THREE.MeshBasicMaterial({ map: texture });
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });
  }, [obj, texture]);

  return <primitive object={obj} scale={0.01} />;
}
```

- [ ] **Step 3: Inspect visually and record the regions**

Run `npm run dev`, open the page, and rotate the model. For each of these
regions, note the range of `col,row` labels you see covering it:

- front torso (chest/stomach, facing the camera at start)
- back torso (opposite side)
- left sleeve, right sleeve

Convert the `col,row` ranges to `u`/`v` fractions using `cells = 8` (each
cell is `0.125` wide/tall). Also check whether the checker pattern appears
**mirrored top-to-bottom** compared to what you'd expect (if row 0 shows at
the bottom of a region instead of the top, `UV_FLIP_Y` should be `true`).

- [ ] **Step 4: Write the observed regions**

Create `lib/builder/uv-regions.ts` with the **actual values you observed**
in Step 3 (the numbers below are illustrative only — replace them with
what you measured):

```ts
export type UVRect = { u0: number; v0: number; u1: number; v1: number };

export type UVRegions = {
  bodyFront: UVRect;
  bodyBack: UVRect;
  sleeveLeft: UVRect;
  sleeveRight: UVRect;
};

export const UV_REGIONS: UVRegions = {
  bodyFront: { u0: 0.3, v0: 0.5, u1: 0.7, v1: 0.9 },
  bodyBack: { u0: 0.3, v0: 0.1, u1: 0.7, v1: 0.5 },
  sleeveLeft: { u0: 0.05, v0: 0.1, u1: 0.25, v1: 0.4 },
  sleeveRight: { u0: 0.75, v0: 0.1, u1: 0.95, v1: 0.4 },
};

export const UV_FLIP_Y = false;
```

- [ ] **Step 5: Revert the temporary debug material**

Restore `components/builder/JerseyModel.tsx` to the version from Task 6
(Step 1) — the checker texture was only for this investigation.

- [ ] **Step 6: Commit**

```bash
git add lib/builder/uv-checker-texture.ts lib/builder/uv-regions.ts components/builder/JerseyModel.tsx
git commit -m "chore: measure jersey UV regions with a debug checker texture"
```

---

### Task 8: Texture compositor (TDD)

**Files:**
- Create: `lib/builder/texture-compositor.ts`
- Test: `tests/lib/texture-compositor.test.ts`

**Interfaces:**
- Consumes: `DesignState` (Task 5), `UVRegions`/`UVRect` (Task 7).
- Produces: `type CompositorImages = { bodyPatternImage:
  HTMLImageElement | null; sleevePatternImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null }`, `drawDesignToCanvas(ctx:
  CanvasRenderingContext2D, canvasSize: number, design: DesignState,
  images: CompositorImages, regions: UVRegions): void` — consumed by
  Task 9 (JerseyModel texture wiring).

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/texture-compositor.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { initialDesignState } from "@/lib/builder/design-state";
import type { UVRegions } from "@/lib/builder/uv-regions";

function createMockCtx() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    fillStyle: "",
    font: "",
    textAlign: "left",
  } as unknown as CanvasRenderingContext2D;
}

const regions: UVRegions = {
  bodyFront: { u0: 0.3, v0: 0.5, u1: 0.7, v1: 0.9 },
  bodyBack: { u0: 0.3, v0: 0.1, u1: 0.7, v1: 0.5 },
  sleeveLeft: { u0: 0.05, v0: 0.1, u1: 0.25, v1: 0.4 },
  sleeveRight: { u0: 0.75, v0: 0.1, u1: 0.95, v1: 0.4 },
};

describe("drawDesignToCanvas", () => {
  it("fills the base color first", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1024, 1024);
  });

  it("draws the body pattern in both front and back regions", () => {
    const ctx = createMockCtx();
    const fakeImage = {} as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: fakeImage, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
  });

  it("writes the player number when set", () => {
    const ctx = createMockCtx();
    const design = { ...initialDesignState, playerNumber: "10" };
    drawDesignToCanvas(
      ctx,
      1024,
      design,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillText).toHaveBeenCalledWith("10", expect.any(Number), expect.any(Number));
  });

  it("does not write the player number when empty", () => {
    const ctx = createMockCtx();
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: null, sleevePatternImage: null, logoImage: null },
      regions
    );
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- texture-compositor`
Expected: FAIL with "Cannot find module '@/lib/builder/texture-compositor'".

- [ ] **Step 3: Implement**

Create `lib/builder/texture-compositor.ts`:

```ts
import type { DesignState } from "./design-state";
import type { UVRegions, UVRect } from "./uv-regions";

export type CompositorImages = {
  bodyPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  logoImage: HTMLImageElement | null;
};

export function drawDesignToCanvas(
  ctx: CanvasRenderingContext2D,
  canvasSize: number,
  design: DesignState,
  images: CompositorImages,
  regions: UVRegions
): void {
  ctx.clearRect(0, 0, canvasSize, canvasSize);

  ctx.fillStyle = design.colors.primary;
  ctx.fillRect(0, 0, canvasSize, canvasSize);

  if (images.bodyPatternImage) {
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyFront, canvasSize);
    drawImageInRegion(ctx, images.bodyPatternImage, regions.bodyBack, canvasSize);
  }

  if (images.sleevePatternImage) {
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveLeft, canvasSize);
    drawImageInRegion(ctx, images.sleevePatternImage, regions.sleeveRight, canvasSize);
  }

  if (images.logoImage) {
    const logoSize = canvasSize * 0.08;
    const logoX = regions.bodyFront.u0 * canvasSize + canvasSize * 0.02;
    const logoY = regions.bodyFront.v0 * canvasSize + canvasSize * 0.02;
    ctx.drawImage(images.logoImage, logoX, logoY, logoSize, logoSize);
  }

  if (design.sponsorText) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `${canvasSize * 0.03}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyFront.u0 + regions.bodyFront.u1) / 2) * canvasSize;
    const cy = (regions.bodyFront.v0 + 0.15) * canvasSize;
    ctx.fillText(design.sponsorText, cx, cy);
  }

  if (design.playerName) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.05}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyBack.u0 + regions.bodyBack.u1) / 2) * canvasSize;
    const cy = (regions.bodyBack.v0 + 0.1) * canvasSize;
    ctx.fillText(design.playerName, cx, cy);
  }

  if (design.playerNumber) {
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${canvasSize * 0.12}px sans-serif`;
    ctx.textAlign = "center";
    const cx = ((regions.bodyBack.u0 + regions.bodyBack.u1) / 2) * canvasSize;
    const cy = (regions.bodyBack.v0 + 0.4) * canvasSize;
    ctx.fillText(design.playerNumber, cx, cy);
  }
}

function drawImageInRegion(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  region: UVRect,
  canvasSize: number
): void {
  const x = region.u0 * canvasSize;
  const y = region.v0 * canvasSize;
  const width = (region.u1 - region.u0) * canvasSize;
  const height = (region.v1 - region.v0) * canvasSize;
  ctx.drawImage(image, x, y, width, height);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- texture-compositor`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/texture-compositor.ts tests/lib/texture-compositor.test.ts
git commit -m "feat: add canvas texture compositor"
```

---

### Task 9: Wire the compositor into the 3D model (manual visual check)

**Files:**
- Create: `lib/builder/image-loader.ts`
- Modify: `components/builder/JerseyModel.tsx`

**Interfaces:**
- Consumes: `recolorSvg`/`ColorMap` (Task 3), `drawDesignToCanvas` (Task
  8), `UV_REGIONS`/`UV_FLIP_Y` (Task 7), `useDesign()` (Task 5),
  `BODY_PATTERNS`/`SLEEVE_PATTERNS` (Task 4).
- Produces: `loadImage(src: string): Promise<HTMLImageElement>`,
  `loadPatternImage(svgPath: string, colors: ColorMap):
  Promise<HTMLImageElement>` — reusable for any future pattern preview.

- [ ] **Step 1: Add the image loader helpers**

Create `lib/builder/image-loader.ts`:

```ts
import { recolorSvg, type ColorMap } from "./svg-recolor";

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadPatternImage(svgPath: string, colors: ColorMap): Promise<HTMLImageElement> {
  const response = await fetch(svgPath);
  const svgMarkup = await response.text();
  const recolored = recolorSvg(svgMarkup, colors);
  const blob = new Blob([recolored], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 2: Wire the texture into JerseyModel**

Replace `components/builder/JerseyModel.tsx` with:

```tsx
"use client";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { loadImage, loadPatternImage } from "@/lib/builder/image-loader";
import { drawDesignToCanvas } from "@/lib/builder/texture-compositor";
import { UV_REGIONS, UV_FLIP_Y } from "@/lib/builder/uv-regions";

const CANVAS_SIZE = 2048;

export function JerseyModel() {
  const obj = useLoader(OBJLoader, "/models/jersey_ss.obj");
  const { state } = useDesign();
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const logoUrlRef = useRef<string | null>(null);

  const canvas = useMemo(() => {
    const el = document.createElement("canvas");
    el.width = CANVAS_SIZE;
    el.height = CANVAS_SIZE;
    return el;
  }, []);

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = UV_FLIP_Y;
    return tex;
  }, [canvas]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({ map: texture }), [texture]);

  useEffect(() => {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });
  }, [obj, material]);

  useEffect(() => {
    let cancelled = false;

    async function redraw() {
      const bodyPattern = BODY_PATTERNS.find((p) => p.id === state.bodyPatternId);
      const sleevePattern = SLEEVE_PATTERNS.find((p) => p.id === state.sleevePatternId);

      const [bodyPatternImage, sleevePatternImage] = await Promise.all([
        bodyPattern ? loadPatternImage(bodyPattern.svgPath, state.colors) : Promise.resolve(null),
        sleevePattern ? loadPatternImage(sleevePattern.svgPath, state.colors) : Promise.resolve(null),
      ]);

      if (state.logoDataUrl && logoUrlRef.current !== state.logoDataUrl) {
        logoImageRef.current = await loadImage(state.logoDataUrl);
        logoUrlRef.current = state.logoDataUrl;
      } else if (!state.logoDataUrl) {
        logoImageRef.current = null;
        logoUrlRef.current = null;
      }

      if (cancelled) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawDesignToCanvas(
        ctx,
        CANVAS_SIZE,
        state,
        { bodyPatternImage, sleevePatternImage, logoImage: logoImageRef.current },
        UV_REGIONS
      );
      texture.needsUpdate = true;
    }

    redraw();

    return () => {
      cancelled = true;
    };
  }, [state, canvas, texture]);

  return <primitive object={obj} scale={0.01} />;
}
```

- [ ] **Step 3: Manual visual check**

Run `npm run dev`. The model should now render with the default primary
color (`#0a5c36`) and the `stripes-v1` pattern visible on the torso, per
the regions measured in Task 7.

- [ ] **Step 4: Commit**

```bash
git add lib/builder/image-loader.ts components/builder/JerseyModel.tsx
git commit -m "feat: drive jersey texture from design state via canvas compositor"
```

---

### Task 10: Control panel UI

**Files:**
- Create: `components/builder/ControlPanel.tsx`
- Create: `components/builder/BuilderPage.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useDesign()` (Task 5), `BODY_PATTERNS`/`SLEEVE_PATTERNS`
  (Task 4), `Viewer3D` (Task 6).
- Produces: `<BuilderPage />`, the top-level composed page.

- [ ] **Step 1: Create the control panel**

Create `components/builder/ControlPanel.tsx`:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";

export function ControlPanel() {
  const { state, dispatch } = useDesign();

  return (
    <div className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1">
        Patrón de cuerpo
        <select
          value={state.bodyPatternId}
          onChange={(e) => dispatch({ type: "SET_BODY_PATTERN", id: e.target.value })}
        >
          {BODY_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Patrón de manga
        <select
          value={state.sleevePatternId}
          onChange={(e) => dispatch({ type: "SET_SLEEVE_PATTERN", id: e.target.value })}
        >
          {SLEEVE_PATTERNS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        Color primario
        <input
          type="color"
          value={state.colors.primary}
          onChange={(e) => dispatch({ type: "SET_COLOR", slot: "primary", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Color secundario
        <input
          type="color"
          value={state.colors.secondary}
          onChange={(e) => dispatch({ type: "SET_COLOR", slot: "secondary", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Sponsor (texto)
        <input
          type="text"
          value={state.sponsorText}
          onChange={(e) => dispatch({ type: "SET_SPONSOR_TEXT", value: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Nombre
        <input
          type="text"
          value={state.playerName}
          onChange={(e) => dispatch({ type: "SET_PLAYER_NAME", value: e.target.value.toUpperCase() })}
        />
      </label>

      <label className="flex flex-col gap-1">
        Número
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={state.playerNumber}
          onChange={(e) => dispatch({ type: "SET_PLAYER_NUMBER", value: e.target.value.replace(/\D/g, "") })}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Compose the builder page**

Create `components/builder/BuilderPage.tsx`:

```tsx
"use client";
import { DesignProvider } from "@/lib/builder/design-context";
import { Viewer3D } from "./Viewer3D";
import { ControlPanel } from "./ControlPanel";

export function BuilderPage() {
  return (
    <DesignProvider>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Viewer3D />
        </div>
        <div className="w-full md:w-80">
          <ControlPanel />
        </div>
      </div>
    </DesignProvider>
  );
}
```

- [ ] **Step 3: Update the page**

Modify `app/page.tsx`:

```tsx
import { BuilderPage } from "@/components/builder/BuilderPage";

export default function Home() {
  return (
    <main>
      <BuilderPage />
    </main>
  );
}
```

- [ ] **Step 4: Manual visual check**

Run `npm run dev`. Changing any control (pattern, color, sponsor text,
name, number) should update the 3D model's texture live.

- [ ] **Step 5: Commit**

```bash
git add components/builder/ControlPanel.tsx components/builder/BuilderPage.tsx app/page.tsx
git commit -m "feat: add control panel and compose builder page"
```

---

### Task 11: Logo upload

**Files:**
- Modify: `components/builder/ControlPanel.tsx`

**Interfaces:**
- Consumes: `useDesign()` dispatch `SET_LOGO` action (Task 5, already
  defined).

- [ ] **Step 1: Add the file input**

In `components/builder/ControlPanel.tsx`, add this block inside the
returned `<div>` (e.g., after the sponsor field):

```tsx
      <label className="flex flex-col gap-1">
        Logo (PNG/JPG, máx. 2MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              alert("El archivo supera los 2MB.");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              dispatch({ type: "SET_LOGO", dataUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
```

- [ ] **Step 2: Manual visual check**

Run `npm run dev`, upload a small PNG. The logo should appear on the
front-torso region of the model within a couple of seconds (it's loaded
async).

- [ ] **Step 3: Commit**

```bash
git add components/builder/ControlPanel.tsx
git commit -m "feat: add logo upload to control panel"
```

---

### Task 12: Shareable PNG export

**Files:**
- Modify: `components/builder/Viewer3D.tsx`
- Modify: `components/builder/BuilderPage.tsx`

**Interfaces:**
- Produces: an "Exportar PNG" button that downloads a snapshot of the 3D
  render.

- [ ] **Step 1: Expose the renderer's canvas via a ref**

Modify `components/builder/Viewer3D.tsx`:

```tsx
"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { JerseyModel } from "./JerseyModel";

export const Viewer3D = forwardRef<HTMLCanvasElement>(function Viewer3D(_props, ref) {
  return (
    <div style={{ width: "100%", height: "600px" }}>
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 45 }}
        gl={{ preserveDrawingBuffer: true }}
        ref={(state) => {
          if (typeof ref === "function") ref(state?.domElement ?? null);
          else if (ref) ref.current = state?.domElement ?? null;
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1} />
        <Suspense fallback={null}>
          <JerseyModel />
        </Suspense>
        <OrbitControls enablePan={false} minDistance={1} maxDistance={6} />
      </Canvas>
    </div>
  );
});
```

`preserveDrawingBuffer: true` is required — without it, `toDataURL()` can
return a blank image because the WebGL buffer is cleared right after each
frame.

- [ ] **Step 2: Add the export button**

Modify `components/builder/BuilderPage.tsx`:

```tsx
"use client";
import { useRef } from "react";
import { DesignProvider } from "@/lib/builder/design-context";
import { Viewer3D } from "./Viewer3D";
import { ControlPanel } from "./ControlPanel";

export function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "mi-camiseta.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <DesignProvider>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Viewer3D ref={canvasRef} />
          <button onClick={handleExport} className="mt-2 px-4 py-2 bg-green-700 text-white rounded">
            Exportar PNG
          </button>
        </div>
        <div className="w-full md:w-80">
          <ControlPanel />
        </div>
      </div>
    </DesignProvider>
  );
}
```

- [ ] **Step 3: Manual visual check**

Run `npm run dev`, personalize the jersey, click "Exportar PNG". A PNG
file should download showing the current view of the 3D model.

- [ ] **Step 4: Commit**

```bash
git add components/builder/Viewer3D.tsx components/builder/BuilderPage.tsx
git commit -m "feat: add shareable PNG export"
```

---

## Self-Review Notes

- **Spec coverage:** viewer 3D con zoom/rotación (Task 6), patrones de
  cuerpo/manga (Tasks 4, 8, 9, 10), logo subido (Task 11), sponsor/nombre/
  número (Tasks 8, 10), export PNG compartible (Task 12). Backend,
  persistencia y checkout quedan explícitamente fuera (ver Global
  Constraints) — corresponden a un plan siguiente.
- **Placeholder scan:** no quedan TODOs; el único valor "ilustrativo" es
  el contenido inicial de `uv-regions.ts` en Task 7, que el propio paso
  instruye a reemplazar por números medidos — no es un placeholder sin
  resolver, es el entregable de una tarea de investigación.
- **Type consistency:** `DesignState`/`ColorSlot` (Task 5) se usan sin
  cambios en Tasks 8–11; `UVRegions`/`UVRect` (Task 7) se usan sin cambios
  en Task 8; `CompositorImages` (Task 8) coincide con los argumentos
  pasados desde `JerseyModel` en Task 9.
