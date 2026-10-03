# GEPE UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the form-style `ControlPanel` with the GEPE interface from the mockup (sidebar + section panels + stage with Frente/Espalda, undo/redo, warm gradient background and soft floor shadow), desktop and mobile.

**Architecture:** The existing `designReducer` is wrapped in a history reducer (`past/present/future`) exposed through the same `useDesign()` hook. The UI is rebuilt as small Tailwind-only components under `components/builder/`. The 3D stage becomes transparent (CSS gradient behind it, drei `ContactShadows` on the floor) and a `CameraRig` animates the camera azimuth for Frente/Espalda.

**Tech Stack:** Next.js 16.3.7 (App Router), React 19.2, Tailwind v4, three + @react-three/fiber + @react-three/drei, Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-02-gepe-ui-redesign-design.md`

**Spec adjustments made while planning (follow the plan where it differs):**
- Undo/redo live in a `StageToolbar` over the viewer (top-center, as in the mockup), not in the `Header`. The Header holds logo, project name, Compartir and Revisar diseño.
- The export button is "Descargar PNG" in the `StageToolbar` (top-right of the stage). The PNG is the WebGL capture composited over the stage gradient.
- `SectionNav` is one responsive component (sidebar at `md+`, bottom tab bar below) and `SectionPanel` is rendered once; layout moves with flex `order-*` classes. No duplicated DOM.

## Global Constraints

- **Read the Next.js docs first.** `AGENTS.md`: this Next.js has breaking changes; before touching `app/layout.tsx` read `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` and `.../14-metadata-and-og-images.md`.
- **No new dependencies.** Tailwind v4 classes only; icons are inline SVG in `components/builder/icons.tsx`.
- **Keep existing ids:** body pattern `stripes-v1`, `plain-body`; sleeve pattern `sleeve-plain`. Initial `bodyPatternId`/`sleevePatternId`/`colors` stay as they are today.
- **Logo upload:** PNG/JPG/SVG, max 2 MB (`2 * 1024 * 1024` bytes).
- **Name** is uppercased; **number** is digits only, `maxLength` 2 (existing behavior).
- **UI copy is Spanish (rioplatense, voseo):** "Elegí un patrón para el torso.", "Arrastrá para girar", "Revisar diseño", "Compartir". No "Guardado" indicator anywhere.
- **Disabled-for-now buttons** (Compartir, Revisar diseño) use `disabled` and `title="Próximamente"`.
- **Light theme only.** Remove the `prefers-color-scheme: dark` block.
- **Every commit message** is `git commit -m "<subject>" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"`.
- **Gates for every task:** `npm test`, `npx tsc --noEmit`, `npm run lint` all pass before the task's commit (lint warnings that already exist on `master` are fine; new ones are not).

## Known limitations (not addressed here)

- Jersey text is always drawn white (`#ffffff`). On light jersey colors it is hard to read. Pre-existing; out of scope.
- The left sleeve rect in `uv-regions.ts` was never measured (estimate). Sleeve patterns may need visual tuning later.
- The model will not look photorealistic like the mockup render; background, framing and shadow are approximations.

## Review Focus

1. Rapid typing / dragging a color picker then Undo: one undo reverts the whole burst, not one character. (Task 2)
2. Logo with the wrong type or over 2 MB: inline error message, state unchanged, no `alert()`. (Task 8)
3. A pattern SVG that fails to load in the picker: the card shows a neutral fallback and the app does not crash. (Task 7)
4. Project name cleared to blank/whitespace: previous name is restored; undo never rewinds the name. (Tasks 2, 9)
5. Switching Frente↔Espalda when the camera azimuth is past ±π (user dragged around): rotates the short way, never spins the long way. (Task 10)

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/builder/design-state.ts` (modify) | Add `projectName` + `SET_PROJECT_NAME` |
| `lib/builder/design-history.ts` (create) | `historyReducer`, grouping, undo/redo |
| `lib/builder/design-context.tsx` (modify) | Provider over history; `canUndo/canRedo` |
| `lib/builder/patterns.ts` (modify) + `public/patterns/*.svg` (create) | 6 body + 3 sleeve patterns |
| `lib/builder/pattern-thumbnail.ts` (create) | Cached fetch + recolor → data URL for picker thumbnails |
| `lib/builder/logo-upload.ts` (create) | `validateLogoFile` |
| `lib/builder/stage-style.ts` (create) | Single source for the stage gradient (CSS + canvas) |
| `lib/builder/camera-math.ts` (create) | Azimuth helpers for Frente/Espalda |
| `lib/builder/export-image.ts` (create) | Composite WebGL capture over stage gradient |
| `components/builder/icons.tsx` (create) | Inline SVG icons |
| `components/builder/SectionNav.tsx` (create) | Sidebar / tab bar |
| `components/builder/PatternGrid.tsx` (create) | Pattern cards with thumbnails |
| `components/builder/panels/*.tsx` (create) | `PanelShell`, `DesignPanel`, `ColorsPanel`, `CrestPanel`, `SponsorPanel`, `TextPanel` |
| `components/builder/Header.tsx`, `StageToolbar.tsx`, `ViewerControls.tsx`, `CameraRig.tsx` (create) | Chrome around the stage |
| `components/builder/Viewer3D.tsx`, `BuilderPage.tsx` (modify) | Transparent canvas + shadows; page layout |
| `components/builder/ControlPanel.tsx` (delete) | Replaced |
| `app/globals.css`, `app/layout.tsx` (modify) | Theme tokens, `lang="es"`, title |
| `tests/setup.ts`, `tests/helpers/render-with-design.tsx` (create) | jest-dom + provider helper |

---

### Task 1: Commit the back-panel orientation fix

The working tree has an uncommitted fix (name/number/pattern on the jersey back were rotated 180° by the OBJ's UV layout). Commit it first so the redesign starts from a clean tree.

**Files:**
- Modify (already edited): `lib/builder/texture-compositor.ts`, `tests/lib/texture-compositor.test.ts`

- [ ] **Step 1: Verify the tree and tests**

Run: `git status --short && npm test`
Expected: only the two files above are modified; all tests pass (18).

- [ ] **Step 2: Commit**

```bash
git add lib/builder/texture-compositor.ts tests/lib/texture-compositor.test.ts
git commit -m "fix: rotate back-panel content 180deg to match the OBJ's UV layout" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Design history reducer (undo/redo) + project name

**Files:**
- Modify: `lib/builder/design-state.ts`
- Create: `lib/builder/design-history.ts`
- Modify: `tests/lib/design-state.test.ts`
- Create: `tests/lib/design-history.test.ts`

**Interfaces:**
- Produces (`design-state.ts`): `DesignState.projectName: string`; `DesignAction` gains `{ type: "SET_PROJECT_NAME"; value: string }`; `initialDesignState.projectName === "Mi diseño"`.
- Produces (`design-history.ts`):
  ```ts
  export const HISTORY_LIMIT = 100;
  export const GROUP_WINDOW_MS = 500;
  export type TimedDesignAction = DesignAction & { at?: number };
  export type DesignDispatchAction = DesignAction | { type: "UNDO" } | { type: "REDO" };
  export type HistoryAction = TimedDesignAction | { type: "UNDO" } | { type: "REDO" };
  export type HistoryState = { past: DesignState[]; present: DesignState; future: DesignState[]; lastGroup: string | null; lastAt: number };
  export function createHistory(initial?: DesignState): HistoryState;
  export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState;
  ```

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/design-state.test.ts` inside the `describe`:

```ts
  it("starts with a default project name and can rename it", () => {
    expect(initialDesignState.projectName).toBe("Mi diseño");
    const next = designReducer(initialDesignState, { type: "SET_PROJECT_NAME", value: "Los del viernes" });
    expect(next.projectName).toBe("Los del viernes");
  });
```

Create `tests/lib/design-history.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { initialDesignState } from "@/lib/builder/design-state";
import {
  createHistory,
  historyReducer,
  GROUP_WINDOW_MS,
  HISTORY_LIMIT,
  type HistoryAction,
  type HistoryState,
} from "@/lib/builder/design-history";

function run(actions: HistoryAction[], from: HistoryState = createHistory()): HistoryState {
  return actions.reduce(historyReducer, from);
}

describe("historyReducer", () => {
  it("records a discrete change and can undo and redo it", () => {
    const changed = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    expect(changed.present.bodyPatternId).toBe("plain-body");
    expect(changed.past).toHaveLength(1);

    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.bodyPatternId).toBe(initialDesignState.bodyPatternId);
    expect(undone.future).toHaveLength(1);

    const redone = historyReducer(undone, { type: "REDO" });
    expect(redone.present.bodyPatternId).toBe("plain-body");
  });

  it("ignores UNDO/REDO when there is nothing to do", () => {
    const fresh = createHistory();
    expect(historyReducer(fresh, { type: "UNDO" })).toBe(fresh);
    expect(historyReducer(fresh, { type: "REDO" })).toBe(fresh);
  });

  it("clears the redo stack when a new change is made after undo", () => {
    let s = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    s = historyReducer(s, { type: "UNDO" });
    s = historyReducer(s, { type: "SET_SPONSOR_TEXT", value: "ACME", at: 10_000 });
    expect(s.future).toHaveLength(0);
  });

  it("does not record a change that leaves the design identical", () => {
    const s = run([{ type: "SET_BODY_PATTERN", id: initialDesignState.bodyPatternId }]);
    expect(s.past).toHaveLength(0);
  });

  it("groups rapid edits of the same field into a single undo step", () => {
    const s = run([
      { type: "SET_PLAYER_NAME", value: "P", at: 1000 },
      { type: "SET_PLAYER_NAME", value: "PE", at: 1100 },
      { type: "SET_PLAYER_NAME", value: "PER", at: 1200 },
    ]);
    expect(s.present.playerName).toBe("PER");
    expect(s.past).toHaveLength(1);
    const undone = historyReducer(s, { type: "UNDO" });
    expect(undone.present.playerName).toBe("");
  });

  it("starts a new step after the grouping window elapses", () => {
    const s = run([
      { type: "SET_PLAYER_NAME", value: "P", at: 1000 },
      { type: "SET_PLAYER_NAME", value: "PE", at: 1000 + GROUP_WINDOW_MS + 1 },
    ]);
    expect(s.past).toHaveLength(2);
  });

  it("does not group edits of different fields or different color slots", () => {
    const s = run([
      { type: "SET_COLOR", slot: "primary", value: "#111111", at: 1000 },
      { type: "SET_COLOR", slot: "secondary", value: "#222222", at: 1100 },
      { type: "SET_PLAYER_NUMBER", value: "1", at: 1200 },
    ]);
    expect(s.past).toHaveLength(3);
  });

  it("keeps the project name out of the history and across undo/redo", () => {
    let s = run([{ type: "SET_BODY_PATTERN", id: "plain-body" }]);
    s = historyReducer(s, { type: "SET_PROJECT_NAME", value: "Los del viernes" });
    expect(s.past).toHaveLength(1);

    const undone = historyReducer(s, { type: "UNDO" });
    expect(undone.present.projectName).toBe("Los del viernes");
    const redone = historyReducer(undone, { type: "REDO" });
    expect(redone.present.projectName).toBe("Los del viernes");
  });

  it("caps the history length", () => {
    const actions: HistoryAction[] = Array.from({ length: HISTORY_LIMIT + 20 }, (_, i) => ({
      type: "SET_BODY_PATTERN" as const,
      id: `p${i}`,
    }));
    expect(run(actions).past).toHaveLength(HISTORY_LIMIT);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/design-state.test.ts tests/lib/design-history.test.ts`
Expected: FAIL (`projectName` undefined / module `design-history` not found).

- [ ] **Step 3: Implement**

In `lib/builder/design-state.ts`: add `projectName: string;` to `DesignState`; add `| { type: "SET_PROJECT_NAME"; value: string }` to `DesignAction`; add `projectName: "Mi diseño",` to `initialDesignState`; add to the reducer switch:

```ts
    case "SET_PROJECT_NAME":
      return { ...state, projectName: action.value };
```

Create `lib/builder/design-history.ts`:

```ts
import { designReducer, initialDesignState, type DesignAction, type DesignState } from "./design-state";

export const HISTORY_LIMIT = 100;
// Edits of the same field closer together than this collapse into one undo step.
export const GROUP_WINDOW_MS = 500;

export type TimedDesignAction = DesignAction & { at?: number };
export type DesignDispatchAction = DesignAction | { type: "UNDO" } | { type: "REDO" };
export type HistoryAction = TimedDesignAction | { type: "UNDO" } | { type: "REDO" };

export type HistoryState = {
  past: DesignState[];
  present: DesignState;
  future: DesignState[];
  lastGroup: string | null;
  lastAt: number;
};

export function createHistory(initial: DesignState = initialDesignState): HistoryState {
  return { past: [], present: initial, future: [], lastGroup: null, lastAt: 0 };
}

// Continuous inputs (color pickers, text fields) get a group key so a burst of
// edits is one undo step. Discrete choices (patterns, logo) return null.
function groupKey(action: DesignAction): string | null {
  switch (action.type) {
    case "SET_COLOR":
      return `color:${action.slot}`;
    case "SET_SPONSOR_TEXT":
      return "sponsor";
    case "SET_PLAYER_NAME":
      return "name";
    case "SET_PLAYER_NUMBER":
      return "number";
    default:
      return null;
  }
}

function sameDesign(a: DesignState, b: DesignState): boolean {
  return (
    a.bodyPatternId === b.bodyPatternId &&
    a.sleevePatternId === b.sleevePatternId &&
    a.colors.primary === b.colors.primary &&
    a.colors.secondary === b.colors.secondary &&
    a.logoDataUrl === b.logoDataUrl &&
    a.sponsorText === b.sponsorText &&
    a.playerName === b.playerName &&
    a.playerNumber === b.playerNumber &&
    a.projectName === b.projectName
  );
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "UNDO") {
    if (state.past.length === 0) return state;
    const previous = state.past[state.past.length - 1];
    return {
      past: state.past.slice(0, -1),
      // The project name is not part of the history: carry the current one over.
      present: { ...previous, projectName: state.present.projectName },
      future: [state.present, ...state.future],
      lastGroup: null,
      lastAt: 0,
    };
  }

  if (action.type === "REDO") {
    if (state.future.length === 0) return state;
    const [next, ...rest] = state.future;
    return {
      past: [...state.past, state.present],
      present: { ...next, projectName: state.present.projectName },
      future: rest,
      lastGroup: null,
      lastAt: 0,
    };
  }

  const at = action.at ?? 0;
  const designAction = action as DesignAction;

  if (designAction.type === "SET_PROJECT_NAME") {
    return { ...state, present: designReducer(state.present, designAction) };
  }

  const next = designReducer(state.present, designAction);
  if (sameDesign(next, state.present)) return state;

  const group = groupKey(designAction);
  const continuing = group !== null && group === state.lastGroup && at - state.lastAt <= GROUP_WINDOW_MS;
  if (continuing) {
    return { ...state, present: next, future: [], lastAt: at };
  }

  return {
    past: [...state.past, state.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastGroup: group,
    lastAt: at,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/design-state.ts lib/builder/design-history.ts tests/lib/design-state.test.ts tests/lib/design-history.test.ts
git commit -m "feat: add design history (undo/redo) and project name" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Provider over history + component test setup

**Files:**
- Modify: `lib/builder/design-context.tsx`, `vitest.config.ts`
- Create: `tests/setup.ts`, `tests/helpers/render-with-design.tsx`, `tests/lib/design-context.test.tsx`

**Interfaces:**
- Consumes: `createHistory`, `historyReducer`, `DesignDispatchAction`, `HistoryAction` from Task 2.
- Produces:
  ```ts
  export type DesignContextValue = {
    state: DesignState;
    dispatch: (action: DesignDispatchAction) => void;
    canUndo: boolean;
    canRedo: boolean;
  };
  export function DesignProvider(props: { children: ReactNode }): JSX.Element;
  export function useDesign(): DesignContextValue;
  // tests/helpers/render-with-design.tsx
  export function renderWithDesign(ui: ReactElement): RenderResult & { api: { current: DesignContextValue | null } };
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

In `vitest.config.ts` add `setupFiles: ["./tests/setup.ts"],` inside `test`.

Create `tests/helpers/render-with-design.tsx`:

```tsx
import { useEffect, type ReactElement } from "react";
import { render } from "@testing-library/react";
import { DesignProvider, useDesign, type DesignContextValue } from "@/lib/builder/design-context";

// Renders `ui` inside a DesignProvider and exposes the live context value as
// `api.current` so tests can dispatch actions and read state.
export function renderWithDesign(ui: ReactElement) {
  const api: { current: DesignContextValue | null } = { current: null };
  function Capture() {
    const value = useDesign();
    useEffect(() => {
      api.current = value;
    });
    return null;
  }
  const utils = render(
    <DesignProvider>
      {ui}
      <Capture />
    </DesignProvider>
  );
  return { ...utils, api };
}
```

Create `tests/lib/design-context.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";

describe("DesignProvider", () => {
  it("exposes state, dispatch and undo/redo availability", () => {
    const { api } = renderWithDesign(<div />);
    expect(api.current!.canUndo).toBe(false);
    expect(api.current!.canRedo).toBe(false);

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
    expect(api.current!.canUndo).toBe(true);

    act(() => api.current!.dispatch({ type: "UNDO" }));
    expect(api.current!.state.bodyPatternId).not.toBe("plain-body");
    expect(api.current!.canRedo).toBe(true);

    act(() => api.current!.dispatch({ type: "REDO" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
  });

  it("throws when used outside a provider", async () => {
    const { useDesign } = await import("@/lib/builder/design-context");
    const { renderHook } = await import("@testing-library/react");
    expect(() => renderHook(() => useDesign())).toThrow(/DesignProvider/);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/design-context.test.tsx`
Expected: FAIL (`canUndo` undefined / `DesignContextValue` not exported).

- [ ] **Step 3: Implement**

Replace `lib/builder/design-context.tsx`:

```tsx
"use client";
import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from "react";
import { createHistory, historyReducer, type DesignDispatchAction, type HistoryAction } from "./design-history";
import type { DesignState } from "./design-state";

export type DesignContextValue = {
  state: DesignState;
  dispatch: (action: DesignDispatchAction) => void;
  canUndo: boolean;
  canRedo: boolean;
};

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [history, rawDispatch] = useReducer(historyReducer, undefined, () => createHistory());

  // Timestamps are attached here (not in the reducer) so the reducer stays pure.
  const dispatch = useCallback((action: DesignDispatchAction) => {
    const timed: HistoryAction =
      action.type === "UNDO" || action.type === "REDO" ? action : { ...action, at: Date.now() };
    rawDispatch(timed);
  }, []);

  const value = useMemo<DesignContextValue>(
    () => ({
      state: history.present,
      dispatch,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, dispatch]
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}
```

- [ ] **Step 4: Run all gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. (`ControlPanel` and `JerseyModel` still compile: `dispatch`/`state` have the same shape.)

- [ ] **Step 5: Commit**

```bash
git add lib/builder/design-context.tsx vitest.config.ts tests/setup.ts tests/helpers/render-with-design.tsx tests/lib/design-context.test.tsx
git commit -m "feat: expose undo/redo through DesignProvider and add component test helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Pattern assets and registry

**Files:**
- Create: `public/patterns/diagonal-body.svg`, `gradient-body.svg`, `geometric-body.svg`, `hoops-body.svg`, `sleeve-primary.svg`, `sleeve-cuff.svg`
- Modify: `lib/builder/patterns.ts`
- Create: `tests/lib/patterns.test.ts`

**Interfaces:**
- Produces: `BODY_PATTERNS` (6) and `SLEEVE_PATTERNS` (3), each `PatternDef { id; label; svgPath }`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/patterns.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { initialDesignState } from "@/lib/builder/design-state";

const all = [...BODY_PATTERNS, ...SLEEVE_PATTERNS];

describe("pattern registry", () => {
  it("has the six torso patterns from the mockup and three sleeve patterns", () => {
    expect(BODY_PATTERNS.map((p) => p.label)).toEqual([
      "Liso",
      "Franjas",
      "Diagonal",
      "Degradado",
      "Geométrico",
      "Rayas",
    ]);
    expect(SLEEVE_PATTERNS).toHaveLength(3);
  });

  it("has unique ids across body and sleeve lists", () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the ids existing designs already use", () => {
    expect(BODY_PATTERNS.map((p) => p.id)).toEqual(expect.arrayContaining(["stripes-v1", "plain-body"]));
    expect(SLEEVE_PATTERNS.map((p) => p.id)).toContain("sleeve-plain");
    expect(BODY_PATTERNS.some((p) => p.id === initialDesignState.bodyPatternId)).toBe(true);
    expect(SLEEVE_PATTERNS.some((p) => p.id === initialDesignState.sleevePatternId)).toBe(true);
  });

  it.each(all.map((p) => [p.id, p.svgPath]))("%s points to an SVG that exists and uses a color slot", (_id, svgPath) => {
    const file = path.join(process.cwd(), "public", svgPath);
    expect(fs.existsSync(file)).toBe(true);
    const markup = fs.readFileSync(file, "utf8");
    expect(markup).toContain("<svg");
    expect(markup).toContain("data-color-slot");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/patterns.test.ts`
Expected: FAIL (labels / missing files).

- [ ] **Step 3: Create the SVGs**

`public/patterns/diagonal-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <polygon data-color-slot="secondary" fill="#ffffff" points="12,0 212,0 512,300 512,500" />
  <polygon data-color-slot="secondary" fill="#ffffff" points="0,188 0,388 124,512 324,512" />
</svg>
```

`public/patterns/gradient-body.svg` (top = primary, fading to secondary at the bottom; stacked bands because `recolorSvg` only sets `fill`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.06" x="0" y="32" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.11" x="0" y="64" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.17" x="0" y="96" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.23" x="0" y="128" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.28" x="0" y="160" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.34" x="0" y="192" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.40" x="0" y="224" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.45" x="0" y="256" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.51" x="0" y="288" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.57" x="0" y="320" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.62" x="0" y="352" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.68" x="0" y="384" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.74" x="0" y="416" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.79" x="0" y="448" width="512" height="32" />
  <rect data-color-slot="secondary" fill="#ffffff" fill-opacity="0.85" x="0" y="480" width="512" height="32" />
</svg>
```

`public/patterns/geometric-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.55" points="0,0 200,0 0,260" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.35" points="200,0 512,0 512,150 330,230" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.25" points="0,260 200,0 330,230 120,400" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.5" points="120,400 330,230 512,350 380,512" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.35" points="0,512 120,400 380,512" />
  <polygon data-color-slot="secondary" fill="#ffffff" fill-opacity="0.6" points="512,350 512,512 380,512" />
</svg>
```

`public/patterns/hoops-body.svg` (horizontal "Rayas"):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="48" width="512" height="48" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="144" width="512" height="48" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="240" width="512" height="48" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="336" width="512" height="48" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="432" width="512" height="48" />
</svg>
```

`public/patterns/sleeve-primary.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
</svg>
```

`public/patterns/sleeve-cuff.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="400" width="512" height="112" />
</svg>
```

Replace `lib/builder/patterns.ts`:

```ts
export type PatternDef = {
  id: string;
  label: string;
  svgPath: string;
};

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg" },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg" },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg" },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg" },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg" },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg" },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Color secundario", svgPath: "/patterns/sleeve-plain.svg" },
  { id: "sleeve-primary", label: "Color primario", svgPath: "/patterns/sleeve-primary.svg" },
  { id: "sleeve-cuff", label: "Con puño", svgPath: "/patterns/sleeve-cuff.svg" },
];
```

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/patterns lib/builder/patterns.ts tests/lib/patterns.test.ts
git commit -m "feat: add six torso patterns and three sleeve patterns" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(Visual tuning of the new patterns on the 3D model happens in Task 12.)

---

### Task 5: Theme tokens, stage style, layout metadata

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `lib/builder/stage-style.ts`, `tests/lib/stage-style.test.ts`

**Interfaces:**
- Produces: `STAGE_STOPS: ReadonlyArray<readonly [number, string]>`, `STAGE_GLOW: string`, `stageBackgroundCss(): string`. Tailwind color tokens `background`, `foreground`, `line`, `muted`, `accent`, `accent-strong`, `accent-soft` (usable as `bg-accent`, `text-muted`, `border-line`, …).

- [ ] **Step 1: Write the failing test**

Create `tests/lib/stage-style.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { STAGE_STOPS, stageBackgroundCss } from "@/lib/builder/stage-style";

describe("stageBackgroundCss", () => {
  it("includes every gradient stop color and a glow", () => {
    const css = stageBackgroundCss();
    for (const [, color] of STAGE_STOPS) expect(css).toContain(color);
    expect(css).toContain("radial-gradient");
    expect(css).toContain("linear-gradient");
  });

  it("has stops ordered from 0 to 1", () => {
    const offsets = STAGE_STOPS.map(([o]) => o);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    expect(offsets[0]).toBe(0);
    expect(offsets[offsets.length - 1]).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/stage-style.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `lib/builder/stage-style.ts`:

```ts
// Single source of truth for the stage background so the on-screen CSS
// gradient and the exported PNG (canvas) look the same.
export const STAGE_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "#f4f4f2"],
  [0.5, "#ebe7de"],
  [1, "#f6d975"],
];

export const STAGE_GLOW = "rgba(255,255,255,0.85)";

export function stageBackgroundCss(): string {
  const stops = STAGE_STOPS.map(([offset, color]) => `${color} ${Math.round(offset * 100)}%`).join(", ");
  return `radial-gradient(55% 55% at 50% 48%, ${STAGE_GLOW} 0%, rgba(255,255,255,0) 70%), linear-gradient(to bottom right, ${stops})`;
}
```

Replace `app/globals.css`:

```css
@import "tailwindcss";

:root {
  --background: #f7f4ee;
  --foreground: #1c1917;
  --line: rgba(28, 25, 23, 0.1);
  --muted: #78716c;
  --accent: #f5b400;
  --accent-strong: #c98f00;
  --accent-soft: #fdf1cc;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-line: var(--line);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-strong: var(--accent-strong);
  --color-accent-soft: var(--accent-soft);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}
```

In `app/layout.tsx`: change `title` to `"GEPE — Diseñá tu camiseta"`, `description` to `"Diseñá y personalizá la camiseta de tu equipo en 3D."`, and `lang="en"` to `lang="es"`. (Read the fonts/metadata docs listed in Global Constraints first and confirm nothing else in this file needs to change.)

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx lib/builder/stage-style.ts tests/lib/stage-style.test.ts
git commit -m "feat: add GEPE theme tokens, stage gradient and Spanish metadata" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Icons and SectionNav

**Files:**
- Create: `components/builder/icons.tsx`, `components/builder/SectionNav.tsx`, `tests/components/SectionNav.test.tsx`

**Interfaces:**
- Produces (`icons.tsx`): `type IconProps = { className?: string }` and components `ShirtIcon, DropIcon, ShieldIcon, RegisteredIcon, NumberIcon, UndoIcon, RedoIcon, ShareIcon, DownloadIcon, ArrowRightIcon, RotateIcon, PencilIcon, CheckIcon, HandIcon, InfoIcon, UploadIcon`.
- Produces (`SectionNav.tsx`): `type SectionId = "diseno" | "colores" | "escudo" | "sponsor" | "texto"`; `SECTIONS`; `SectionNav({ active, onChange })`.

- [ ] **Step 1: Write the failing test**

Create `tests/components/SectionNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionNav } from "@/components/builder/SectionNav";

describe("SectionNav", () => {
  it("renders the five sections and marks the active one", () => {
    render(<SectionNav active="colores" onChange={() => {}} />);
    for (const name of ["Diseño", "Colores", "Escudo", "Sponsor", "Nombre y número"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Colores" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Diseño" })).not.toHaveAttribute("aria-current");
  });

  it("reports the clicked section", () => {
    const onChange = vi.fn();
    render(<SectionNav active="diseno" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Nombre y número" }));
    expect(onChange).toHaveBeenCalledWith("texto");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/SectionNav.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `components/builder/icons.tsx`:

```tsx
import type { ReactNode } from "react";

export type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export const ShirtIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 3 4 5.5l1.5 4L8 8.5V20h8V8.5l2.5 1 1.5-4L16 3a4 4 0 0 1-8 0z" /></Svg>
);
export const DropIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z" /></Svg>
);
export const ShieldIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 5 5.5v5.8c0 4.2 2.8 7.3 7 9.2 4.2-1.9 7-5 7-9.2V5.5L12 3z" /></Svg>
);
export const RegisteredIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M10 16V8h3a2 2 0 0 1 0 4h-3m3 0 2 4" /></Svg>
);
export const NumberIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <text x="12" y="15.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">10</text>
  </Svg>
);
export const UndoIcon = (p: IconProps) => (
  <Svg {...p}><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>
);
export const RedoIcon = (p: IconProps) => (
  <Svg {...p}><path d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" /></Svg>
);
export const ShareIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 15V4m0 0L8 8m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" /></Svg>
);
export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></Svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h14m-6-6 6 6-6 6" /></Svg>
);
export const RotateIcon = (p: IconProps) => (
  <Svg {...p}><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" /></Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);
export const HandIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 12V6a1.5 1.5 0 0 1 3 0v5m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-4a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-.5a5 5 0 0 1-4-2L4.5 14a1.5 1.5 0 0 1 2.3-1.9L8 13" />
  </Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
);
export const UploadIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 16V4m0 0L8 8m4-4 4 4M5 15v4h14v-4" /></Svg>
);
```

Create `components/builder/SectionNav.tsx`:

```tsx
"use client";
import type { ComponentType } from "react";
import { DropIcon, NumberIcon, RegisteredIcon, ShieldIcon, ShirtIcon, type IconProps } from "./icons";

export type SectionId = "diseno" | "colores" | "escudo" | "sponsor" | "texto";

type SectionDef = { id: SectionId; label: string; shortLabel: string; Icon: ComponentType<IconProps> };

export const SECTIONS: SectionDef[] = [
  { id: "diseno", label: "Diseño", shortLabel: "Diseño", Icon: ShirtIcon },
  { id: "colores", label: "Colores", shortLabel: "Colores", Icon: DropIcon },
  { id: "escudo", label: "Escudo", shortLabel: "Escudo", Icon: ShieldIcon },
  { id: "sponsor", label: "Sponsor", shortLabel: "Sponsor", Icon: RegisteredIcon },
  { id: "texto", label: "Nombre y número", shortLabel: "Texto", Icon: NumberIcon },
];

type Props = { active: SectionId; onChange: (id: SectionId) => void };

// One element, two layouts: bottom tab bar below `md`, left sidebar from `md` up.
export function SectionNav({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Secciones"
      className="flex justify-around border-t border-line bg-white px-2 py-1 md:w-48 md:flex-col md:justify-start md:gap-1 md:border-0 md:bg-transparent md:p-3"
    >
      {SECTIONS.map(({ id, label, shortLabel, Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onChange(id)}
            className={[
              "flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
              "md:flex-none md:flex-row md:gap-3 md:rounded-2xl md:px-4 md:py-3 md:text-sm",
              isActive
                ? "text-accent-strong md:bg-accent-soft md:font-semibold md:text-foreground"
                : "text-muted hover:text-foreground md:hover:bg-black/5",
            ].join(" ")}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <span className="md:hidden">{shortLabel}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/builder/icons.tsx components/builder/SectionNav.tsx tests/components/SectionNav.test.tsx
git commit -m "feat: add icons and responsive SectionNav" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pattern thumbnails and PatternGrid

**Files:**
- Create: `lib/builder/pattern-thumbnail.ts`, `components/builder/PatternGrid.tsx`, `tests/lib/pattern-thumbnail.test.ts`, `tests/components/PatternGrid.test.tsx`

**Interfaces:**
- Consumes: `recolorSvg`, `ColorMap` from `svg-recolor.ts`; `PatternDef` from `patterns.ts`; `CheckIcon`.
- Produces:
  ```ts
  export function fetchPatternMarkup(svgPath: string): Promise<string>;      // cached; failures are not cached
  export function svgToDataUrl(markup: string): string;
  export function patternThumbnailUrl(svgPath: string, colors: ColorMap): Promise<string>;
  export function clearPatternMarkupCache(): void;                            // tests only
  // PatternGrid
  type Props = { patterns: PatternDef[]; selectedId: string; primary: string; secondary: string; onSelect: (id: string) => void };
  ```
  Each card is `role="radio"` (`aria-checked`), accessible name = pattern label; its thumbnail element has `data-thumb="loading" | "loaded" | "error"`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/pattern-thumbnail.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearPatternMarkupCache,
  patternThumbnailUrl,
  svgToDataUrl,
} from "@/lib/builder/pattern-thumbnail";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000000"/></svg>`;

describe("pattern thumbnails", () => {
  beforeEach(() => clearPatternMarkupCache());
  afterEach(() => vi.unstubAllGlobals());

  it("recolors the SVG and returns a data URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
    const url = await patternThumbnailUrl("/patterns/a.svg", { primary: "#ff0000" });
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain('fill="#ff0000"');
  });

  it("fetches each SVG only once", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, text: async () => SVG }));
    vi.stubGlobal("fetch", fetchMock);
    await patternThumbnailUrl("/patterns/a.svg", { primary: "#111111" });
    await patternThumbnailUrl("/patterns/a.svg", { primary: "#222222" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed fetch", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" })
      .mockResolvedValueOnce({ ok: true, text: async () => SVG });
    vi.stubGlobal("fetch", fetchMock);
    await expect(patternThumbnailUrl("/patterns/b.svg", {})).rejects.toThrow(/404/);
    await expect(patternThumbnailUrl("/patterns/b.svg", {})).resolves.toContain("data:image/svg+xml");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("encodes markup safely into a data URL", () => {
    expect(svgToDataUrl("<svg/>")).toBe("data:image/svg+xml;charset=utf-8,%3Csvg%2F%3E");
  });
});
```

Create `tests/components/PatternGrid.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PatternGrid } from "@/components/builder/PatternGrid";
import { clearPatternMarkupCache } from "@/lib/builder/pattern-thumbnail";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;
const patterns = [
  { id: "a", label: "Liso", svgPath: "/patterns/a.svg" },
  { id: "b", label: "Franjas", svgPath: "/patterns/b.svg" },
];

describe("PatternGrid", () => {
  beforeEach(() => clearPatternMarkupCache());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a radio per pattern, marks the selected one and reports clicks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
    const onSelect = vi.fn();
    const { container } = render(
      <PatternGrid patterns={patterns} selectedId="b" primary="#111111" secondary="#eeeeee" onSelect={onSelect} />
    );

    expect(screen.getByRole("radio", { name: "Franjas" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Liso" })).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("radio", { name: "Liso" }));
    expect(onSelect).toHaveBeenCalledWith("a");

    await waitFor(() => expect(container.querySelectorAll('[data-thumb="loaded"]')).toHaveLength(2));
  });

  it("shows a fallback (and does not crash) when a pattern fails to load", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, text: async () => "" })));
    const { container } = render(
      <PatternGrid patterns={patterns} selectedId="a" primary="#111111" secondary="#eeeeee" onSelect={() => {}} />
    );
    await waitFor(() => expect(container.querySelectorAll('[data-thumb="error"]')).toHaveLength(2));
    expect(screen.getByRole("radio", { name: "Liso" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/lib/pattern-thumbnail.test.ts tests/components/PatternGrid.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

Create `lib/builder/pattern-thumbnail.ts`:

```ts
import { recolorSvg, type ColorMap } from "./svg-recolor";

const markupCache = new Map<string, Promise<string>>();

export function fetchPatternMarkup(svgPath: string): Promise<string> {
  let pending = markupCache.get(svgPath);
  if (!pending) {
    pending = fetch(svgPath).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch pattern: ${svgPath} (${response.status})`);
      }
      return response.text();
    });
    // A failed fetch must not poison the cache.
    pending.catch(() => markupCache.delete(svgPath));
    markupCache.set(svgPath, pending);
  }
  return pending;
}

export function svgToDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

export async function patternThumbnailUrl(svgPath: string, colors: ColorMap): Promise<string> {
  return svgToDataUrl(recolorSvg(await fetchPatternMarkup(svgPath), colors));
}

export function clearPatternMarkupCache(): void {
  markupCache.clear();
}
```

Create `components/builder/PatternGrid.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { PatternDef } from "@/lib/builder/patterns";
import { patternThumbnailUrl } from "@/lib/builder/pattern-thumbnail";
import { CheckIcon } from "./icons";

type ThumbProps = { svgPath: string; primary: string; secondary: string };

function PatternThumb({ svgPath, primary, secondary }: ThumbProps) {
  const key = `${svgPath}|${primary}|${secondary}`;
  const [result, setResult] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    patternThumbnailUrl(svgPath, { primary, secondary })
      .then((url) => {
        if (!cancelled) setResult({ key, url });
      })
      .catch((err) => {
        console.error("Failed to load pattern thumbnail", err);
        if (!cancelled) setResult({ key, url: null });
      });
    return () => {
      cancelled = true;
    };
  }, [key, svgPath, primary, secondary]);

  const current = result && result.key === key ? result : null;
  const status = !current ? "loading" : current.url ? "loaded" : "error";

  return (
    <div
      data-thumb={status}
      className="aspect-square w-full rounded-xl bg-black/5 bg-cover bg-center"
      style={current?.url ? { backgroundImage: `url("${current.url}")` } : undefined}
    />
  );
}

type Props = {
  patterns: PatternDef[];
  selectedId: string;
  primary: string;
  secondary: string;
  onSelect: (id: string) => void;
};

export function PatternGrid({ patterns, selectedId, primary, secondary, onSelect }: Props) {
  return (
    <div role="radiogroup" className="grid grid-cols-2 gap-3">
      {patterns.map((pattern) => {
        const selected = pattern.id === selectedId;
        return (
          <button
            key={pattern.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(pattern.id)}
            className={[
              "relative flex flex-col items-center gap-2 rounded-2xl border-2 bg-white/70 p-3 text-sm font-medium transition",
              selected ? "border-accent shadow-sm" : "border-transparent hover:border-line",
            ].join(" ")}
          >
            <PatternThumb svgPath={pattern.svgPath} primary={primary} secondary={secondary} />
            <span>{pattern.label}</span>
            {selected && (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-foreground">
                <CheckIcon className="h-4 w-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/pattern-thumbnail.ts components/builder/PatternGrid.tsx tests/lib/pattern-thumbnail.test.ts tests/components/PatternGrid.test.tsx
git commit -m "feat: add PatternGrid with recolored SVG thumbnails" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Logo validation and section panels

**Files:**
- Create: `lib/builder/logo-upload.ts`, `components/builder/panels/PanelShell.tsx`, `DesignPanel.tsx`, `ColorsPanel.tsx`, `CrestPanel.tsx`, `SponsorPanel.tsx`, `TextPanel.tsx`, `tests/lib/logo-upload.test.ts`, `tests/components/panels.test.tsx`

**Interfaces:**
- Consumes: `useDesign`, `PatternGrid`, `BODY_PATTERNS`, `SLEEVE_PATTERNS`, icons, `renderWithDesign`.
- Produces: `MAX_LOGO_BYTES`, `ACCEPTED_LOGO_TYPES`, `validateLogoFile(file: { size: number; type: string }): string | null`; components `DesignPanel`, `ColorsPanel`, `CrestPanel`, `SponsorPanel`, `TextPanel` (no props) and `PanelShell({ title, hint?, children })`.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/logo-upload.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { MAX_LOGO_BYTES, validateLogoFile } from "@/lib/builder/logo-upload";

describe("validateLogoFile", () => {
  it("accepts png, jpeg and svg within the size limit", () => {
    for (const type of ["image/png", "image/jpeg", "image/svg+xml"]) {
      expect(validateLogoFile({ type, size: 1000 })).toBeNull();
    }
  });

  it("accepts a file of exactly the limit", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES })).toBeNull();
  });

  it("rejects files over 2 MB", () => {
    expect(validateLogoFile({ type: "image/png", size: MAX_LOGO_BYTES + 1 })).toMatch(/2 MB/);
  });

  it("rejects other file types", () => {
    expect(validateLogoFile({ type: "application/pdf", size: 10 })).toMatch(/PNG, JPG o SVG/);
    expect(validateLogoFile({ type: "", size: 10 })).toMatch(/PNG, JPG o SVG/);
  });
});
```

Create `tests/components/panels.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { DesignPanel } from "@/components/builder/panels/DesignPanel";
import { ColorsPanel } from "@/components/builder/panels/ColorsPanel";
import { CrestPanel } from "@/components/builder/panels/CrestPanel";
import { SponsorPanel } from "@/components/builder/panels/SponsorPanel";
import { TextPanel } from "@/components/builder/panels/TextPanel";
import { clearPatternMarkupCache } from "@/lib/builder/pattern-thumbnail";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

beforeEach(() => {
  clearPatternMarkupCache();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
});
afterEach(() => vi.unstubAllGlobals());

describe("DesignPanel", () => {
  it("picks a torso pattern, then switches to the sleeves tab", async () => {
    const { api } = renderWithDesign(<DesignPanel />);
    expect(screen.getByText("Elegí un patrón para el torso.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Diagonal" }));
    expect(api.current!.state.bodyPatternId).toBe("diagonal");

    fireEvent.click(screen.getByRole("tab", { name: "Mangas" }));
    expect(screen.getByText("Elegí un patrón para las mangas.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Con puño" }));
    expect(api.current!.state.sleevePatternId).toBe("sleeve-cuff");
    await waitFor(() => expect(document.querySelector('[data-thumb="loaded"]')).not.toBeNull());
  });
});

describe("ColorsPanel", () => {
  it("updates primary and secondary colors", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    fireEvent.change(screen.getByLabelText("Color primario"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Color secundario"), { target: { value: "#00ff00" } });
    expect(api.current!.state.colors).toEqual({ primary: "#ff0000", secondary: "#00ff00" });
  });
});

describe("CrestPanel", () => {
  it("rejects a file of the wrong type with an inline message and leaves state unchanged", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/PNG, JPG o SVG/);
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("rejects a file over 2 MB", () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [big] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/2 MB/);
    expect(api.current!.state.logoDataUrl).toBeNull();
  });

  it("stores a valid image as a data URL and can remove it", async () => {
    const { api } = renderWithDesign(<CrestPanel />);
    const ok = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Subir escudo"), { target: { files: [ok] } });
    await waitFor(() => expect(api.current!.state.logoDataUrl).toMatch(/^data:image\/png/));
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quitar escudo" }));
    expect(api.current!.state.logoDataUrl).toBeNull();
  });
});

describe("SponsorPanel and TextPanel", () => {
  it("sets the sponsor text", () => {
    const { api } = renderWithDesign(<SponsorPanel />);
    fireEvent.change(screen.getByLabelText("Texto del sponsor"), { target: { value: "ACME" } });
    expect(api.current!.state.sponsorText).toBe("ACME");
  });

  it("uppercases the name and keeps only two digits of the number", () => {
    const { api } = renderWithDesign(<TextPanel />);
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "perez" } });
    fireEvent.change(screen.getByLabelText("Número"), { target: { value: "1a0" } });
    expect(api.current!.state.playerName).toBe("PEREZ");
    expect(api.current!.state.playerNumber).toBe("10");
    expect(screen.getByLabelText("Número")).toHaveAttribute("maxlength", "2");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/lib/logo-upload.test.ts tests/components/panels.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

Create `lib/builder/logo-upload.ts`:

```ts
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];

// Returns a user-facing error message, or null when the file is acceptable.
export function validateLogoFile(file: { size: number; type: string }): string | null {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return "Formato no válido. Usá PNG, JPG o SVG.";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "El archivo supera los 2 MB.";
  }
  return null;
}
```

Create `components/builder/panels/PanelShell.tsx`:

```tsx
import type { ReactNode } from "react";
import { InfoIcon } from "../icons";

type Props = { title: string; hint?: string; children: ReactNode };

export function PanelShell({ title, hint, children }: Props) {
  return (
    <section aria-label={title} className="flex flex-col p-5">
      <h2 className="mb-4 text-2xl font-bold tracking-tight">{title}</h2>
      {children}
      {hint && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <InfoIcon className="h-4 w-4 shrink-0" />
          {hint}
        </p>
      )}
    </section>
  );
}
```

Create `components/builder/panels/DesignPanel.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { BODY_PATTERNS, SLEEVE_PATTERNS } from "@/lib/builder/patterns";
import { PatternGrid } from "../PatternGrid";
import { PanelShell } from "./PanelShell";

type Tab = "torso" | "mangas";
const TABS: { id: Tab; label: string }[] = [
  { id: "torso", label: "Torso" },
  { id: "mangas", label: "Mangas" },
];

export function DesignPanel() {
  const { state, dispatch } = useDesign();
  const [tab, setTab] = useState<Tab>("torso");
  const isTorso = tab === "torso";

  return (
    <PanelShell
      title="Diseño"
      hint={isTorso ? "Elegí un patrón para el torso." : "Elegí un patrón para las mangas."}
    >
      <div role="tablist" aria-label="Zona de la camiseta" className="mb-4 grid grid-cols-2 rounded-2xl bg-black/5 p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={[
              "rounded-xl py-2 text-sm font-semibold transition",
              tab === id ? "bg-white shadow-sm" : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      <PatternGrid
        patterns={isTorso ? BODY_PATTERNS : SLEEVE_PATTERNS}
        selectedId={isTorso ? state.bodyPatternId : state.sleevePatternId}
        primary={state.colors.primary}
        secondary={state.colors.secondary}
        onSelect={(id) =>
          dispatch(isTorso ? { type: "SET_BODY_PATTERN", id } : { type: "SET_SLEEVE_PATTERN", id })
        }
      />
    </PanelShell>
  );
}
```

Create `components/builder/panels/ColorsPanel.tsx`:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import type { ColorSlot } from "@/lib/builder/svg-recolor";
import { PanelShell } from "./PanelShell";

const SLOTS: { slot: ColorSlot; label: string }[] = [
  { slot: "primary", label: "Color primario" },
  { slot: "secondary", label: "Color secundario" },
];

export function ColorsPanel() {
  const { state, dispatch } = useDesign();
  return (
    <PanelShell title="Colores" hint="Los colores se aplican a todos los patrones.">
      <div className="flex flex-col gap-3">
        {SLOTS.map(({ slot, label }) => (
          <label key={slot} className="flex items-center justify-between rounded-2xl bg-white/70 p-3 text-sm font-medium">
            <span className="flex flex-col">
              {label}
              <span className="font-mono text-xs uppercase text-muted">{state.colors[slot]}</span>
            </span>
            <input
              type="color"
              aria-label={label}
              value={state.colors[slot]}
              onChange={(e) => dispatch({ type: "SET_COLOR", slot, value: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-transparent"
            />
          </label>
        ))}
      </div>
    </PanelShell>
  );
}
```

Create `components/builder/panels/CrestPanel.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { validateLogoFile } from "@/lib/builder/logo-upload";
import { UploadIcon } from "../icons";
import { PanelShell } from "./PanelShell";

export function CrestPanel() {
  const { state, dispatch } = useDesign();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => dispatch({ type: "SET_LOGO", dataUrl: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <PanelShell title="Escudo" hint="PNG, JPG o SVG. Máximo 2 MB.">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-white/70 p-6 text-sm font-medium hover:border-accent">
        <UploadIcon className="h-7 w-7 text-muted" />
        <span>Subir escudo</span>
        <input
          type="file"
          aria-label="Subir escudo"
          accept="image/png,image/jpeg,image/svg+xml"
          className="sr-only"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {state.logoDataUrl && (
        <button
          type="button"
          onClick={() => dispatch({ type: "SET_LOGO", dataUrl: null })}
          className="mt-3 self-start rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          Quitar escudo
        </button>
      )}
    </PanelShell>
  );
}
```

Note: `e.target.value = ""` lets the user re-pick the same file after an error; in jsdom the `files` array was already read before the reset.

Create `components/builder/panels/SponsorPanel.tsx`:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import { PanelShell } from "./PanelShell";

export function SponsorPanel() {
  const { state, dispatch } = useDesign();
  return (
    <PanelShell title="Sponsor" hint="Aparece en el frente de la camiseta.">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Texto del sponsor
        <input
          type="text"
          value={state.sponsorText}
          onChange={(e) => dispatch({ type: "SET_SPONSOR_TEXT", value: e.target.value })}
          className="rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:border-accent"
        />
      </label>
    </PanelShell>
  );
}
```

Create `components/builder/panels/TextPanel.tsx`:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import { PanelShell } from "./PanelShell";

const INPUT =
  "rounded-xl border border-line bg-white/80 px-3 py-2 text-base outline-none focus-visible:border-accent";

export function TextPanel() {
  const { state, dispatch } = useDesign();
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
      </div>
    </PanelShell>
  );
}
```

In the test above, `fireEvent.change(... { value: "1a0" })` gives `"10"` after the regex; `maxLength` only constrains typing, which is why the test asserts the attribute separately.

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/logo-upload.ts components/builder/panels tests/lib/logo-upload.test.ts tests/components/panels.test.tsx
git commit -m "feat: add section panels with inline logo validation" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Header and StageToolbar

**Files:**
- Create: `components/builder/Header.tsx`, `components/builder/StageToolbar.tsx`, `tests/components/Header.test.tsx`, `tests/components/StageToolbar.test.tsx`

**Interfaces:**
- Consumes: `useDesign` (`state.projectName`, `dispatch`, `canUndo`, `canRedo`), icons.
- Produces: `Header()` (no props); `StageToolbar({ onDownload: () => void })`.

- [ ] **Step 1: Write the failing tests**

Create `tests/components/Header.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { Header } from "@/components/builder/Header";

describe("Header", () => {
  it("shows the project name and disables the not-yet-built actions", () => {
    renderWithDesign(<Header />);
    expect(screen.getByRole("textbox", { name: "Nombre del diseño" })).toHaveValue("Mi diseño");
    expect(screen.getByRole("button", { name: "Compartir" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revisar diseño" })).toBeDisabled();
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("renames the project on blur", () => {
    const { api } = renderWithDesign(<Header />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "  Los del viernes " } });
    fireEvent.blur(input);
    expect(api.current!.state.projectName).toBe("Los del viernes");
    expect(input).toHaveValue("Los del viernes");
  });

  it("restores the previous name when cleared to blank", () => {
    const { api } = renderWithDesign(<Header />);
    const input = screen.getByRole("textbox", { name: "Nombre del diseño" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(input).toHaveValue("Mi diseño");
    expect(api.current!.state.projectName).toBe("Mi diseño");
    expect(api.current!.canUndo).toBe(false);
  });
});
```

Create `tests/components/StageToolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithDesign } from "../helpers/render-with-design";
import { StageToolbar } from "@/components/builder/StageToolbar";

describe("StageToolbar", () => {
  it("disables undo/redo until there is history, then undoes and redoes", () => {
    const { api } = renderWithDesign(<StageToolbar onDownload={() => {}} />);
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rehacer" })).toBeDisabled();

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    expect(screen.getByRole("button", { name: "Deshacer" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(api.current!.state.bodyPatternId).not.toBe("plain-body");
    expect(screen.getByRole("button", { name: "Rehacer" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Rehacer" }));
    expect(api.current!.state.bodyPatternId).toBe("plain-body");
  });

  it("calls onDownload", () => {
    const onDownload = vi.fn();
    renderWithDesign(<StageToolbar onDownload={onDownload} />);
    fireEvent.click(screen.getByRole("button", { name: "Descargar PNG" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/components/Header.test.tsx tests/components/StageToolbar.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

Create `components/builder/Header.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { ArrowRightIcon, PencilIcon, ShareIcon } from "./icons";

export function Header() {
  const { state, dispatch } = useDesign();
  const [draft, setDraft] = useState(state.projectName);

  function commit() {
    const next = draft.trim();
    if (!next) {
      setDraft(state.projectName);
      return;
    }
    setDraft(next);
    if (next !== state.projectName) {
      dispatch({ type: "SET_PROJECT_NAME", value: next });
    }
  }

  return (
    <header className="flex items-center gap-3 px-4 py-3 md:px-6 md:py-4">
      <span className="text-2xl font-black tracking-tight md:text-3xl">
        GEPE<sup className="ml-0.5 align-super text-[0.4em] font-bold">®</sup>
      </span>
      <div className="hidden h-8 w-px bg-line md:block" />
      <label className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <span className="sr-only">Nombre del diseño</span>
        <input
          type="text"
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="min-w-0 bg-transparent text-base font-semibold outline-none focus-visible:underline md:w-56"
        />
        <PencilIcon className="h-4 w-4 shrink-0 text-muted" />
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          title="Próximamente"
          aria-label="Compartir"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-foreground/80 bg-white/70 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:px-5"
        >
          <ShareIcon className="h-5 w-5" />
          <span className="hidden md:inline">Compartir</span>
        </button>
        <button
          type="button"
          disabled
          title="Próximamente"
          className="hidden h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
        >
          Revisar diseño
          <ArrowRightIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
```

Create `components/builder/StageToolbar.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";
import { useDesign } from "@/lib/builder/design-context";
import { DownloadIcon, RedoIcon, UndoIcon } from "./icons";

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

export function StageToolbar({ onDownload }: { onDownload: () => void }) {
  const { dispatch, canUndo, canRedo } = useDesign();
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-3 px-4">
      <RoundButton label="Deshacer" disabled={!canUndo} onClick={() => dispatch({ type: "UNDO" })}>
        <UndoIcon className="h-5 w-5" />
      </RoundButton>
      <RoundButton label="Rehacer" disabled={!canRedo} onClick={() => dispatch({ type: "REDO" })}>
        <RedoIcon className="h-5 w-5" />
      </RoundButton>
      <button
        type="button"
        aria-label="Descargar PNG"
        onClick={onDownload}
        className="pointer-events-auto absolute right-4 top-0 flex h-11 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-semibold shadow-sm transition hover:bg-white md:px-4"
      >
        <DownloadIcon className="h-5 w-5" />
        <span className="hidden md:inline">Descargar PNG</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/builder/Header.tsx components/builder/StageToolbar.tsx tests/components/Header.test.tsx tests/components/StageToolbar.test.tsx
git commit -m "feat: add Header and StageToolbar (undo/redo, download)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Camera math, CameraRig, ViewerControls, transparent Viewer3D with floor shadow

**Files:**
- Create: `lib/builder/camera-math.ts`, `components/builder/CameraRig.tsx`, `components/builder/ViewerControls.tsx`, `tests/lib/camera-math.test.ts`, `tests/components/ViewerControls.test.tsx`
- Modify: `components/builder/Viewer3D.tsx`

**Interfaces:**
- Produces (`camera-math.ts`):
  ```ts
  export type ViewSide = "front" | "back";
  export const VIEW_AZIMUTH: Record<ViewSide, number>;   // front 0, back Math.PI
  export function normalizeAngle(angle: number): number;  // into (-PI, PI]
  export function shortestDelta(from: number, to: number): number;
  export function stepAzimuth(current: number, target: number, factor: number, epsilon?: number): number;
  export function azimuthOf(dx: number, dz: number): number;            // atan2(dx, dz)
  export function offsetAt(radius: number, azimuth: number): { x: number; z: number };
  ```
- Produces: `CameraRig({ view: ViewSide; viewToken: number; onInteract: () => void })` (must render inside `<Canvas>`); `ViewerControls({ view, onViewChange, onReset, showHint })`; `Viewer3D` forwardRef<HTMLCanvasElement, { view: ViewSide; viewToken: number; onInteract: () => void }>.
- Geometry fact (measured): jersey front faces +z (camera starts at `[0, 1.5, 3]`), so azimuth 0 = front and π = back.

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/camera-math.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  VIEW_AZIMUTH,
  azimuthOf,
  normalizeAngle,
  offsetAt,
  shortestDelta,
  stepAzimuth,
} from "@/lib/builder/camera-math";

describe("camera math", () => {
  it("maps front to 0 and back to PI", () => {
    expect(VIEW_AZIMUTH.front).toBe(0);
    expect(VIEW_AZIMUTH.back).toBe(Math.PI);
  });

  it("normalizes angles into (-PI, PI]", () => {
    expect(normalizeAngle(2 * Math.PI)).toBeCloseTo(0);
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(normalizeAngle(7)).toBeCloseTo(7 - 2 * Math.PI);
  });

  it("takes the short way around, across the +/-PI seam", () => {
    expect(shortestDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6.0);
    expect(shortestDelta(-3.0, 3.0)).toBeCloseTo(-(2 * Math.PI - 6.0));
    expect(shortestDelta(0.1, 0.4)).toBeCloseTo(0.3);
  });

  it("converges to the target without overshooting", () => {
    let a = 2.9;
    for (let i = 0; i < 200; i++) a = stepAzimuth(a, VIEW_AZIMUTH.back, 0.12);
    expect(Math.abs(shortestDelta(a, VIEW_AZIMUTH.back))).toBeLessThan(1e-6);
  });

  it("snaps when within epsilon", () => {
    const next = stepAzimuth(0.001, 0, 0.12, 0.002);
    expect(next).toBeCloseTo(0);
  });

  it("rotates the short way when the camera is past the seam", () => {
    // Camera dragged to azimuth -3.0, which is already almost at the back (-PI == PI).
    const next = stepAzimuth(-3.0, VIEW_AZIMUTH.back, 0.5);
    expect(next).toBeLessThan(-3.0); // moves further negative toward -PI, not the long way through 0
  });

  it("round-trips an offset through azimuthOf", () => {
    const { x, z } = offsetAt(3, 1.2);
    expect(azimuthOf(x, z)).toBeCloseTo(1.2);
    expect(Math.hypot(x, z)).toBeCloseTo(3);
  });

  it("puts the front camera on +z and the back camera on -z", () => {
    expect(offsetAt(3, VIEW_AZIMUTH.front).z).toBeCloseTo(3);
    expect(offsetAt(3, VIEW_AZIMUTH.back).z).toBeCloseTo(-3);
  });
});
```

Create `tests/components/ViewerControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ViewerControls } from "@/components/builder/ViewerControls";

describe("ViewerControls", () => {
  it("shows which side is active and reports changes", () => {
    const onViewChange = vi.fn();
    render(<ViewerControls view="front" onViewChange={onViewChange} onReset={() => {}} showHint />);
    expect(screen.getByRole("button", { name: "Frente" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Espalda" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Espalda" }));
    expect(onViewChange).toHaveBeenCalledWith("back");
  });

  it("calls onReset from the rotate button", () => {
    const onReset = vi.fn();
    render(<ViewerControls view="back" onViewChange={() => {}} onReset={onReset} showHint />);
    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("shows the drag hint only when asked", () => {
    const { rerender } = render(
      <ViewerControls view="front" onViewChange={() => {}} onReset={() => {}} showHint />
    );
    expect(screen.getByText("Arrastrá para girar")).toBeInTheDocument();
    rerender(<ViewerControls view="front" onViewChange={() => {}} onReset={() => {}} showHint={false} />);
    expect(screen.queryByText("Arrastrá para girar")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run tests/lib/camera-math.test.ts tests/components/ViewerControls.test.tsx`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

Create `lib/builder/camera-math.ts`:

```ts
export type ViewSide = "front" | "back";

// The jersey front faces +z and the camera starts on +z, so azimuth 0 is the
// front and PI is the back.
export const VIEW_AZIMUTH: Record<ViewSide, number> = { front: 0, back: Math.PI };

const TWO_PI = Math.PI * 2;

// Normalizes into (-PI, PI].
export function normalizeAngle(angle: number): number {
  let result = angle % TWO_PI;
  if (result <= -Math.PI) result += TWO_PI;
  else if (result > Math.PI) result -= TWO_PI;
  return result;
}

export function shortestDelta(from: number, to: number): number {
  return normalizeAngle(to - from);
}

// One easing step toward `target` along the short way round.
export function stepAzimuth(current: number, target: number, factor: number, epsilon = 0.002): number {
  const delta = shortestDelta(current, target);
  if (Math.abs(delta) < epsilon) return current + delta;
  return current + delta * factor;
}

export function azimuthOf(dx: number, dz: number): number {
  return Math.atan2(dx, dz);
}

export function offsetAt(radius: number, azimuth: number): { x: number; z: number } {
  return { x: radius * Math.sin(azimuth), z: radius * Math.cos(azimuth) };
}
```

Create `components/builder/ViewerControls.tsx`:

```tsx
"use client";
import type { ViewSide } from "@/lib/builder/camera-math";
import { HandIcon, RotateIcon } from "./icons";

type Props = {
  view: ViewSide;
  onViewChange: (view: ViewSide) => void;
  onReset: () => void;
  showHint: boolean;
};

const SIDES: { id: ViewSide; label: string }[] = [
  { id: "front", label: "Frente" },
  { id: "back", label: "Espalda" },
];

export function ViewerControls({ view, onViewChange, onReset, showHint }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex flex-col items-center gap-2">
      <div className="pointer-events-auto flex items-center gap-3">
        <div role="group" aria-label="Vista" className="flex rounded-full bg-white/80 p-1 shadow-sm">
          {SIDES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onViewChange(id)}
              className={[
                "rounded-full px-5 py-2 text-sm font-semibold transition",
                view === id ? "bg-accent" : "text-foreground/80 hover:bg-black/5",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Restablecer vista"
          onClick={onReset}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
        >
          <RotateIcon className="h-5 w-5" />
        </button>
      </div>
      {showHint && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <HandIcon className="h-4 w-4" />
          Arrastrá para girar
        </p>
      )}
    </div>
  );
}
```

Create `components/builder/CameraRig.tsx`:

```tsx
"use client";
import { useEffect, useRef, type ComponentRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { VIEW_AZIMUTH, azimuthOf, offsetAt, shortestDelta, stepAzimuth, type ViewSide } from "@/lib/builder/camera-math";

type Props = {
  view: ViewSide;
  // Bumped on every explicit view request so choosing the same side again
  // (e.g. "restablecer vista" after dragging) re-triggers the animation.
  viewToken: number;
  onInteract: () => void;
};

export function CameraRig({ view, viewToken, onInteract }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const animating = useRef(false);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    animating.current = true;
  }, [view, viewToken]);

  useFrame(() => {
    const ctl = controls.current;
    if (!ctl || !animating.current) return;

    const target = ctl.target;
    const dx = camera.position.x - target.x;
    const dz = camera.position.z - target.z;
    const radius = Math.hypot(dx, dz);
    const goal = VIEW_AZIMUTH[view];

    const next = stepAzimuth(azimuthOf(dx, dz), goal, 0.12);
    const offset = offsetAt(radius, next);
    camera.position.x = target.x + offset.x;
    camera.position.z = target.z + offset.z;
    ctl.update();

    if (Math.abs(shortestDelta(next, goal)) < 1e-6) animating.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={1}
      maxDistance={6}
      onStart={() => {
        animating.current = false;
        onInteract();
      }}
    />
  );
}
```

Replace `components/builder/Viewer3D.tsx`:

```tsx
"use client";
import { Suspense, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import type { ViewSide } from "@/lib/builder/camera-math";
import { CameraRig } from "./CameraRig";
import { JerseyModel } from "./JerseyModel";

type Props = { view: ViewSide; viewToken: number; onInteract: () => void };

// The jersey mesh spans y in about [-0.68, 0.68] (see JerseyModel), so the
// "floor" shadow sits just under it. The canvas is transparent: the stage
// gradient is CSS behind it, and the exported PNG paints the same gradient.
const FLOOR_Y = -0.69;

export const Viewer3D = forwardRef<HTMLCanvasElement, Props>(function Viewer3D(
  { view, viewToken, onInteract },
  ref
) {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 3], fov: 45 }}
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      style={{ background: "transparent" }}
      ref={ref}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[2, 4, 3]} intensity={1} />
      <Suspense fallback={null}>
        <JerseyModel />
      </Suspense>
      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={0.35}
        scale={6}
        blur={3}
        far={1.6}
        resolution={512}
        color="#6b5a2e"
      />
      <CameraRig view={view} viewToken={viewToken} onInteract={onInteract} />
    </Canvas>
  );
});
```

`Viewer3D` is not unit-tested (WebGL); it is verified visually in Task 12. `BuilderPage` still passes no props to it until Task 12, so `tsc` will fail between Tasks 10 and 12 unless this task also updates the call site minimally. Do that now: in `components/builder/BuilderPage.tsx` change `<Viewer3D ref={canvasRef} />` to `<Viewer3D ref={canvasRef} view="front" viewToken={0} onInteract={() => {}} />` (this file is fully rewritten in Task 12).

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS. If `react-hooks/immutability` (or similar) flags the `camera.position` writes in `CameraRig`, move them into a plain function outside the component, e.g. `applyAzimuth(camera, target, radius, azimuth)`, and call that from `useFrame`. If `ComponentRef<typeof OrbitControls>` does not expose `.target`, use `useRef<import("three-stdlib").OrbitControls>(null)` only if `three-stdlib` resolves; otherwise cast `ctl` to `{ target: THREE.Vector3; update: () => void }` locally.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/camera-math.ts components/builder/CameraRig.tsx components/builder/ViewerControls.tsx components/builder/Viewer3D.tsx components/builder/BuilderPage.tsx tests/lib/camera-math.test.ts tests/components/ViewerControls.test.tsx
git commit -m "feat: add Frente/Espalda camera rig, transparent stage and floor shadow" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: PNG export over the stage gradient

**Files:**
- Create: `lib/builder/export-image.ts`, `tests/lib/export-image.test.ts`

**Interfaces:**
- Consumes: `STAGE_STOPS`, `STAGE_GLOW` from `stage-style.ts`.
- Produces:
  ```ts
  export function paintStageBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  export function exportStagePng(source: HTMLCanvasElement, createCanvas?: () => HTMLCanvasElement): string | null;
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/lib/export-image.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { exportStagePng, paintStageBackground } from "@/lib/builder/export-image";
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

describe("exportStagePng", () => {
  it("paints the background first, then the WebGL capture, and returns a PNG data URL", () => {
    const { ctx } = mockCtx();
    const out = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctx),
      toDataURL: vi.fn(() => "data:image/png;base64,AAA"),
    } as unknown as HTMLCanvasElement;
    const source = { width: 800, height: 600 } as HTMLCanvasElement;

    const url = exportStagePng(source, () => out);

    expect(url).toBe("data:image/png;base64,AAA");
    expect(out.width).toBe(800);
    expect(out.height).toBe(600);
    const fillOrder = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    const drawOrder = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
    expect(fillOrder).toBeLessThan(drawOrder);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0);
    expect(out.toDataURL).toHaveBeenCalledWith("image/png");
  });

  it("returns null when a 2d context is unavailable", () => {
    const out = { width: 0, height: 0, getContext: () => null } as unknown as HTMLCanvasElement;
    expect(exportStagePng({ width: 10, height: 10 } as HTMLCanvasElement, () => out)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/lib/export-image.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `lib/builder/export-image.ts`:

```ts
import { STAGE_GLOW, STAGE_STOPS } from "./stage-style";

// Paints the same background the stage shows on screen (see stage-style.ts).
// CSS "to bottom right" and a corner-to-corner canvas gradient differ slightly
// on non-square canvases; that is acceptable for the exported image.
export function paintStageBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const base = ctx.createLinearGradient(0, 0, width, height);
  for (const [offset, color] of STAGE_STOPS) base.addColorStop(offset, color);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  const cx = width * 0.5;
  const cy = height * 0.48;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.55);
  glow.addColorStop(0, STAGE_GLOW);
  glow.addColorStop(0.7, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

// The WebGL canvas is transparent (alpha: true). Composite it over the stage
// background so the shared PNG looks like the screen.
export function exportStagePng(
  source: HTMLCanvasElement,
  createCanvas: () => HTMLCanvasElement = () => document.createElement("canvas")
): string | null {
  const out = createCanvas();
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  paintStageBackground(ctx, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out.toDataURL("image/png");
}
```

- [ ] **Step 4: Run gates**

Run: `npm test && npx tsc --noEmit && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/builder/export-image.ts tests/lib/export-image.test.ts
git commit -m "feat: composite exported PNG over the stage gradient" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Assemble BuilderPage, remove ControlPanel, verify against the mockup

**Files:**
- Modify: `components/builder/BuilderPage.tsx`
- Delete: `components/builder/ControlPanel.tsx`
- Create: `tests/components/BuilderPage.test.tsx`

**Interfaces:**
- Consumes everything from Tasks 3–11. `Viewer3D` is mocked in the test (no WebGL in jsdom).

- [ ] **Step 1: Write the failing test**

Create `tests/components/BuilderPage.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { clearPatternMarkupCache } from "@/lib/builder/pattern-thumbnail";

// jsdom has no WebGL: replace the 3D stage with a stub that exposes its props.
vi.mock("@/components/builder/Viewer3D", async () => {
  const React = await import("react");
  return {
    Viewer3D: React.forwardRef<HTMLCanvasElement, { view: string }>(function Viewer3DStub({ view }, ref) {
      return <canvas ref={ref} data-testid="viewer" data-view={view} />;
    }),
  };
});

import { BuilderPage } from "@/components/builder/BuilderPage";

const SVG = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="primary" fill="#000"/></svg>`;

describe("BuilderPage", () => {
  beforeEach(() => {
    clearPatternMarkupCache();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => SVG })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows the Diseño panel first and switches sections", () => {
    render(<BuilderPage />);
    expect(screen.getByRole("heading", { name: "Diseño" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Colores" }));
    expect(screen.getByRole("heading", { name: "Colores" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nombre y número" }));
    expect(screen.getByRole("heading", { name: "Nombre y número" })).toBeInTheDocument();
  });

  it("switches the viewer between Frente and Espalda and back with the reset button", () => {
    render(<BuilderPage />);
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "front");
    expect(screen.getByText("Arrastrá para girar")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Espalda" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "back");

    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    expect(screen.getByTestId("viewer")).toHaveAttribute("data-view", "front");
  });

  it("does not offer a saved indicator or the old form controls", () => {
    render(<BuilderPage />);
    expect(screen.queryByText("Guardado")).toBeNull();
    expect(screen.queryByText("Patrón de cuerpo")).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/components/BuilderPage.test.tsx`
Expected: FAIL (the old page has none of this).

- [ ] **Step 3: Implement**

Replace `components/builder/BuilderPage.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { DesignProvider } from "@/lib/builder/design-context";
import { exportStagePng } from "@/lib/builder/export-image";
import { stageBackgroundCss } from "@/lib/builder/stage-style";
import type { ViewSide } from "@/lib/builder/camera-math";
import { Header } from "./Header";
import { SectionNav, type SectionId } from "./SectionNav";
import { StageToolbar } from "./StageToolbar";
import { Viewer3D } from "./Viewer3D";
import { ViewerControls } from "./ViewerControls";
import { ArrowRightIcon } from "./icons";
import { ColorsPanel } from "./panels/ColorsPanel";
import { CrestPanel } from "./panels/CrestPanel";
import { DesignPanel } from "./panels/DesignPanel";
import { SponsorPanel } from "./panels/SponsorPanel";
import { TextPanel } from "./panels/TextPanel";

function SectionPanel({ section }: { section: SectionId }) {
  switch (section) {
    case "diseno":
      return <DesignPanel />;
    case "colores":
      return <ColorsPanel />;
    case "escudo":
      return <CrestPanel />;
    case "sponsor":
      return <SponsorPanel />;
    case "texto":
      return <TextPanel />;
  }
}

export function BuilderPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [section, setSection] = useState<SectionId>("diseno");
  const [view, setView] = useState<ViewSide>("front");
  const [viewToken, setViewToken] = useState(0);
  const [interacted, setInteracted] = useState(false);

  function requestView(side: ViewSide) {
    setView(side);
    setViewToken((token) => token + 1);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = exportStagePng(canvas);
    if (!url) return;
    const link = document.createElement("a");
    link.download = "mi-camiseta.png";
    link.href = url;
    link.click();
  }

  return (
    <DesignProvider>
      <div className="min-h-dvh md:p-6">
        <main
          className="mx-auto flex h-dvh max-w-[1680px] flex-col overflow-hidden border-line md:h-[calc(100dvh-3rem)] md:rounded-[28px] md:border md:shadow-2xl"
          style={{ background: stageBackgroundCss() }}
        >
          <Header />
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            {/* Stage: first on mobile, last on desktop. */}
            <div className="relative order-1 min-h-[16rem] flex-1 md:order-3">
              <div className="absolute inset-0">
                <Viewer3D
                  ref={canvasRef}
                  view={view}
                  viewToken={viewToken}
                  onInteract={() => setInteracted(true)}
                />
              </div>
              <StageToolbar onDownload={handleDownload} />
              <ViewerControls
                view={view}
                onViewChange={requestView}
                onReset={() => requestView("front")}
                showHint={!interacted}
              />
            </div>

            {/* Section panel: bottom sheet on mobile, middle column on desktop. */}
            <div className="order-2 max-h-[42dvh] overflow-y-auto rounded-t-3xl bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:mb-4 md:mr-2 md:max-h-none md:w-[22rem] md:shrink-0 md:rounded-3xl md:bg-white/60 md:shadow-none md:backdrop-blur">
              <SectionPanel section={section} />
            </div>

            {/* Navigation: tab bar on mobile, sidebar (first) on desktop. */}
            <div className="order-3 md:order-1">
              <SectionNav active={section} onChange={setSection} />
            </div>

            {/* Mobile-only call to action (desktop has it in the header). */}
            <div className="order-4 bg-white px-4 pb-4 md:hidden">
              <button
                type="button"
                disabled
                title="Próximamente"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                Revisar diseño
                <ArrowRightIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </DesignProvider>
  );
}
```

Delete `components/builder/ControlPanel.tsx` (`git rm components/builder/ControlPanel.tsx`) and confirm nothing imports it: `grep -rn "ControlPanel" app components lib tests` should print nothing.

- [ ] **Step 4: Run all automated gates**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass; the build succeeds.

- [ ] **Step 5: Visual verification against the mockup (manual, required)**

Run `npm run dev`, open `http://localhost:3000`, and check at **1440×900** and **390×844** (DevTools device toolbar):

1. Layout matches the mockup: header (GEPE, editable name, Compartir, Revisar diseño disabled), sidebar, panel with Torso/Mangas tabs and a 2-column pattern grid, stage with undo/redo on top, Frente/Espalda + rotate + "Arrastrá para girar" below. Mobile: stage on top, bottom sheet, tab bar, full-width CTA.
2. Warm gradient background and a soft, blurred shadow under the jersey. If the shadow is too faint/hard or floats away from the hem, tune `opacity`, `blur`, `scale`, `FLOOR_Y` in `Viewer3D.tsx`.
3. Pick each of the 6 torso patterns: it appears on the **front and back** correctly (Degradado dark-at-bottom on both; Diagonal looks coherent). Fix any SVG that looks wrong in `public/patterns/`.
4. Sleeves tab: the 3 sleeve patterns apply. If the `sleeve-cuff` band lands across the sleeve instead of at the cuff, swap its band to the vertical axis (`x="400" y="0" width="112" height="512"`) and re-check; the left sleeve rect was never measured, so also check both sleeves.
5. Frente/Espalda animates smoothly; the back shows name and number **upright**; dragging then clicking "Restablecer vista" returns to the front the short way.
6. Undo/redo: type a name quickly, one Undo clears it entirely; the project name is unaffected by undo.
7. "Descargar PNG" downloads an image with the gradient behind the jersey (not transparent, not black).
8. Upload a >2 MB image and a PDF in Escudo: inline red message, no alert, design unchanged.

Report each item as pass/fail with a screenshot or note; fix failures before committing.

- [ ] **Step 6: Commit**

```bash
git add components/builder/BuilderPage.tsx tests/components/BuilderPage.test.tsx
git rm components/builder/ControlPanel.tsx
git commit -m "feat: assemble GEPE builder UI and remove the old control panel" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
