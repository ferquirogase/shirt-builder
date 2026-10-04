# Patterns With Per-Design Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each pattern declare which of three color roles it uses (so the Colors panel shows only those), allow an optional back-of-shirt SVG, and add 14 torso designs and 3 sleeve designs inspired by popular football shirts.

**Architecture:** `ColorSlot` gains an `accent` role. `PatternDef` gains `colors` (roles with label and default) and an optional `svgPathBack`. A pure helper derives the visible color list from the chosen torso + sleeve patterns; the reducer applies defaults for roles that were not in use when the pattern changes; `ColorsPanel`, thumbnails and the 3D texture read from that. New designs are plain SVGs with `data-color-slot`, checked on the 3D model.

**Tech Stack:** Next.js 16.3.7, React 19.2, three + @react-three/fiber, Vitest + Testing Library (jsdom), SVG assets in `public/patterns/`.

**Spec:** `docs/superpowers/specs/2026-10-04-patrones-por-diseno-design.md`

## Global Constraints

- **Read the Next.js docs first** (`AGENTS.md`): this Next.js has breaking changes. None of the tasks here touch routing or `app/`, so no doc read is needed unless you do.
- **Roles are exactly** `"primary" | "secondary" | "accent"` for patterns; `"collar"` stays a separate slot.
- **Keep existing ids and labels:** body `plain-body` ("Liso"), `stripes-v1` ("Franjas"), `diagonal` ("Diagonal"), `gradient` ("Degradado"), `geometric` ("Geométrico"), `hoops` ("Rayas"); sleeves `sleeve-plain`, `sleeve-primary`, `sleeve-cuff` ("Con puño"). Existing tests click these labels.
- **Migrated patterns keep today's labels and colors:** primary label "Color primario", secondary label "Color secundario", default primary `#0a5c36`, secondary `#ffffff`.
- **Content rule:** no crests, brand marks or sponsors in any SVG; pattern labels describe the design ("Banda diagonal"), never a team name.
- **UI copy is Spanish (rioplatense, voseo).** Code and comments in English, matching the codebase.
- **SVG rule:** every colored shape carries `data-color-slot` and a `fill`; use filled polygons/paths/rects only. `recolorSvg` sets `fill`, not `stroke`, so strokes would not recolor.
- **The working tree has uncommitted work from earlier sessions** (new model, collar, textures, normal map). Do not revert or stash it. Commit steps below stage only the files named in that task, and **are to be run only if the user has asked for commits**; otherwise skip them.
- **Run before declaring a task done:** `npx tsc --noEmit`, `npx vitest run`, `npx eslint components lib tests`. One lint error already exists in `components/builder/JerseyModel.tsx` (`texture.needsUpdate`, react-hooks/immutability) and is not part of this work; no new lint errors may appear.

## Review Focus

Failure modes the spec implies but no task would otherwise exercise; each has a test in the task named in brackets.

1. **A color the user chose disappears from the panel and then returns.** Roles that were not in use at the moment of switching take the new pattern's default (spec rule), so a color set on an unused role is lost. Expected: exactly the spec rule, no stale value leaking. [Task 2]
2. **Torso and sleeve patterns share a role with different labels.** The torso's label wins; sleeve-only roles use the sleeve label; no duplicate row. [Task 3]
3. **Undo after switching pattern.** One undo restores the old pattern *and* the old colors. [Task 2]
4. **A back SVG that fails to load.** The shirt must still draw, with the front SVG on the back, and no unhandled rejection. [Task 5]
5. **Twenty body patterns in the panel.** The pattern list must stay reachable (scrollable) at desktop and mobile heights. [Task 8, manual check]

---

## File Structure

- `lib/builder/svg-recolor.ts` — modify: `PatternRole`, `ColorSlot` with `accent`.
- `lib/builder/patterns.ts` — modify: `PatternColor`, `PatternDef.colors/svgPathBack`, catalog, helpers `findPattern`, `visibleColors`.
- `lib/builder/design-state.ts` — modify: `colors.accent`; defaults rule in the two pattern reducers.
- `lib/builder/design-history.ts` — modify: `sameDesign` compares `accent`.
- `components/builder/panels/ColorsPanel.tsx` — modify: dynamic rows.
- `components/builder/PatternGrid.tsx`, `components/builder/panels/DesignPanel.tsx` — modify: pass the full color map to thumbnails.
- `lib/builder/texture-compositor.ts`, `components/builder/JerseyModel.tsx` — modify: back pattern image.
- `public/patterns/*.svg` — create: 14 torso + 3 sleeve SVGs.
- `tests/lib/patterns.test.ts`, `tests/lib/design-state.test.ts`, `tests/lib/design-history.test.ts`, `tests/lib/texture-compositor.test.ts`, `tests/components/panels.test.tsx`, `tests/components/PatternGrid.test.tsx` — modify.

## SVG authoring reference (used by Tasks 6-9)

All SVGs use `viewBox="0 0 512 512"`. The front SVG is stretched over the front UV panel (about 690 x 926 px of the 2048 atlas), so it is stretched about 1.35x horizontally and 1.8x vertically on the garment. Measured on `public/models/gepe_shirt.obj` (front, centerline `|x| < 4`):

| Garment feature | SVG y (front) | SVG y (back, drawn as seen from behind) |
| --- | --- | --- |
| Hem | about 500 | about 470 |
| Waist (world y 220) | 347 | 318 |
| Armpit (world y 240) | 267 | 236 |
| Chest (world y 250) | 226 | 204 |
| Bottom of the front neckline | 150 | 119 |
| Top edge (collar / shoulder seam) | 0 | 0 |

Horizontally the garment's centerline is `x = 256`; at the chest, one world unit is about 5.2 SVG px, and the torso spans roughly `x = 80..435`. Make designs symmetric about `x = 256` unless the design is meant to be asymmetric.

Front: SVG left is the viewer's left. Back SVG (Task 5): drawn upright, as seen by someone looking at the back; its top is the neck. Task 5 confirms the orientation visually.

Sleeve SVGs: the cuff is at the right edge (`x` near 512); the right sleeve is mirrored by the compositor.

---

### Task 1: Roles and catalog schema

**Files:**
- Modify: `lib/builder/svg-recolor.ts:1-4`
- Modify: `lib/builder/patterns.ts` (whole file)
- Modify: `lib/builder/design-state.ts:25-27` (initial colors)
- Test: `tests/lib/patterns.test.ts`

**Interfaces:**
- Produces (used by every later task):
  - `type PatternRole = "primary" | "secondary" | "accent"` and `type ColorSlot = PatternRole | "collar"` (from `svg-recolor.ts`)
  - `type PatternColor = { role: PatternRole; label: string; default: string }`
  - `type PatternDef = { id: string; label: string; svgPath: string; svgPathBack?: string; colors: PatternColor[] }`
  - `BODY_PATTERNS`, `SLEEVE_PATTERNS: PatternDef[]`
  - `findPattern(id: string): PatternDef | undefined`
  - `visibleColors(bodyId: string, sleeveId: string): PatternColor[]` — unique by role; torso patterns' entries first, then sleeve-only roles; order within a pattern is its declared order.

- [ ] **Step 1: Write the failing tests**

Replace the whole content of `tests/lib/patterns.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  BODY_PATTERNS,
  SLEEVE_PATTERNS,
  findPattern,
  visibleColors,
} from "@/lib/builder/patterns";
import { initialDesignState } from "@/lib/builder/design-state";

const all = [...BODY_PATTERNS, ...SLEEVE_PATTERNS];
const ROLES = ["primary", "secondary", "accent"];

function slotsIn(markup: string): string[] {
  return [...markup.matchAll(/data-color-slot="([a-z]+)"/g)].map((m) => m[1]);
}

describe("pattern registry", () => {
  it("keeps the original six torso patterns first, in order, and the three sleeve patterns", () => {
    expect(BODY_PATTERNS.slice(0, 6).map((p) => p.label)).toEqual([
      "Liso",
      "Franjas",
      "Diagonal",
      "Degradado",
      "Geométrico",
      "Rayas",
    ]);
    expect(SLEEVE_PATTERNS.slice(0, 3).map((p) => p.id)).toEqual(["sleeve-plain", "sleeve-primary", "sleeve-cuff"]);
  });

  it("has unique ids and unique labels across body and sleeve lists", () => {
    const ids = all.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const bodyLabels = BODY_PATTERNS.map((p) => p.label);
    expect(new Set(bodyLabels).size).toBe(bodyLabels.length);
    const sleeveLabels = SLEEVE_PATTERNS.map((p) => p.label);
    expect(new Set(sleeveLabels).size).toBe(sleeveLabels.length);
  });

  it("keeps the ids existing designs already use", () => {
    expect(BODY_PATTERNS.map((p) => p.id)).toEqual(expect.arrayContaining(["stripes-v1", "plain-body"]));
    expect(SLEEVE_PATTERNS.map((p) => p.id)).toContain("sleeve-plain");
    expect(BODY_PATTERNS.some((p) => p.id === initialDesignState.bodyPatternId)).toBe(true);
    expect(SLEEVE_PATTERNS.some((p) => p.id === initialDesignState.sleevePatternId)).toBe(true);
  });

  it.each(all.map((p) => ({ id: p.id, pattern: p })))("$id declares valid colors", ({ pattern }) => {
    expect(pattern.colors.length).toBeGreaterThan(0);
    const roles = pattern.colors.map((c) => c.role);
    expect(new Set(roles).size).toBe(roles.length);
    for (const color of pattern.colors) {
      expect(ROLES).toContain(color.role);
      expect(color.label.trim()).not.toBe("");
      expect(color.default).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(all.map((p) => ({ id: p.id, pattern: p })))("$id has SVGs that exist and use exactly the declared roles", ({ pattern }) => {
    const files = [pattern.svgPath, ...(pattern.svgPathBack ? [pattern.svgPathBack] : [])];
    for (const svgPath of files) {
      const file = path.join(process.cwd(), "public", svgPath);
      expect(fs.existsSync(file)).toBe(true);
      const markup = fs.readFileSync(file, "utf8");
      expect(markup).toContain("<svg");
      const used = new Set(slotsIn(markup));
      const declared = new Set(pattern.colors.map((c) => c.role));
      for (const slot of used) expect(declared.has(slot as never)).toBe(true);
      for (const role of declared) expect(used.has(role)).toBe(true);
    }
  });

  it("migrated patterns keep today's labels and defaults", () => {
    const stripes = findPattern("stripes-v1")!;
    expect(stripes.colors).toEqual([
      { role: "primary", label: "Color primario", default: "#0a5c36" },
      { role: "secondary", label: "Color secundario", default: "#ffffff" },
    ]);
    expect(findPattern("plain-body")!.colors.map((c) => c.role)).toEqual(["primary"]);
    expect(findPattern("sleeve-plain")!.colors.map((c) => c.role)).toEqual(["secondary"]);
    expect(findPattern("sleeve-primary")!.colors.map((c) => c.role)).toEqual(["primary"]);
    expect(findPattern("sleeve-cuff")!.colors.map((c) => c.role)).toEqual(["primary", "secondary"]);
  });
});

describe("findPattern", () => {
  it("finds body and sleeve patterns and returns undefined for unknown ids", () => {
    expect(findPattern("hoops")?.label).toBe("Rayas");
    expect(findPattern("sleeve-cuff")?.label).toBe("Con puño");
    expect(findPattern("nope")).toBeUndefined();
  });
});

describe("visibleColors", () => {
  it("lists the torso's colors first, then roles only the sleeves use, without duplicates", () => {
    expect(visibleColors("plain-body", "sleeve-plain").map((c) => c.role)).toEqual(["primary", "secondary"]);
    expect(visibleColors("stripes-v1", "sleeve-cuff").map((c) => c.role)).toEqual(["primary", "secondary"]);
  });

  it("uses the torso's label when both patterns use the same role", () => {
    const both = visibleColors("stripes-v1", "sleeve-primary");
    expect(both.find((c) => c.role === "primary")!.label).toBe(findPattern("stripes-v1")!.colors[0].label);
  });

  it("returns an empty list for unknown ids", () => {
    expect(visibleColors("nope", "nope")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/patterns.test.ts`
Expected: FAIL (`findPattern is not a function`, missing `colors`).

- [ ] **Step 3: Implement**

In `lib/builder/svg-recolor.ts`, replace the first four lines (the comment, `ColorSlot`, `ColorMap`) with:

```ts
export type PatternRole = "primary" | "secondary" | "accent";
// "collar" is chosen independently of the patterns, which only reference the
// three pattern roles in their `data-color-slot` attributes.
export type ColorSlot = PatternRole | "collar";
export type ColorMap = Partial<Record<ColorSlot, string>>;
```

Replace the whole content of `lib/builder/patterns.ts` with:

```ts
import type { PatternRole } from "./svg-recolor";

export type PatternColor = {
  role: PatternRole;
  /** Name the user sees in the Colors panel for this role, in this design. */
  label: string;
  /** Color the role takes when this design makes the role visible. */
  default: string;
};

export type PatternDef = {
  id: string;
  /** Describes the design; never the name of a team. */
  label: string;
  /** Front panel (and back panel unless `svgPathBack` is set). */
  svgPath: string;
  /** Optional back panel, drawn as seen by someone looking at the back. */
  svgPathBack?: string;
  /** Roles the SVG uses, in the order they appear in the Colors panel. */
  colors: PatternColor[];
};

const PRIMARY: PatternColor = { role: "primary", label: "Color primario", default: "#0a5c36" };
const SECONDARY: PatternColor = { role: "secondary", label: "Color secundario", default: "#ffffff" };

export const BODY_PATTERNS: PatternDef[] = [
  { id: "plain-body", label: "Liso", svgPath: "/patterns/plain-body.svg", colors: [PRIMARY] },
  { id: "stripes-v1", label: "Franjas", svgPath: "/patterns/stripes-v1-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "diagonal", label: "Diagonal", svgPath: "/patterns/diagonal-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "gradient", label: "Degradado", svgPath: "/patterns/gradient-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "geometric", label: "Geométrico", svgPath: "/patterns/geometric-body.svg", colors: [PRIMARY, SECONDARY] },
  { id: "hoops", label: "Rayas", svgPath: "/patterns/hoops-body.svg", colors: [PRIMARY, SECONDARY] },
];

export const SLEEVE_PATTERNS: PatternDef[] = [
  { id: "sleeve-plain", label: "Color secundario", svgPath: "/patterns/sleeve-plain.svg", colors: [SECONDARY] },
  { id: "sleeve-primary", label: "Color primario", svgPath: "/patterns/sleeve-primary.svg", colors: [PRIMARY] },
  { id: "sleeve-cuff", label: "Con puño", svgPath: "/patterns/sleeve-cuff.svg", colors: [PRIMARY, SECONDARY] },
];

export function findPattern(id: string): PatternDef | undefined {
  return BODY_PATTERNS.find((p) => p.id === id) ?? SLEEVE_PATTERNS.find((p) => p.id === id);
}

/**
 * The colors the user can currently edit: those of the chosen torso pattern,
 * then any role only the chosen sleeve pattern uses. One entry per role; when
 * both patterns use a role, the torso's label wins.
 */
export function visibleColors(bodyId: string, sleeveId: string): PatternColor[] {
  const seen = new Set<PatternRole>();
  const result: PatternColor[] = [];
  for (const pattern of [findPattern(bodyId), findPattern(sleeveId)]) {
    for (const color of pattern?.colors ?? []) {
      if (seen.has(color.role)) continue;
      seen.add(color.role);
      result.push(color);
    }
  }
  return result;
}
```

In `lib/builder/design-state.ts`, change the initial colors line to:

```ts
  colors: { primary: "#0a5c36", secondary: "#ffffff", accent: "#f5b700", collar: "#ffffff" },
```

- [ ] **Step 4: Run the tests to verify they pass, then type-check**

Run: `npx vitest run tests/lib/patterns.test.ts && npx tsc --noEmit`
Expected: PASS and no type errors. If `tsc` flags `Record<ColorSlot, string>` users (e.g. a test building `colors` without `accent`), add `accent` there.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run`
Expected: PASS (the migrated panel test and design-state tests are unaffected).

- [ ] **Step 6: Commit** (only if the user asked for commits)

```bash
git add lib/builder/svg-recolor.ts lib/builder/patterns.ts lib/builder/design-state.ts tests/lib/patterns.test.ts
git commit -m "feat: add accent role and per-pattern color declarations"
```

---

### Task 2: Defaults on pattern change, accent in history

**Files:**
- Modify: `lib/builder/design-state.ts` (the two pattern cases)
- Modify: `lib/builder/design-history.ts` (`sameDesign`)
- Test: `tests/lib/design-state.test.ts`, `tests/lib/design-history.test.ts`

**Interfaces:**
- Consumes: `findPattern`, `visibleColors`, `PatternDef` (Task 1).
- Produces: reducer rule — on `SET_BODY_PATTERN` / `SET_SLEEVE_PATTERN` with a known id, every role the new pattern declares that is not in `visibleColors(currentBody, currentSleeve)` is set to that pattern's default; roles already visible keep their value. Unknown ids only change the id.

- [ ] **Step 1: Write the failing tests**

Append to `tests/lib/design-state.test.ts`, inside the `describe("designReducer", ...)` block (before its closing `});`). The rule tests that need an `accent` pattern register a temporary catalog entry (removed in `finally`), because the first real accent pattern arrives in Task 6:

```ts
  describe("colors on pattern change", () => {
    const withColors = (colors: Partial<typeof initialDesignState.colors>) => ({
      ...initialDesignState,
      colors: { ...initialDesignState.colors, ...colors },
    });

    async function withAccentPattern(run: () => void) {
      const patterns = await import("@/lib/builder/patterns");
      patterns.BODY_PATTERNS.push({
        id: "test-accent-body",
        label: "Test accent",
        svgPath: "/patterns/plain-body.svg",
        colors: [
          { role: "primary", label: "Fondo", default: "#000001" },
          { role: "accent", label: "Detalle", default: "#000002" },
        ],
      });
      try {
        run();
      } finally {
        patterns.BODY_PATTERNS.pop();
      }
    }

    it("keeps the colors of roles that are already in use", () => {
      const start = withColors({ primary: "#111111", secondary: "#222222" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "diagonal" });
      expect(next.colors.primary).toBe("#111111");
      expect(next.colors.secondary).toBe("#222222");
    });

    it("leaves roles the new pattern does not use alone", () => {
      const start = withColors({ accent: "#abcdef" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "plain-body" });
      expect(next.colors.accent).toBe("#abcdef");
    });

    it("never touches the collar color", () => {
      const start = withColors({ collar: "#123456" });
      const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "diagonal" });
      expect(next.colors.collar).toBe("#123456");
    });

    it("sets only the id when the pattern id is unknown", () => {
      const next = designReducer(initialDesignState, { type: "SET_BODY_PATTERN", id: "nope" });
      expect(next.bodyPatternId).toBe("nope");
      expect(next.colors).toEqual(initialDesignState.colors);
    });

    it("starts with the defaults of the initial patterns", () => {
      expect(initialDesignState.colors.primary).toBe("#0a5c36");
      expect(initialDesignState.colors.secondary).toBe("#ffffff");
    });

    it("gives a role that was not in use the new pattern's default, and keeps one that was", async () => {
      await withAccentPattern(() => {
        const start = withColors({ primary: "#111111", accent: "#abcdef" });
        const next = designReducer(start, { type: "SET_BODY_PATTERN", id: "test-accent-body" });
        expect(next.colors.primary).toBe("#111111"); // was in use: kept
        expect(next.colors.accent).toBe("#000002"); // was not in use: default
      });
    });

    it("loses an accent color set on a role that is no longer in use (Review Focus 1)", async () => {
      await withAccentPattern(() => {
        let s = designReducer(initialDesignState, { type: "SET_BODY_PATTERN", id: "test-accent-body" });
        s = designReducer(s, { type: "SET_COLOR", slot: "accent", value: "#ff0000" });
        s = designReducer(s, { type: "SET_BODY_PATTERN", id: "plain-body" }); // accent no longer in use
        s = designReducer(s, { type: "SET_BODY_PATTERN", id: "test-accent-body" }); // back again
        expect(s.colors.accent).toBe("#000002");
      });
    });
  });
```

Append to `tests/lib/design-history.test.ts`, inside the top-level `describe("historyReducer", ...)` block (before its closing `});`):

```ts
  it("records an accent color change as its own undo step", () => {
    const changed = run([{ type: "SET_COLOR", slot: "accent", value: "#654321", at: 10_000 }]);
    expect(changed.present.colors.accent).toBe("#654321");
    expect(changed.past).toHaveLength(1);
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.colors.accent).toBe(initialDesignState.colors.accent);
  });

  it("one undo restores the previous pattern and its colors (Review Focus 3)", async () => {
    const patterns = await import("@/lib/builder/patterns");
    patterns.BODY_PATTERNS.push({
      id: "test-accent-body",
      label: "Test accent",
      svgPath: "/patterns/plain-body.svg",
      colors: [
        { role: "primary", label: "Fondo", default: "#000001" },
        { role: "accent", label: "Detalle", default: "#000002" },
      ],
    });
    try {
      const changed = run([{ type: "SET_BODY_PATTERN", id: "test-accent-body" }]);
      expect(changed.present.colors.accent).toBe("#000002");
      const undone = historyReducer(changed, { type: "UNDO" });
      expect(undone.present.bodyPatternId).toBe(initialDesignState.bodyPatternId);
      expect(undone.present.colors.accent).toBe(initialDesignState.colors.accent);
    } finally {
      patterns.BODY_PATTERNS.pop();
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/lib/design-state.test.ts tests/lib/design-history.test.ts`
Expected: FAIL for: the accent history test (`sameDesign` ignores `accent`, so the change is dropped), "gives a role that was not in use the new pattern's default…", "loses an accent color…", and "one undo restores the previous pattern and its colors". The other tests in the block already pass because they describe behavior that needs no new rule.

- [ ] **Step 3: Implement**

In `lib/builder/design-state.ts`, add the import at the top:

```ts
import { findPattern, visibleColors } from "./patterns";
```

Add this helper above `designReducer`:

```ts
// Switching pattern: roles the new pattern uses that were not already visible
// take the pattern's defaults; roles already visible keep the user's choice.
function withPatternChange(state: DesignState, kind: "body" | "sleeve", id: string): DesignState {
  const next = kind === "body" ? { ...state, bodyPatternId: id } : { ...state, sleevePatternId: id };
  const pattern = findPattern(id);
  if (!pattern) return next;

  const inUse = new Set(visibleColors(state.bodyPatternId, state.sleevePatternId).map((c) => c.role));
  const colors = { ...state.colors };
  for (const color of pattern.colors) {
    if (!inUse.has(color.role)) colors[color.role] = color.default;
  }
  return { ...next, colors };
}
```

Replace the two cases with:

```ts
    case "SET_BODY_PATTERN":
      return withPatternChange(state, "body", action.id);
    case "SET_SLEEVE_PATTERN":
      return withPatternChange(state, "sleeve", action.id);
```

In `lib/builder/design-history.ts`, in `sameDesign`, add after the `secondary` comparison:

```ts
    a.colors.accent === b.colors.accent &&
```

(`collar` is already compared there.)

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/lib/design-state.test.ts tests/lib/design-history.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add lib/builder/design-state.ts lib/builder/design-history.ts tests/lib/design-state.test.ts tests/lib/design-history.test.ts
git commit -m "feat: apply pattern color defaults on pattern change"
```

---

### Task 3: Colors panel driven by the chosen patterns

**Files:**
- Modify: `components/builder/panels/ColorsPanel.tsx`
- Test: `tests/components/panels.test.tsx` (the `ColorsPanel` describe block)

**Interfaces:**
- Consumes: `visibleColors` (Task 1), `useDesign` (state, dispatch).
- Produces: the panel renders one row per `visibleColors(...)` entry (label from the pattern) followed by "Color del cuello". Row inputs keep `aria-label` equal to the visible label.

- [ ] **Step 1: Write the failing tests**

In `tests/components/panels.test.tsx`, replace the whole `describe("ColorsPanel", ...)` block with:

```tsx
describe("ColorsPanel", () => {
  it("updates primary and secondary colors", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    fireEvent.change(screen.getByLabelText("Color primario"), { target: { value: "#ff0000" } });
    fireEvent.change(screen.getByLabelText("Color secundario"), { target: { value: "#00ff00" } });
    expect(api.current!.state.colors.primary).toBe("#ff0000");
    expect(api.current!.state.colors.secondary).toBe("#00ff00");
  });

  it("updates the collar color on its own, leaving the pattern colors alone", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    const before = { ...api.current!.state.colors };
    fireEvent.change(screen.getByLabelText("Color del cuello"), { target: { value: "#0000ff" } });
    expect(api.current!.state.colors).toEqual({ ...before, collar: "#0000ff" });
  });

  it("shows only the colors the chosen patterns use, plus the collar", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    // initial: stripes-v1 + sleeve-plain -> primary, secondary
    expect(screen.queryByLabelText("Color primario")).not.toBeNull();
    expect(screen.queryByLabelText("Color secundario")).not.toBeNull();
    expect(screen.queryByLabelText("Color del cuello")).not.toBeNull();

    act(() => api.current!.dispatch({ type: "SET_BODY_PATTERN", id: "plain-body" }));
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-primary" }));
    // plain-body + sleeve-primary -> primary only
    expect(screen.queryByLabelText("Color primario")).not.toBeNull();
    expect(screen.queryByLabelText("Color secundario")).toBeNull();
    expect(screen.queryByLabelText("Color del cuello")).not.toBeNull();
  });

  it("does not duplicate a role used by both the torso and the sleeves (Review Focus 2)", () => {
    const { api } = renderWithDesign(<ColorsPanel />);
    act(() => api.current!.dispatch({ type: "SET_SLEEVE_PATTERN", id: "sleeve-cuff" }));
    expect(screen.getAllByLabelText("Color primario")).toHaveLength(1);
    expect(screen.getAllByLabelText("Color secundario")).toHaveLength(1);
  });
});
```

Add `act` to the import at the top of the file: `import { act, fireEvent, screen, waitFor } from "@testing-library/react";`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/components/panels.test.tsx -t "ColorsPanel"`
Expected: the "only the colors the chosen patterns use" test FAILs (secondary is still shown with `plain-body` + `sleeve-primary`).

- [ ] **Step 3: Implement**

Replace the whole content of `components/builder/panels/ColorsPanel.tsx` with:

```tsx
"use client";
import { useDesign } from "@/lib/builder/design-context";
import { visibleColors } from "@/lib/builder/patterns";
import type { ColorSlot } from "@/lib/builder/svg-recolor";
import { PanelShell } from "./PanelShell";

export function ColorsPanel() {
  const { state, dispatch } = useDesign();
  const rows: { slot: ColorSlot; label: string }[] = [
    ...visibleColors(state.bodyPatternId, state.sleevePatternId).map((c) => ({ slot: c.role, label: c.label })),
    { slot: "collar", label: "Color del cuello" },
  ];

  return (
    <PanelShell title="Colores" hint="Los colores dependen del diseño elegido.">
      <div className="flex flex-col gap-3">
        {rows.map(({ slot, label }) => (
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

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/components/panels.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add components/builder/panels/ColorsPanel.tsx tests/components/panels.test.tsx
git commit -m "feat: show only the colors the chosen patterns use"
```

---

### Task 4: Thumbnails use the full color map

**Files:**
- Modify: `components/builder/PatternGrid.tsx`
- Modify: `components/builder/panels/DesignPanel.tsx`
- Test: `tests/components/PatternGrid.test.tsx`

**Interfaces:**
- Consumes: `PatternDef` (Task 1; now requires `colors`), `ColorMap` (`svg-recolor.ts`).
- Produces: `PatternGrid` props `{ patterns: PatternDef[]; selectedId: string; colors: ColorMap; onSelect: (id: string) => void }` — replaces `primary` and `secondary`.

- [ ] **Step 1: Update the tests first**

In `tests/components/PatternGrid.test.tsx`: give the fixture patterns a `colors` array and switch the props.

Replace the `patterns` constant with:

```ts
const COLORS = [{ role: "primary" as const, label: "Color primario", default: "#000000" }];
const patterns = [
  { id: "a", label: "Liso", svgPath: "/patterns/a.svg", colors: COLORS },
  { id: "b", label: "Franjas", svgPath: "/patterns/b.svg", colors: COLORS },
];
```

Replace each `primary="#111111" secondary="#eeeeee"` with `colors={{ primary: "#111111", secondary: "#eeeeee", accent: "#cccccc", collar: "#ffffff" }}` (two occurrences).

Add this test inside the `describe`:

```tsx
  it("recolors the thumbnails with the accent color too", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect data-color-slot="accent" fill="#000"/></svg>`;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => svg })));
    const { container } = render(
      <PatternGrid
        patterns={patterns}
        selectedId="a"
        colors={{ primary: "#111111", secondary: "#eeeeee", accent: "#ff00aa", collar: "#ffffff" }}
        onSelect={() => {}}
      />
    );
    await waitFor(() => expect(container.querySelectorAll('[data-thumb="loaded"]')).toHaveLength(2));
    const style = (container.querySelector('[data-thumb="loaded"]') as HTMLElement).style.backgroundImage;
    expect(decodeURIComponent(style)).toContain("#ff00aa");
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/components/PatternGrid.test.tsx`
Expected: FAIL (type errors / the accent test cannot recolor because `PatternGrid` only forwards primary and secondary).

- [ ] **Step 3: Implement**

In `components/builder/PatternGrid.tsx`:

Replace everything from the imports down to (and including) the whole `PatternThumb` function with:

```tsx
"use client";
import { useEffect, useState } from "react";
import type { PatternDef } from "@/lib/builder/patterns";
import type { ColorMap } from "@/lib/builder/svg-recolor";
import { patternThumbnailUrl } from "@/lib/builder/pattern-thumbnail";
import { CheckIcon } from "./icons";

type ThumbProps = { svgPath: string; colors: ColorMap };

function PatternThumb({ svgPath, colors }: ThumbProps) {
  const { primary, secondary, accent } = colors;
  const key = `${svgPath}|${primary}|${secondary}|${accent}`;
  const [result, setResult] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    patternThumbnailUrl(svgPath, { primary, secondary, accent })
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
  }, [key, svgPath, primary, secondary, accent]);

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
```

Replace the `Props` type and the signature with:

```tsx
type Props = {
  patterns: PatternDef[];
  selectedId: string;
  colors: ColorMap;
  onSelect: (id: string) => void;
};

export function PatternGrid({ patterns, selectedId, colors, onSelect }: Props) {
```

Replace the thumb usage with `<PatternThumb svgPath={pattern.svgPath} colors={colors} />`.

In `components/builder/panels/DesignPanel.tsx`, replace the two lines `primary={state.colors.primary}` / `secondary={state.colors.secondary}` with `colors={state.colors}`.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/components && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit** (only if the user asked for commits)

```bash
git add components/builder/PatternGrid.tsx components/builder/panels/DesignPanel.tsx tests/components/PatternGrid.test.tsx
git commit -m "feat: recolor pattern thumbnails with every role"
```

---

### Task 5: Optional back-of-shirt SVG

**Files:**
- Modify: `lib/builder/texture-compositor.ts`
- Modify: `components/builder/JerseyModel.tsx`
- Test: `tests/lib/texture-compositor.test.ts`

**Interfaces:**
- Consumes: `PatternDef.svgPathBack` (Task 1).
- Produces: `CompositorImages.bodyBackPatternImage?: HTMLImageElement | null` — when present it is drawn (rotated 180° as today) in `regions.bodyBack` instead of `bodyPatternImage`; when absent or null, `bodyPatternImage` is used.

- [ ] **Step 1: Write the failing tests**

Append inside `describe("drawDesignToCanvas", ...)` in `tests/lib/texture-compositor.test.ts`:

```ts
  it("draws the dedicated back image in the back region when one is given", () => {
    const ctx = createMockCtx();
    const front = { id: "front" } as unknown as HTMLImageElement;
    const back = { id: "back" } as unknown as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: front, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: back },
      regions
    );
    const used = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(used).toEqual([front, back]);
  });

  it("falls back to the front image for the back when the back image is missing (Review Focus 4)", () => {
    const ctx = createMockCtx();
    const front = { id: "front" } as unknown as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: front, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: null },
      regions
    );
    const used = (ctx.drawImage as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(used).toEqual([front, front]);
  });

  it("still rotates the back image 180 degrees", () => {
    const ctx = createMockCtx();
    const back = {} as HTMLImageElement;
    drawDesignToCanvas(
      ctx,
      1024,
      initialDesignState,
      { bodyPatternImage: {} as HTMLImageElement, sleevePatternImage: null, logoImage: null, bodyBackPatternImage: back },
      regions
    );
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/lib/texture-compositor.test.ts`
Expected: the first test FAILs (`used` is `[front, front]`).

- [ ] **Step 3: Implement the compositor change**

In `lib/builder/texture-compositor.ts`, in `CompositorImages`, add after `bodyPatternImage`:

```ts
  /** Optional dedicated back panel; the front image is used when this is null/absent. */
  bodyBackPatternImage?: HTMLImageElement | null;
```

Replace the back-region draw call with:

```ts
    drawImageInRegion(
      ctx,
      images.bodyBackPatternImage ?? images.bodyPatternImage,
      regions.bodyBack,
      canvasSize,
      "rotate180"
    );
```

- [ ] **Step 4: Run the compositor tests**

Run: `npx vitest run tests/lib/texture-compositor.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Load the back SVG in `JerseyModel`**

In `components/builder/JerseyModel.tsx`:

Extend the `PatternImages` type:

```ts
type PatternImages = {
  bodyPatternImage: HTMLImageElement | null;
  bodyBackPatternImage: HTMLImageElement | null;
  sleevePatternImage: HTMLImageElement | null;
  collarMaskImage: HTMLCanvasElement | null;
};
```

Add `bodyBackPatternImage: null,` to the initial `useState<PatternImages>({...})` value (between `bodyPatternImage` and `sleevePatternImage`).

Replace the `Promise.all` block and the `setPatternImages` call in the debounced pattern effect with:

```ts
        const [bodyPatternImage, bodyBackPatternImage, sleevePatternImage, collarMaskImage] = await Promise.all([
          bodyPattern ? loadPatternImage(bodyPattern.svgPath, state.colors) : Promise.resolve(null),
          // A broken back SVG must not break the shirt: fall back to the front image.
          bodyPattern?.svgPathBack
            ? loadPatternImage(bodyPattern.svgPathBack, state.colors).catch((err) => {
                console.error("Failed to load back pattern image", err);
                return null;
              })
            : Promise.resolve(null),
          sleevePattern ? loadPatternImage(sleevePattern.svgPath, state.colors) : Promise.resolve(null),
          JERSEY_MODEL.collarMaskUrl
            ? loadTintedMask(JERSEY_MODEL.collarMaskUrl, state.colors.collar)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        setPatternImages({ bodyPatternImage, bodyBackPatternImage, sleevePatternImage, collarMaskImage });
```

In the draw effect, add `bodyBackPatternImage: patternImages.bodyBackPatternImage,` after `bodyPatternImage: patternImages.bodyPatternImage,`.

`BODY_PATTERNS.find` / `SLEEVE_PATTERNS.find` in that effect stay as they are.

- [ ] **Step 6: Type-check and run all tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors, PASS.

- [ ] **Step 7: Confirm the back orientation visually (one-off, not committed)**

The spec leaves one question open: is a back SVG drawn upright, as seen from behind? Verify with an asymmetric test pattern.

1. Create `public/patterns/_test-back.svg` (delete it at the end of this step):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="0" width="140" height="140" />
  <rect data-color-slot="secondary" fill="#ffffff" x="0" y="372" width="512" height="40" />
</svg>
```

   The white square marks the SVG's top-left; the white bar is near the bottom (hem).
2. Temporarily set `svgPathBack: "/patterns/_test-back.svg"` on the `stripes-v1` entry in `lib/builder/patterns.ts`.
3. With the dev server running (`npx next dev`, default port 3000, or reuse the one already running), open the app, choose "Franjas", click "Espalda", and look at the back of the shirt.
4. Expected if the orientation is as the spec says: seen from behind, the white square is at the **top-left** (the viewer's left shoulder side, near the neck) and the bar is near the **hem**. If the square is at the bottom-right instead, the SVG is rotated 180 degrees: in that case remove the `"rotate180"` argument from the back `drawImageInRegion` call **and** change `fillTextRotated180`'s usage accordingly, then re-run the compositor tests (the "still rotates the back image 180 degrees" test is then replaced by one asserting no rotation for the back image), and note the result in the "SVG authoring reference" section above.
5. Revert the `stripes-v1` entry and delete `public/patterns/_test-back.svg`.

- [ ] **Step 8: Commit** (only if the user asked for commits)

```bash
git add lib/builder/texture-compositor.ts components/builder/JerseyModel.tsx tests/lib/texture-compositor.test.ts
git commit -m "feat: support an optional dedicated back pattern"
```

---

### Task 6: Torso designs, family A — vertical stripes (7 designs)

**Files:**
- Create: `public/patterns/stripes-wide-body.svg`, `stripes-fine-body.svg`, `pinstripes-body.svg`, `five-bands-body.svg`, `stripes-irregular-body.svg`, `stripes-three-body.svg`, `stripes-three-wide-body.svg`
- Modify: `lib/builder/patterns.ts` (append to `BODY_PATTERNS`)

**Interfaces:**
- Consumes: `PatternDef` / `PatternColor` (Task 1). The catalog test from Task 1 checks that every file exists and that its `data-color-slot` set equals the declared roles.

- [ ] **Step 1: Create the SVGs**

`public/patterns/stripes-wide-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#d71920" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="73" y="0" width="73" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="219" y="0" width="74" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="366" y="0" width="73" height="512" />
</svg>
```

`public/patterns/stripes-fine-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#e2231a" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="47" y="0" width="46" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="140" y="0" width="46" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="233" y="0" width="46" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="326" y="0" width="46" height="512" />
  <rect data-color-slot="secondary" fill="#ffffff" x="419" y="0" width="46" height="512" />
</svg>
```

`public/patterns/pinstripes-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#d22a1f" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="28" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="84" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="140" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="196" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="252" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="308" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="364" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="420" y="0" width="8" height="512" />
  <rect data-color-slot="secondary" fill="#f2b705" x="476" y="0" width="8" height="512" />
</svg>
```

`public/patterns/five-bands-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#e8202a" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#1d3fa8" x="70" y="0" width="110" height="512" />
  <rect data-color-slot="secondary" fill="#1d3fa8" x="332" y="0" width="110" height="512" />
</svg>
```

`public/patterns/stripes-irregular-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#ffffff" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="40" y="0" width="70" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="150" y="0" width="30" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="215" y="0" width="25" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="272" y="0" width="25" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="332" y="0" width="30" height="512" />
  <rect data-color-slot="secondary" fill="#111111" x="402" y="0" width="70" height="512" />
</svg>
```

`public/patterns/stripes-three-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#1b4f9c" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#a50044" x="57" y="0" width="57" height="512" />
  <rect data-color-slot="secondary" fill="#a50044" x="171" y="0" width="57" height="512" />
  <rect data-color-slot="secondary" fill="#a50044" x="284" y="0" width="57" height="512" />
  <rect data-color-slot="secondary" fill="#a50044" x="398" y="0" width="57" height="512" />
  <rect data-color-slot="accent" fill="#0b1d4a" x="25" y="0" width="6" height="512" />
  <rect data-color-slot="accent" fill="#0b1d4a" x="139" y="0" width="6" height="512" />
  <rect data-color-slot="accent" fill="#0b1d4a" x="253" y="0" width="6" height="512" />
  <rect data-color-slot="accent" fill="#0b1d4a" x="367" y="0" width="6" height="512" />
  <rect data-color-slot="accent" fill="#0b1d4a" x="481" y="0" width="6" height="512" />
</svg>
```

`public/patterns/stripes-three-wide-body.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#ffffff" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#75aadb" x="60" y="0" width="70" height="512" />
  <rect data-color-slot="secondary" fill="#75aadb" x="221" y="0" width="70" height="512" />
  <rect data-color-slot="secondary" fill="#75aadb" x="382" y="0" width="70" height="512" />
</svg>
```

- [ ] **Step 2: Declare them in the catalog**

In `lib/builder/patterns.ts`, add this helper under the `SECONDARY` constant:

```ts
const accent = (label: string, def: string): PatternColor => ({ role: "accent", label, default: def });
const primary = (label: string, def: string): PatternColor => ({ role: "primary", label, default: def });
const secondary = (label: string, def: string): PatternColor => ({ role: "secondary", label, default: def });
```

Append these entries to `BODY_PATTERNS` (after `hoops`):

```ts
  {
    id: "stripes-wide",
    label: "Franjas anchas",
    svgPath: "/patterns/stripes-wide-body.svg",
    colors: [primary("Fondo", "#d71920"), secondary("Franjas", "#111111")],
  },
  {
    id: "stripes-fine",
    label: "Franjas finas",
    svgPath: "/patterns/stripes-fine-body.svg",
    colors: [primary("Franjas principales", "#e2231a"), secondary("Franjas claras", "#ffffff")],
  },
  {
    id: "pinstripes",
    label: "Rayas finas",
    svgPath: "/patterns/pinstripes-body.svg",
    colors: [primary("Fondo", "#d22a1f"), secondary("Rayas", "#f2b705")],
  },
  {
    id: "five-bands",
    label: "Cinco bandas",
    svgPath: "/patterns/five-bands-body.svg",
    colors: [primary("Bandas exteriores y central", "#e8202a"), secondary("Bandas intermedias", "#1d3fa8")],
  },
  {
    id: "stripes-irregular",
    label: "Franjas irregulares",
    svgPath: "/patterns/stripes-irregular-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Franjas", "#111111")],
  },
  {
    id: "stripes-three",
    label: "Franjas en tres colores",
    svgPath: "/patterns/stripes-three-body.svg",
    colors: [primary("Franja principal", "#1b4f9c"), secondary("Franja alterna", "#a50044"), accent("Línea fina", "#0b1d4a")],
  },
  {
    id: "stripes-three-wide",
    label: "Tres franjas anchas",
    svgPath: "/patterns/stripes-three-wide-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Franjas", "#75aadb")],
  },
```

- [ ] **Step 3: Run the catalog tests**

Run: `npx vitest run tests/lib/patterns.test.ts && npx tsc --noEmit`
Expected: PASS (files exist; declared roles equal used roles; labels unique).

- [ ] **Step 4: Look at each design on the model**

Start (or reuse) the dev server and open the app. For each of the seven designs: select it in "Torso", look at the front and the back (Frente / Espalda), and compare against its reference shirt (Milan, Atlético Madrid, España, San Lorenzo, Juventus, Barcelona, Argentina in `C:\Users\FERNANDO\Downloads\patrones`). Check: stripes are straight and symmetric about the shirt's center; no stripe is cut by the neck in a way that looks wrong; the default colors read as the reference's colors. Adjust rect `x`/`width` values in the SVG (not the catalog) until it looks right, re-running Step 3.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit** (only if the user asked for commits)

```bash
git add public/patterns lib/builder/patterns.ts
git commit -m "feat: add vertical stripe designs"
```

---

### Task 7: Torso designs, family B — bands, sash, crossbar, halves (4 designs)

**Files:**
- Create: `public/patterns/band-horizontal-body.svg`, `sash-diagonal-body.svg`, `stripes-crossbar-body.svg`, `split-center-body.svg`
- Modify: `lib/builder/patterns.ts` (append to `BODY_PATTERNS`)

**Interfaces:**
- Consumes: the `primary` / `secondary` / `accent` helpers added in Task 6.

- [ ] **Step 1: Create the SVGs**

`public/patterns/band-horizontal-body.svg` (band across the chest, between armpit and belly; thin borders):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#1d3fa8" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#f6c700" x="0" y="250" width="512" height="110" />
  <rect data-color-slot="accent" fill="#0f2a6b" x="0" y="242" width="512" height="8" />
  <rect data-color-slot="accent" fill="#0f2a6b" x="0" y="360" width="512" height="8" />
</svg>
```

`public/patterns/sash-diagonal-body.svg` (from the viewer's left shoulder to the right hip):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#ffffff" x="0" y="0" width="512" height="512" />
  <polygon data-color-slot="secondary" fill="#d0161f" points="40,110 160,110 512,462 512,512 410,512 40,140" />
</svg>
```

`public/patterns/stripes-crossbar-body.svg` (two wide stripes joined by a bar at the chest):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#1a2a55" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#f2c200" x="100" y="0" width="90" height="512" />
  <rect data-color-slot="secondary" fill="#f2c200" x="322" y="0" width="90" height="512" />
  <rect data-color-slot="secondary" fill="#f2c200" x="190" y="240" width="132" height="90" />
</svg>
```

`public/patterns/split-center-body.svg` (two halves with a center band):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#d2171e" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="secondary" fill="#0d8a3a" x="256" y="0" width="256" height="512" />
  <rect data-color-slot="accent" fill="#ffffff" x="226" y="0" width="60" height="512" />
</svg>
```

- [ ] **Step 2: Declare them in the catalog**

Append to `BODY_PATTERNS`:

```ts
  {
    id: "band-horizontal",
    label: "Banda horizontal",
    svgPath: "/patterns/band-horizontal-body.svg",
    colors: [primary("Fondo", "#1d3fa8"), secondary("Banda", "#f6c700"), accent("Bordes de la banda", "#0f2a6b")],
  },
  {
    id: "sash-diagonal",
    label: "Banda diagonal",
    svgPath: "/patterns/sash-diagonal-body.svg",
    colors: [primary("Fondo", "#ffffff"), secondary("Banda", "#d0161f")],
  },
  {
    id: "stripes-crossbar",
    label: "Franjas con barra",
    svgPath: "/patterns/stripes-crossbar-body.svg",
    colors: [primary("Fondo", "#1a2a55"), secondary("Franjas y barra", "#f2c200")],
  },
  {
    id: "split-center",
    label: "Mitades con franja",
    svgPath: "/patterns/split-center-body.svg",
    colors: [primary("Mitad izquierda", "#d2171e"), secondary("Mitad derecha", "#0d8a3a"), accent("Franja central", "#ffffff")],
  },
```

- [ ] **Step 3: Run the catalog tests**

Run: `npx vitest run tests/lib/patterns.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Look at each design on the model**

For each design check front and back against its reference (Boca/Roma, River, the first shirt of `camiseta 1.webp`, `camiseta 4.webp`). Specific things to check:
- "Banda horizontal": the band sits between chest and belly, not on the shoulders.
- "Banda diagonal": the sash runs from the viewer's **left** shoulder to the **right** hip on the front; on the back it should still look like a sash (if it looks wrong, give it its own `svgPathBack`: same polygon mirrored with `points="472,110 352,110 0,462 0,512 102,512 472,140"` and add `svgPathBack: "/patterns/sash-diagonal-back.svg"` to the entry; then Task 1's catalog test checks it).
- "Franjas con barra": the bar is at chest height, readable below the neck.
- "Mitades con franja": the center band is centered on the chest.

Adjust coordinates in the SVG until it looks right, re-running Step 3.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit** (only if the user asked for commits)

```bash
git add public/patterns lib/builder/patterns.ts
git commit -m "feat: add band, sash, crossbar and split designs"
```

---

### Task 8: Torso designs, family C — shoulders, chevron, waves (3 designs)

**Files:**
- Create: `public/patterns/yoke-body.svg`, `chevron-body.svg`, `waves-body.svg` (the last generated by a script)
- Modify: `lib/builder/patterns.ts` (append to `BODY_PATTERNS`)

- [ ] **Step 1: Create the SVGs**

`public/patterns/yoke-body.svg` (colored shoulders; the same file serves front and back):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#e8590c" x="0" y="0" width="512" height="512" />
  <polygon data-color-slot="secondary" fill="#1a3a8f" points="0,0 512,0 512,200 420,170 330,138 182,138 92,170 0,200" />
</svg>
```

`public/patterns/chevron-body.svg` (a yoke above chevron bands pointing down at the center):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#c8102e" x="0" y="0" width="512" height="512" />
  <polygon data-color-slot="secondary" fill="#1b2a6b" points="0,0 512,0 512,175 256,315 0,175" />
  <polygon data-color-slot="accent" fill="#ffffff" points="0,175 256,315 512,175 512,225 256,365 0,225" />
  <polygon data-color-slot="secondary" fill="#1b2a6b" points="0,250 256,390 512,250 512,262 256,402 0,262" />
  <polygon data-color-slot="secondary" fill="#1b2a6b" points="0,285 256,425 512,285 512,297 256,437 0,297" />
</svg>
```

`waves-body.svg` is generated so its 12 wave bands stay exact. Run once from the repo root (Python is installed; this is an authoring step, nothing in the app runs it):

```bash
python - <<'EOF'
rows = []
for y in range(150, 462, 26):
    rows.append(
        f'  <path data-color-slot="secondary" fill="#9fb4ff" fill-opacity="0.55" '
        f'd="M0 {y} Q128 {y-22} 256 {y} T512 {y} V{y+6} Q384 {y+28} 256 {y+6} T0 {y+6} Z" />'
    )
svg = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n'
    '  <rect data-color-slot="primary" fill="#1b2a8f" x="0" y="0" width="512" height="512" />\n'
    + "\n".join(rows)
    + "\n</svg>\n"
)
open("public/patterns/waves-body.svg", "w", encoding="utf8").write(svg)
print(svg.count("<path"), "wave bands written")
EOF
```

Expected output: `12 wave bands written`.

- [ ] **Step 2: Declare them in the catalog**

Append to `BODY_PATTERNS`:

```ts
  {
    id: "yoke",
    label: "Hombros de color",
    svgPath: "/patterns/yoke-body.svg",
    colors: [primary("Cuerpo", "#e8590c"), secondary("Hombros", "#1a3a8f")],
  },
  {
    id: "chevron",
    label: "Chevrón",
    svgPath: "/patterns/chevron-body.svg",
    colors: [primary("Cuerpo", "#c8102e"), secondary("Hombros y líneas", "#1b2a6b"), accent("Chevrón principal", "#ffffff")],
  },
  {
    id: "waves",
    label: "Líneas onduladas",
    svgPath: "/patterns/waves-body.svg",
    colors: [primary("Fondo", "#1b2a8f"), secondary("Líneas", "#9fb4ff")],
  },
```

- [ ] **Step 3: Run the catalog tests**

Run: `npx vitest run tests/lib/patterns.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Look at each design on the model**

Check front and back against `camiseta 2.webp`, `camiseta 3.webp`, `japon.jfif`:
- "Hombros de color": the colored area covers the shoulders and upper chest without leaving a visible stripe of the other color at the neck; the back looks right too (same file).
- "Chevrón": the V points down at the center of the chest; the navy part reads as shoulders; if the chevron looks flattened by the texture stretch, increase its depth in the SVG (move the `315`, `365`, `390`, `425` apex values down by 20-40).
- "Líneas onduladas": the waves are visible but not noisy; if too faint or too strong change `fill-opacity` in the generator and re-run it.

Adjust the SVG (or the generator) until it looks right, re-running Step 3.

- [ ] **Step 5: Run the whole suite**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Check the pattern list scrolls (Review Focus 5)**

The torso list now has 20 patterns. Open the app at desktop width (about 1400x1000) and at mobile width (about 390x800), pick the "Torso" tab and scroll the pattern list. Expected: every pattern, including the last, can be reached by scrolling inside the panel, and the page itself does not need to scroll. If the last patterns are cut off, make the panel body scroll: in `components/builder/panels/PanelShell.tsx` give the content container `overflow-y-auto` and a bounded height (`min-h-0 flex-1` inside a flex column), then run `npx vitest run tests/components` (the existing panel tests must still pass).

- [ ] **Step 7: Commit** (only if the user asked for commits)

```bash
git add public/patterns lib/builder/patterns.ts
git commit -m "feat: add shoulders, chevron and wave designs"
```

---

### Task 9: Sleeve designs (3)

**Files:**
- Create: `public/patterns/sleeve-accent.svg`, `sleeve-cuff-accent.svg`, `sleeve-cuff-stripes.svg`
- Modify: `lib/builder/patterns.ts` (append to `SLEEVE_PATTERNS`)
- Test: `tests/components/panels.test.tsx` (one test)

- [ ] **Step 1: Write the failing test**

Append inside `describe("DesignPanel", ...)` in `tests/components/panels.test.tsx`:

```tsx
  it("offers the sleeve designs that use the accent color", async () => {
    const { api } = renderWithDesign(<DesignPanel />);
    fireEvent.click(screen.getByRole("tab", { name: "Mangas" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mangas de otro color" }));
    expect(api.current!.state.sleevePatternId).toBe("sleeve-accent");
    await waitFor(() => expect(document.querySelector('[data-thumb="loaded"]')).not.toBeNull());
  });
```

Run: `npx vitest run tests/components/panels.test.tsx -t "accent color"`
Expected: FAIL (no radio with that name).

- [ ] **Step 2: Create the SVGs**

`public/patterns/sleeve-accent.svg` (whole sleeve in the accent color):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="accent" fill="#1a2a55" x="0" y="0" width="512" height="512" />
</svg>
```

`public/patterns/sleeve-cuff-accent.svg` (primary sleeve, accent cuff):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#0a5c36" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="accent" fill="#1a2a55" x="400" y="0" width="112" height="512" />
</svg>
```

`public/patterns/sleeve-cuff-stripes.svg` (primary sleeve, three thin accent stripes near the cuff):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect data-color-slot="primary" fill="#ffffff" x="0" y="0" width="512" height="512" />
  <rect data-color-slot="accent" fill="#d0161f" x="352" y="0" width="32" height="512" />
  <rect data-color-slot="accent" fill="#d0161f" x="416" y="0" width="32" height="512" />
  <rect data-color-slot="accent" fill="#d0161f" x="480" y="0" width="32" height="512" />
</svg>
```

- [ ] **Step 3: Declare them in the catalog**

Append to `SLEEVE_PATTERNS`:

```ts
  {
    id: "sleeve-accent",
    label: "Mangas de otro color",
    svgPath: "/patterns/sleeve-accent.svg",
    colors: [accent("Color de las mangas", "#1a2a55")],
  },
  {
    id: "sleeve-cuff-accent",
    label: "Puño de otro color",
    svgPath: "/patterns/sleeve-cuff-accent.svg",
    colors: [primary("Color primario", "#0a5c36"), accent("Color del puño", "#1a2a55")],
  },
  {
    id: "sleeve-cuff-stripes",
    label: "Puño a rayas",
    svgPath: "/patterns/sleeve-cuff-stripes.svg",
    colors: [primary("Color de las mangas", "#ffffff"), accent("Rayas del puño", "#d0161f")],
  },
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS (the new DesignPanel test passes; the catalog test passes for all three new files).

- [ ] **Step 5: Look at them on the model**

For each sleeve design, select it in "Mangas" together with a torso design that uses the accent (e.g. "Hombros de color") and check both sleeves, left and right: the cuff is at the sleeve opening on both sides and the right sleeve looks like the left (the compositor mirrors it). Compare with Arsenal / España (accent sleeves), River (striped cuffs), Racing (accent cuff).

- [ ] **Step 6: Commit** (only if the user asked for commits)

```bash
git add public/patterns lib/builder/patterns.ts tests/components/panels.test.tsx
git commit -m "feat: add sleeve designs that use the accent color"
```

---

## Self-Review

**Spec coverage**
- Third role `accent` → Task 1. Per-pattern declared colors with label/default → Task 1. Panel shows only used roles + collar → Task 3. Defaults-on-change and keep-in-use rule → Task 2. Optional back SVG + compositor + loader failure fallback → Task 5. Migration of the 6 + 3 existing patterns → Task 1 (test "migrated patterns keep today's labels and defaults"). Thumbnails with all roles → Task 4. History compares `accent` → Task 2. New designs: 14 torso (Tasks 6-8) + 3 sleeve (Task 9), generic names, no marks → Global Constraints + labels. The spec's open question (back SVG orientation) → Task 5 Step 7.
- Spec items intentionally not built: a fourth color; saving/sharing (out of scope per spec).
- Designs from the reference photos not in this batch (documented, for a later pass): tonal motif shirts (Arsenal's and Manchester City's repeated motifs), Brasil's side panels (covered by "Liso" plus collar color), and Bayern's tonal pinstripe (covered by "Rayas finas" with two close colors).

**Type consistency:** `PatternRole`, `ColorSlot`, `PatternColor`, `PatternDef`, `findPattern`, `visibleColors` are defined in Task 1 and used with those exact names in Tasks 2-9. `PatternGrid` props `{ patterns, selectedId, colors, onSelect }` are defined in Task 4 and used by `DesignPanel` in the same task. `bodyBackPatternImage` is spelled the same in the compositor (Task 5, Step 3), `PatternImages` (Step 5) and the tests (Step 1). The helpers `primary`/`secondary`/`accent` are defined once in Task 6 Step 2 and reused in Tasks 7-9.

**Placeholders:** none; every code step contains the code, every SVG is complete, the wave generator is a script with its expected output.
