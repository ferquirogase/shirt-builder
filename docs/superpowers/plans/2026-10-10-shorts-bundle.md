# Conjunto camiseta + pantalón Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un equipo pueda comprar solo la camiseta o el conjunto (camiseta + pantalón), con el pantalón tomando el color primario o secundario de la camiseta.

**Architecture:** La elección vive en `DesignState.shorts` (`included` + `colorSource`), así que el visor, el deshacer y el guardado del pedido la reciben sin cambios extra. Cada línea del roster suma `shortsSize`; `orderTotals` suma el precio del pantalón cuando el diseño lo incluye. El visor dibuja un `ShortsModel` (provisorio hasta tener el OBJ real) y recalibra el encuadre.

**Tech Stack:** Next.js (App Router, versión con cambios: ver `AGENTS.md`), React 19, three.js + react-three-fiber, Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-10-shorts-bundle-design.md`

## Global Constraints

- Texto de la interfaz en castellano rioplatense, igual que el resto (ej. "Solo camiseta", "Conjunto", "Pantalón").
- La elección es **para todo el pedido**, no por jugador.
- Un talle de pantalón por línea del roster, independiente del talle de la camiseta (`shortsSize`, por defecto `"M"`).
- `colorSource` es `"primary"` o `"secondary"`; cualquier otro valor se ignora. El color del pantalón se calcula de `colors[colorSource]`, nunca se copia.
- Los pedidos guardados antes de este cambio (sin `design.shorts` ni `shortsSize`) se siguen leyendo.
- `PRICE_PER_SHORTS` es un precio de ejemplo (como `PRICE_PER_SHIRT`); el descuento por cantidad sigue contando jugadores y se aplica sobre todo el subtotal.
- Contrato del modelo real: mismo sistema de coordenadas y escala que la camiseta (OBJ en cientos, grupo escalado `0.01`), borde superior de la cintura justo debajo del borde inferior de la camiseta (y ≈ 167).
- Después de cada tarea: `npm test`, `npx tsc --noEmit` y `npm run lint` en verde. Antes del PR, también `npm run build`.
- No encadenar `git commit` después de un test con `;`: usar `&&`.
- Commits terminan con `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Rama: `feat/shorts-bundle` (ya creada desde `origin/main`).

## Review Focus

1. **Deshacer el cambio a conjunto:** `sameDesign` de `design-history.ts` debe comparar `shorts`; si no, alternar Solo camiseta/Conjunto se descarta como "sin cambios" y no se puede deshacer (Tarea 1).
2. **Pedido guardado antes de este cambio:** el checkout no debe romper con un `Order` sin `design.shorts` ni `shortsSize` (Tarea 2).
3. **Alternar y volver:** pasar a Solo camiseta y de nuevo a Conjunto conserva los talles de pantalón cargados (Tarea 2 y 5).
4. **Solo camiseta no cobra pantalón** aunque las líneas tengan `shortsSize` (Tarea 3).
5. **Descuento con conjunto:** con 10 jugadores en conjunto, el 10% se aplica sobre camisetas + pantalones (Tarea 3).

---

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `lib/builder/state/design-state.ts` | Modificar | Tipo `ShortsConfig`, acciones, `shortsColor` |
| `lib/builder/state/design-history.ts` | Modificar | `sameDesign` compara `shorts` |
| `lib/checkout/order.ts` | Modificar | `PlayerLine.shortsSize`, `Confirmation.shorts` |
| `lib/checkout/order-storage.ts` | Modificar | Leer pedidos viejos, validar `shortsSize` y `shorts` |
| `lib/checkout/pricing.ts` | Modificar | `PRICE_PER_SHORTS`, `Totals.shorts`, `orderTotals(roster, withShorts)` |
| `lib/checkout/payment.ts` | Modificar | Confirmación con pantalones |
| `components/builder/icons.tsx` | Modificar | `ShortsIcon` |
| `components/builder/SectionNav.tsx` | Modificar | Sexta sección "Pantalón" |
| `components/builder/panels/ShortsPanel.tsx` | Crear | Selector Solo camiseta / Conjunto y color |
| `components/builder/BuilderPage.tsx` | Modificar | Muestra `ShortsPanel` |
| `components/checkout/RosterTable.tsx` | Modificar | Columna de talle de pantalón |
| `components/checkout/CheckoutView.tsx` | Modificar | Pasa `withShorts`, textos |
| `components/checkout/OrderSummary.tsx` | Modificar | Fila "Pantalones" |
| `components/checkout/ConfirmationPage.tsx` | Modificar | Talle de pantalón en el detalle |
| `lib/builder/geometry/jersey-model.ts` | Modificar | `JERSEY_CENTER_Y` |
| `lib/builder/geometry/shorts-model.ts` | Crear | `SHORTS_MODEL` y medidas del provisorio |
| `lib/builder/geometry/set-framing.ts` | Crear | `framingFor(includeShorts)` |
| `components/builder/viewer/ShortsModel.tsx` | Crear | Pantalón en el visor |
| `components/builder/viewer/Viewer3D.tsx` | Modificar | Monta el pantalón y aplica el encuadre |

---

### Task 1: Estado del diseño — `shorts`

**Files:**
- Modify: `lib/builder/state/design-state.ts`
- Modify: `lib/builder/state/design-history.ts` (función `sameDesign`)
- Test: `tests/lib/state/design-state.test.ts`, `tests/lib/state/design-history.test.ts`

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces:
  - `type ShortsColorSource = "primary" | "secondary"`
  - `type ShortsConfig = { included: boolean; colorSource: ShortsColorSource }`
  - `DesignState.shorts: ShortsConfig`; `initialDesignState.shorts = { included: false, colorSource: "primary" }`
  - Acciones `{ type: "SET_SHORTS_INCLUDED"; value: boolean }` y `{ type: "SET_SHORTS_COLOR_SOURCE"; value: ShortsColorSource }`
  - `shortsColor(state: Pick<DesignState, "colors" | "shorts">): string`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar al final de `tests/lib/state/design-state.test.ts` (y sumar `shortsColor` al import de `@/lib/builder/state/design-state`):

```ts
describe("shorts", () => {
  it("starts as shirt only, with the primary color", () => {
    expect(initialDesignState.shorts).toEqual({ included: false, colorSource: "primary" });
  });

  it("includes and drops the shorts", () => {
    const set = designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true });
    expect(set.shorts.included).toBe(true);
    expect(designReducer(set, { type: "SET_SHORTS_INCLUDED", value: false }).shorts.included).toBe(false);
  });

  it("picks the secondary color and keeps the rest of the shorts config", () => {
    const set = designReducer(
      designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true }),
      { type: "SET_SHORTS_COLOR_SOURCE", value: "secondary" }
    );
    expect(set.shorts).toEqual({ included: true, colorSource: "secondary" });
  });

  it("ignores a color source that is not primary or secondary", () => {
    const next = designReducer(initialDesignState, { type: "SET_SHORTS_COLOR_SOURCE", value: "accent" as never });
    expect(next).toBe(initialDesignState);
  });

  it("does not mutate the previous state", () => {
    designReducer(initialDesignState, { type: "SET_SHORTS_INCLUDED", value: true });
    expect(initialDesignState.shorts.included).toBe(false);
  });
});

describe("shortsColor", () => {
  it("follows the shirt's primary or secondary color", () => {
    const base = { ...initialDesignState, colors: { ...initialDesignState.colors, primary: "#112233", secondary: "#aabbcc" } };
    expect(shortsColor({ ...base, shorts: { included: true, colorSource: "primary" } })).toBe("#112233");
    expect(shortsColor({ ...base, shorts: { included: true, colorSource: "secondary" } })).toBe("#aabbcc");
  });

  it("changes when the shirt's color changes", () => {
    const next = designReducer(initialDesignState, { type: "SET_COLOR", slot: "primary", value: "#ff0000" });
    expect(shortsColor(next)).toBe("#ff0000");
  });
});
```

Agregar dentro del `describe("historyReducer", ...)` de `tests/lib/state/design-history.test.ts` (antes de su llave de cierre):

```ts
  it("records including the shorts as an undoable step", () => {
    const changed = run([{ type: "SET_SHORTS_INCLUDED", value: true }]);
    expect(changed.present.shorts.included).toBe(true);
    expect(changed.past).toHaveLength(1);
    const undone = historyReducer(changed, { type: "UNDO" });
    expect(undone.present.shorts.included).toBe(false);
  });

  it("records switching the shorts color source as an undoable step", () => {
    const changed = run([
      { type: "SET_SHORTS_INCLUDED", value: true },
      { type: "SET_SHORTS_COLOR_SOURCE", value: "secondary" },
    ]);
    expect(changed.past).toHaveLength(2);
    expect(historyReducer(changed, { type: "UNDO" }).present.shorts.colorSource).toBe("primary");
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/lib/state/design-state.test.ts tests/lib/state/design-history.test.ts`
Expected: FAIL (`shorts` no existe en el estado inicial; `shortsColor` no está exportado).

- [ ] **Step 3: Implementar**

En `lib/builder/state/design-state.ts`, antes de `export type DesignState`:

```ts
export type ShortsColorSource = "primary" | "secondary";
export type ShortsConfig = { included: boolean; colorSource: ShortsColorSource };
const SHORTS_COLOR_SOURCES: readonly ShortsColorSource[] = ["primary", "secondary"];
```

Dentro de `DesignState`, después de `projectName: string;`:

```ts
  shorts: ShortsConfig;
```

En `DesignAction`, antes de `| { type: "SET_PROJECT_NAME"; value: string };` agregar (y mover el `;` final):

```ts
  | { type: "SET_SHORTS_INCLUDED"; value: boolean }
  | { type: "SET_SHORTS_COLOR_SOURCE"; value: ShortsColorSource }
```

En `initialDesignState`, después de `projectName: "Mi diseño",`:

```ts
  shorts: { included: false, colorSource: "primary" },
```

Después de `initialDesignState` agregar:

```ts
// The shorts have no color of their own: they wear one of the shirt's.
export function shortsColor(state: Pick<DesignState, "colors" | "shorts">): string {
  return state.colors[state.shorts.colorSource];
}
```

En `designReducer`, antes de `default:`:

```ts
    case "SET_SHORTS_INCLUDED":
      return state.shorts.included === action.value
        ? state
        : { ...state, shorts: { ...state.shorts, included: action.value } };
    case "SET_SHORTS_COLOR_SOURCE":
      return SHORTS_COLOR_SOURCES.includes(action.value)
        ? { ...state, shorts: { ...state.shorts, colorSource: action.value } }
        : state;
```

En `lib/builder/state/design-history.ts`, dentro de `sameDesign`, antes de `a.projectName === b.projectName`:

```ts
    a.shorts.included === b.shorts.included &&
    a.shorts.colorSource === b.shorts.colorSource &&
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/lib/state/`
Expected: PASS. Luego `npx tsc --noEmit`: va a marcar errores donde se arman `DesignState` a mano; corregirlos agregando `shorts` (buscar con `npx tsc --noEmit` y arreglar solo lo que marque).

- [ ] **Step 5: Commit**

```bash
git add lib/builder/state tests/lib/state && git commit -m "feat: the design keeps whether the shorts are included and which shirt color they wear

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Línea del roster y pedidos guardados

**Files:**
- Modify: `lib/checkout/order.ts`
- Modify: `lib/checkout/order-storage.ts`
- Test: `tests/lib/checkout/order.test.ts`, `tests/lib/checkout/order-storage.test.ts`

**Interfaces:**
- Consumes: `initialDesignState` (Tarea 1).
- Produces:
  - `PlayerLine = { id; name; number; size: Size; shortsSize: Size }`
  - `createPlayerLine(id, patch)` incluye `shortsSize: "M"`
  - `UPDATE_PLAYER` acepta `patch.shortsSize` (valida contra `SIZES`)
  - `loadOrder()` devuelve siempre un `Order` con `design.shorts` y `shortsSize` en cada línea (los pedidos viejos se completan).

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/lib/checkout/order.test.ts`, cambiar la expectativa del primer test a:

```ts
    expect(next.roster[1]).toEqual({ id: "b", name: "", number: "", size: "M", shortsSize: "M" });
```

y agregar dentro del `describe("orderReducer", ...)`:

```ts
  it("updates the shorts size on its own, without touching the shirt size", () => {
    const order = orderWith(createPlayerLine("a", { size: "S" }));
    const next = orderReducer(order, { type: "UPDATE_PLAYER", id: "a", patch: { shortsSize: "XL" } });
    expect(next.roster[0]).toMatchObject({ size: "S", shortsSize: "XL" });
  });

  it("ignores a shorts size that does not exist", () => {
    const order = orderWith(createPlayerLine("a"));
    const next = orderReducer(order, { type: "UPDATE_PLAYER", id: "a", patch: { shortsSize: "XXXL" as never } });
    expect(next.roster[0].shortsSize).toBe("M");
  });
```

En `tests/lib/checkout/order-storage.test.ts`, agregar `shorts: 0,` a la constante `confirmation` (después de `shirts: 2,`) y dentro del `describe("order storage", ...)`:

```ts
  it("reads an order saved before the shorts existed, filling in the defaults", () => {
    const old = makeOrder();
    const { shorts: _shorts, ...oldDesign } = old.design;
    const oldLine = { id: "a", name: "Leo", number: "10", size: "L" };
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ...old, design: oldDesign, roster: [oldLine] }));
    const loaded = loadOrder()!;
    expect(loaded.design.shorts).toEqual({ included: false, colorSource: "primary" });
    expect(loaded.roster[0]).toEqual({ ...oldLine, shortsSize: "M" });
  });

  it("rejects an order whose shorts size is not a real size", () => {
    const order = makeOrder();
    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ ...order, roster: [{ ...order.roster[0], shortsSize: "XXXL" }] })
    );
    expect(loadOrder()).toBeNull();
  });
```

(Si ESLint se queja de `_shorts` sin usar, usar `const oldDesign: Record<string, unknown> = { ...old.design }; delete oldDesign.shorts;`.)

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/lib/checkout/order.test.ts tests/lib/checkout/order-storage.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar `order.ts`**

- `PlayerLine`: `export type PlayerLine = { id: string; name: string; number: string; size: Size; shortsSize: Size };`
- `createPlayerLine`: `return { id, name: "", number: "", size: "M", shortsSize: "M", ...patch };`
- En `cleanPatch`, después del `if` de `size`:

```ts
  if (patch.shortsSize !== undefined && (SIZES as readonly string[]).includes(patch.shortsSize)) {
    clean.shortsSize = patch.shortsSize;
  }
```

- En `Confirmation`, después de `shirts: number;`: `shorts: number;`

- [ ] **Step 4: Implementar `order-storage.ts`**

Importar `initialDesignState`:

```ts
import { initialDesignState } from "@/lib/builder/state/design-state";
```

Reemplazar `isPlayerLine` por:

```ts
function isSize(value: unknown): boolean {
  return typeof value === "string" && (SIZES as readonly string[]).includes(value);
}

function isPlayerLine(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.number === "string" &&
    isSize(value.size) &&
    // Orders saved before the shorts existed have no shorts size.
    (value.shortsSize === undefined || isSize(value.shortsSize))
  );
}
```

En `isConfirmation`, después de `typeof value.shirts === "number" &&` agregar `typeof value.shorts === "number" &&`.

Agregar, después de `isConfirmation`:

```ts
// Orders saved before the shorts existed lack their fields: fill in the defaults.
function withShortsDefaults(order: Order): Order {
  return {
    ...order,
    design: {
      ...initialDesignState,
      ...order.design,
      shorts: { ...initialDesignState.shorts, ...order.design.shorts },
    },
    roster: order.roster.map((line) => ({ ...line, shortsSize: line.shortsSize ?? "M" })),
  };
}
```

Cambiar `createSlot` para aceptar una función de normalización opcional:

```ts
function createSlot<T>(key: string, isValid: (value: unknown) => value is T, normalize: (value: T) => T = (v) => v) {
```

y en `load()`: `return isValid(parsed) ? normalize(parsed) : null;`

Y crear el slot con: `const orderSlot = createSlot(ORDER_KEY, isOrder, withShortsDefaults);`

- [ ] **Step 5: Ver que pasan, arreglar lo que rompa**

Run: `npx vitest run tests/lib/checkout/` y `npx tsc --noEmit`.
Expected: los tests de esta tarea pasan. Pueden fallar tests de otras carpetas que arman `Confirmation` o `PlayerLine` a mano (falta `shorts`): se arreglan en la Tarea 3 (payment/pricing) o agregando el campo en el test; no tocar nada más.

- [ ] **Step 6: Commit**

```bash
git add lib/checkout tests/lib/checkout && git commit -m "feat: every player has a shorts size, and orders saved before still load

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Precio y confirmación

**Files:**
- Modify: `lib/checkout/pricing.ts`
- Modify: `lib/checkout/payment.ts`
- Test: `tests/lib/checkout/pricing.test.ts`, `tests/lib/checkout/payment.test.ts`

**Interfaces:**
- Consumes: `Order.design.shorts.included` (Tarea 1), `Confirmation.shorts` (Tarea 2).
- Produces:
  - `PRICE_PER_SHORTS: number`
  - `Totals = { shirts; shorts; subtotal; discountRate; discount; total }`
  - `orderTotals(roster: readonly PlayerLine[], withShorts = false): Totals`

- [ ] **Step 1: Escribir los tests que fallan**

En `tests/lib/checkout/pricing.test.ts`: importar `PRICE_PER_SHORTS`, cambiar la expectativa del primer test para incluir `shorts: 0,` después de `shirts: 1,`, y agregar dentro de `describe("orderTotals", ...)`:

```ts
  it("charges no shorts when the order is shirt only, whatever the shorts sizes say", () => {
    const totals = orderTotals(players(3), false);
    expect(totals.shorts).toBe(0);
    expect(totals.subtotal).toBe(3 * PRICE_PER_SHIRT);
  });

  it("adds a pair of shorts per player for a full kit", () => {
    const totals = orderTotals(players(3), true);
    expect(totals.shirts).toBe(3);
    expect(totals.shorts).toBe(3);
    expect(totals.subtotal).toBe(3 * (PRICE_PER_SHIRT + PRICE_PER_SHORTS));
    expect(totals.total).toBe(totals.subtotal);
  });

  it("applies the quantity discount to shirts and shorts together", () => {
    const totals = orderTotals(players(10), true);
    const subtotal = 10 * (PRICE_PER_SHIRT + PRICE_PER_SHORTS);
    expect(totals.discountRate).toBe(0.1);
    expect(totals.discount).toBe(subtotal * 0.1);
    expect(totals.total).toBe(subtotal - subtotal * 0.1);
  });
```

En `tests/lib/checkout/payment.test.ts`, agregar (dentro del `describe` de `payWithRipple`, siguiendo cómo ya se invoca allí con `wait` falso; si no hay uno, crear `describe("payWithRipple shorts", ...)`):

```ts
describe("payWithRipple shorts", () => {
  const wait = vi.fn(async () => {});

  it("confirms no shorts for a shirt-only order", async () => {
    const confirmation = await payWithRipple(order, contact, wait);
    expect(confirmation.shorts).toBe(0);
    expect(confirmation.total).toBe(orderTotals(order.roster).total);
  });

  it("confirms the shorts and charges them for a full kit", async () => {
    const kit: Order = { ...order, design: { ...order.design, shorts: { included: true, colorSource: "primary" } } };
    const confirmation = await payWithRipple(kit, contact, wait);
    expect(confirmation.shorts).toBe(2);
    expect(confirmation.total).toBe(orderTotals(kit.roster, true).total);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/lib/checkout/pricing.test.ts tests/lib/checkout/payment.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`lib/checkout/pricing.ts`:

```ts
export const PRICE_PER_SHORTS = 20;
```
(debajo de `PRICE_PER_SHIRT`), `Totals` suma `shorts: number;` después de `shirts: number;`, y la función queda:

```ts
export function orderTotals(roster: readonly PlayerLine[], withShorts = false): Totals {
  // One line is one shirt, and one pair of shorts when the order is a full kit.
  const shirts = roster.length;
  const shorts = withShorts ? roster.length : 0;
  const subtotal = cents(shirts * PRICE_PER_SHIRT + shorts * PRICE_PER_SHORTS);
  const discountRate = DISCOUNT_TIERS.find((tier) => shirts >= tier.minShirts)?.rate ?? 0;
  const discount = cents(subtotal * discountRate);
  return { shirts, shorts, subtotal, discountRate, discount, total: cents(subtotal - discount) };
}
```

`lib/checkout/payment.ts`:

```ts
  const totals = orderTotals(order.roster, order.design.shorts.included);
  return {
    number: orderNumber(),
    email: contact.email.trim(),
    projectName: order.design.projectName,
    shirts: totals.shirts,
    shorts: totals.shorts,
    total: totals.total,
    roster: order.roster,
  };
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/lib/checkout/` y `npx tsc --noEmit`.
Expected: PASS. Si tests de componentes arman `Totals`/`Confirmation` a mano, agregarles `shorts: 0`.

- [ ] **Step 5: Commit**

```bash
git add lib/checkout tests/lib/checkout && git commit -m "feat: a full kit adds the shorts to the price and the confirmation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Sección "Pantalón" en el builder

**Files:**
- Modify: `components/builder/icons.tsx`, `components/builder/SectionNav.tsx`, `components/builder/BuilderPage.tsx`
- Create: `components/builder/panels/ShortsPanel.tsx`
- Test: `tests/components/SectionNav.test.tsx`, `tests/components/panels.test.tsx`

**Interfaces:**
- Consumes: acciones `SET_SHORTS_INCLUDED` / `SET_SHORTS_COLOR_SOURCE` y `shortsColor` (Tarea 1).
- Produces: `SectionId` incluye `"pantalon"`; `ShortsPanel` (sin props).

- [ ] **Step 1: Escribir los tests que fallan**

`tests/components/SectionNav.test.tsx`: cambiar el título del primer test a "renders the six sections…", sumar `"Pantalón"` a la lista de nombres (`["Diseño", "Colores", "Escudo", "Sponsor", "Nombre y número", "Pantalón"]`) y agregar:

```ts
  it("reports the shorts section", () => {
    const onChange = vi.fn();
    render(<SectionNav active="diseno" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Pantalón" }));
    expect(onChange).toHaveBeenCalledWith("pantalon");
  });
```

`tests/components/panels.test.tsx`: importar `ShortsPanel` (`@/components/builder/panels/ShortsPanel`) y agregar al final:

```tsx
describe("ShortsPanel", () => {
  it("starts as shirt only, without the color choice", () => {
    renderWithDesign(<ShortsPanel />);
    expect(screen.getByRole("radio", { name: "Solo camiseta" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Conjunto" })).not.toBeChecked();
    expect(screen.queryByRole("radio", { name: /Primario/ })).toBeNull();
  });

  it("switches to the full kit and shows the color choice", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Conjunto" }));
    expect(api.current!.state.shorts.included).toBe(true);
    expect(screen.getByRole("radio", { name: /Primario/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Secundario/ })).not.toBeChecked();
  });

  it("picks the secondary color for the shorts", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Conjunto" }));
    fireEvent.click(screen.getByRole("radio", { name: /Secundario/ }));
    expect(api.current!.state.shorts.colorSource).toBe("secondary");
    expect(screen.getByRole("radio", { name: /Secundario/ })).toBeChecked();
  });

  it("shows each option with the shirt's current color", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Conjunto" }));
    act(() => api.current!.dispatch({ type: "SET_COLOR", slot: "secondary", value: "#123456" }));
    const swatch = screen.getByRole("radio", { name: /Secundario/ }).querySelector("[data-swatch]") as HTMLElement;
    expect(swatch.style.backgroundColor).toBe("rgb(18, 52, 86)");
  });

  it("goes back to shirt only", () => {
    const { api } = renderWithDesign(<ShortsPanel />);
    fireEvent.click(screen.getByRole("radio", { name: "Conjunto" }));
    fireEvent.click(screen.getByRole("radio", { name: "Solo camiseta" }));
    expect(api.current!.state.shorts.included).toBe(false);
    expect(screen.queryByRole("radio", { name: /Primario/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/components/SectionNav.test.tsx tests/components/panels.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`components/builder/icons.tsx` (junto a los demás íconos):

```tsx
export const ShortsIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4h14l1.5 16h-6.2L12 11.5 9.7 20H3.5L5 4z" /></Svg>
);
```

`components/builder/SectionNav.tsx`: importar `ShortsIcon`, agregar `"pantalon"` a `SectionId` y, al final de `SECTIONS`:

```ts
  { id: "pantalon", label: "Pantalón", shortLabel: "Pantalón", Icon: ShortsIcon },
```

`components/builder/BuilderPage.tsx`: importar `ShortsPanel` y en el `switch` de `SectionPanel`:

```tsx
    case "pantalon":
      return <ShortsPanel />;
```

`components/builder/panels/ShortsPanel.tsx`:

```tsx
"use client";
import { useDesign } from "@/lib/builder/state/design-context";
import type { ShortsColorSource } from "@/lib/builder/state/design-state";
import { PanelShell } from "./PanelShell";

const KIT_OPTIONS = [
  { included: false, label: "Solo camiseta" },
  { included: true, label: "Conjunto" },
] as const;

const COLOR_OPTIONS: { source: ShortsColorSource; label: string }[] = [
  { source: "primary", label: "Primario" },
  { source: "secondary", label: "Secundario" },
];

const OPTION = "flex items-center gap-3 rounded-2xl border-2 bg-white/70 p-3 text-left text-sm font-medium";

export function ShortsPanel() {
  const { state, dispatch } = useDesign();
  const { included, colorSource } = state.shorts;

  return (
    <PanelShell title="Pantalón" hint="El pantalón toma uno de los colores de la camiseta.">
      <div role="radiogroup" aria-label="Qué comprar" className="flex flex-col gap-3">
        {KIT_OPTIONS.map((option) => {
          const checked = included === option.included;
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => dispatch({ type: "SET_SHORTS_INCLUDED", value: option.included })}
              className={`${OPTION} ${checked ? "border-foreground" : "border-transparent hover:border-line"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {included && (
        <div role="radiogroup" aria-label="Color del pantalón" className="mt-5 flex flex-col gap-3">
          <p className="text-sm font-semibold">Color del pantalón</p>
          {COLOR_OPTIONS.map((option) => {
            const checked = colorSource === option.source;
            return (
              <button
                key={option.source}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => dispatch({ type: "SET_SHORTS_COLOR_SOURCE", value: option.source })}
                className={`${OPTION} ${checked ? "border-foreground" : "border-transparent hover:border-line"}`}
              >
                <span
                  data-swatch
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: state.colors[option.source] }}
                />
                <span className="flex flex-col">
                  {option.label}
                  <span className="font-mono text-xs uppercase text-muted">{state.colors[option.source]}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}
```

Nota: `toBeChecked()` de jest-dom funciona con `role="radio"` + `aria-checked`.

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/components/SectionNav.test.tsx tests/components/panels.test.tsx tests/components/BuilderPage.test.tsx`
Expected: PASS. Si `BuilderPage.test.tsx` cuenta pestañas, actualizar el número.

- [ ] **Step 5: Commit**

```bash
git add components/builder tests/components && git commit -m "feat: a Pantalon section to choose shirt only or the full kit, and the shorts color

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Checkout — talle de pantalón, resumen y confirmación

**Files:**
- Modify: `components/checkout/RosterTable.tsx`, `components/checkout/CheckoutView.tsx`, `components/checkout/OrderSummary.tsx`, `components/checkout/ConfirmationPage.tsx`
- Test: `tests/components/checkout/RosterTable.test.tsx`, `tests/components/checkout/panels.test.tsx`, `tests/components/checkout/CheckoutView.test.tsx`, `tests/components/checkout/ConfirmationPage.test.tsx`

**Interfaces:**
- Consumes: `PlayerLine.shortsSize` (Tarea 2), `Totals.shorts` y `orderTotals(roster, withShorts)` (Tarea 3), `Confirmation.shorts`.
- Produces: `RosterTable` recibe `withShorts: boolean`.

- [ ] **Step 1: Escribir los tests que fallan**

Mirar primero cómo cada archivo de test arma el `render` (props, `roster`) y seguir ese estilo.

`RosterTable.test.tsx` (agregar `withShorts={false}` a los `render` existentes y nuevos tests):

```tsx
  it("has no shorts size column for a shirt-only order", () => {
    render(<RosterTable roster={[createPlayerLine("a")]} errors={{}} dispatch={() => {}} withShorts={false} />);
    expect(screen.queryByLabelText("Talle del pantalón del jugador 1")).toBeNull();
  });

  it("lets each player pick a shorts size apart from the shirt size", () => {
    const dispatch = vi.fn();
    render(<RosterTable roster={[createPlayerLine("a")]} errors={{}} dispatch={dispatch} withShorts />);
    fireEvent.change(screen.getByLabelText("Talle del pantalón del jugador 1"), { target: { value: "L" } });
    expect(dispatch).toHaveBeenCalledWith({ type: "UPDATE_PLAYER", id: "a", patch: { shortsSize: "L" } });
  });
```

`panels.test.tsx` (checkout): agregar a las pruebas de `OrderSummary`:

```tsx
  it("shows the shorts row only for a full kit", () => {
    const { rerender } = render(<OrderSummary totals={orderTotals(roster)} paying={false} />);
    expect(screen.queryByText("Pantalones")).toBeNull();
    rerender(<OrderSummary totals={orderTotals(roster, true)} paying={false} />);
    expect(screen.getByText("Pantalones").nextSibling).toHaveTextContent(String(roster.length));
  });
```

`CheckoutView.test.tsx`: agregar un test que renderice con un `initial` cuyo diseño tenga `shorts: { included: true, colorSource: "primary" }` y verifique que aparece `Talle del pantalón del jugador 1`, y otro con `included: false` que verifique que no. Y un test que alterne: con conjunto, cambiar el talle del pantalón a `"XL"` y comprobar que el `<select>` lo muestra.

`ConfirmationPage.test.tsx`: con una confirmación con `shorts: 2` y líneas con `shortsSize: "L"`, esperar el texto `Pantalón L`; con `shorts: 0`, no esperarlo.

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/components/checkout/`
Expected: FAIL.

- [ ] **Step 3: Implementar `RosterTable.tsx`**

Reemplazar la constante `COLUMNS` por dos (las clases deben ir completas para que Tailwind las detecte):

```ts
const COLUMNS = "grid-cols-[minmax(0,1fr)_3rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_2.5rem]";
const COLUMNS_WITH_SHORTS =
  "grid-cols-[minmax(0,1fr)_3rem_3.75rem_3.75rem_2.25rem] md:grid-cols-[minmax(0,1fr)_5rem_5.5rem_6.5rem_2.5rem]";
```

Agregar `withShorts: boolean` a `Props` y a `RowProps`; pasar `withShorts` desde `RosterTable` a `PlayerRow`. En `PlayerRow` usar `` `grid ${withShorts ? COLUMNS_WITH_SHORTS : COLUMNS} …` `` y, justo después del `<select>` del talle de la camiseta:

```tsx
      {withShorts && (
        <select
          aria-label={`Talle del pantalón del jugador ${n}`}
          value={line.shortsSize}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_PLAYER",
              id: line.id,
              patch: { shortsSize: e.target.value as PlayerLine["shortsSize"] },
            })
          }
          className={`${INPUT_CLASS} border-line max-md:px-1`}
        >
          {SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      )}
```

En el encabezado de columnas (visible solo en escritorio): usar `COLUMNS_WITH_SHORTS`/`COLUMNS` según `withShorts` y, tras `<span>Talle</span>`: `{withShorts && <span>Talle pantalón</span>}`.

En `RosterTable` la firma pasa a `({ roster, errors, dispatch, withShorts })`.

- [ ] **Step 4: Implementar el resto**

`CheckoutView.tsx`:
- `const withShorts = order.design.shorts.included;`
- `const totals = orderTotals(order.roster, withShorts);`
- `<RosterTable roster={order.roster} errors={shown.players} dispatch={dispatch} withShorts={withShorts} />`
- Texto del plantel: `{withShorts ? "Cada fila es una camiseta y un pantalón con este diseño. Agregá un jugador por cada integrante." : "Cada fila es una camiseta con este diseño. Agregá un jugador por cada integrante."}`
- Barra móvil: `<p className="text-xs text-muted">{totals.shirts} camisetas{totals.shorts > 0 && ` · ${totals.shorts} pantalones`}</p>`

`OrderSummary.tsx`: después de la fila "Camisetas":

```tsx
        {totals.shorts > 0 && (
          <div className="flex justify-between">
            <dt>Pantalones</dt>
            <dd className="tabular-nums">{totals.shorts}</dd>
          </div>
        )}
```

`ConfirmationPage.tsx`: en cada fila del detalle reemplazar el texto por

```tsx
                  N° {line.number} · {line.size}
                  {confirmation.shorts > 0 && ` · Pantalón ${line.shortsSize}`}
```

- [ ] **Step 5: Ver que pasan**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`.
Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
git add components/checkout tests/components && git commit -m "feat: the checkout takes a shorts size per player and shows the shorts in the summary

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Pantalón en el visor (provisorio) y encuadre

**Files:**
- Modify: `lib/builder/geometry/jersey-model.ts`, `components/builder/viewer/Viewer3D.tsx`
- Create: `lib/builder/geometry/shorts-model.ts`, `lib/builder/geometry/set-framing.ts`, `components/builder/viewer/ShortsModel.tsx`
- Test: `tests/lib/geometry/jersey-model.test.ts`, `tests/lib/geometry/set-framing.test.ts`

**Interfaces:**
- Consumes: `shortsColor`, `DesignState.shorts` (Tarea 1); `useDesign()` (ya existe).
- Produces:
  - `JERSEY_CENTER_Y: number` (el centro vertical de la camiseta, en unidades del OBJ)
  - `SHORTS_MODEL` (config del pantalón; `url: null` mientras sea provisorio)
  - `framingFor(includeShorts: boolean): { lift: number; floorY: number }`
  - `<ShortsModel />` (sin props, lee el diseño del contexto)

- [ ] **Step 1: Escribir los tests que fallan**

`tests/lib/geometry/jersey-model.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";

// JerseyModel centers the shirt by the middle of its vertical extent; the
// shorts are placed with this constant, so it must match the real OBJ.
describe("JERSEY_CENTER_Y", () => {
  it("is the middle of the shirt OBJ's vertical extent", () => {
    const ys = readFileSync("public/models/gepe_shirt.obj", "utf8")
      .split("\n")
      .filter((line) => line.startsWith("v "))
      .map((line) => Number(line.split(/\s+/)[2]));
    const center = (Math.min(...ys) + Math.max(...ys)) / 2;
    expect(JERSEY_CENTER_Y).toBeCloseTo(center, 1);
  });
});
```

`tests/lib/geometry/set-framing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { framingFor } from "@/lib/builder/geometry/set-framing";

describe("framingFor", () => {
  it("leaves the shirt where it was when there are no shorts", () => {
    expect(framingFor(false)).toEqual({ lift: 0, floorY: -0.6 });
  });

  it("raises the set and lowers the floor to fit the shorts", () => {
    const withShorts = framingFor(true);
    expect(withShorts.lift).toBeGreaterThan(0);
    expect(withShorts.floorY).toBeLessThan(-0.6);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `npx vitest run tests/lib/geometry/jersey-model.test.ts tests/lib/geometry/set-framing.test.ts`
Expected: FAIL (módulos/exports inexistentes).

- [ ] **Step 3: Implementar la parte pura**

`lib/builder/geometry/jersey-model.ts`, al final:

```ts
// Middle of the shirt OBJ's vertical extent (y 167.17 .. 294.91). JerseyModel
// re-centres the shirt on this; the shorts use the same offset so the two stay
// aligned. A test checks it against the OBJ.
export const JERSEY_CENTER_Y = 231.04;
```

`lib/builder/geometry/shorts-model.ts`:

```ts
// Everything is in the shirt OBJ's own units (the group is scaled 0.01).
export type ShortsModelConfig = {
  /** The real shorts OBJ. Null while the placeholder shape is used. */
  url: string | null;
};

export const SHORTS_MODEL: ShortsModelConfig = { url: null };

// Placeholder: two tapered legs under the shirt's hem (y 167).
export const PLACEHOLDER_SHORTS = {
  waistY: 166,
  legHeight: 70,
  legCenterX: 17,
  topRadius: 18,
  bottomRadius: 21,
} as const;
```

`lib/builder/geometry/set-framing.ts`:

```ts
// The shirt alone is centred on the scene origin. With shorts the set is taller
// and its middle sits lower, so everything is raised and the floor shadow drops.
// Tune these two numbers from screenshots.
const SHIRT_ONLY = { lift: 0, floorY: -0.6 };
const WITH_SHORTS = { lift: 0.4, floorY: -1.1 };

export function framingFor(includeShorts: boolean): { lift: number; floorY: number } {
  return includeShorts ? WITH_SHORTS : SHIRT_ONLY;
}
```

- [ ] **Step 4: Ver que pasan**

Run: `npx vitest run tests/lib/geometry/`
Expected: PASS.

- [ ] **Step 5: Implementar el componente y el visor**

`components/builder/viewer/ShortsModel.tsx`:

```tsx
"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { JERSEY_CENTER_Y } from "@/lib/builder/geometry/jersey-model";
import { PLACEHOLDER_SHORTS } from "@/lib/builder/geometry/shorts-model";
import { useDesign } from "@/lib/builder/state/design-context";
import { shortsColor } from "@/lib/builder/state/design-state";

// Provisional shape until the real shorts model is loaded (see SHORTS_MODEL).
export function ShortsModel() {
  const { state } = useDesign();
  const color = shortsColor(state);
  const material = useMemo(
    () => new THREE.MeshPhysicalMaterial({ color, roughness: 0.78, sheen: 0.4, sheenRoughness: 0.55 }),
    [color]
  );
  const { waistY, legHeight, legCenterX, topRadius, bottomRadius } = PLACEHOLDER_SHORTS;
  const legY = waistY - legHeight / 2;

  return (
    <group scale={0.01} position={[0, -JERSEY_CENTER_Y * 0.01, 0]}>
      {[-legCenterX, legCenterX].map((x) => (
        <mesh key={x} position={[x, legY, 0]} material={material} dispose={null}>
          <cylinderGeometry args={[topRadius, bottomRadius, legHeight, 24]} />
        </mesh>
      ))}
    </group>
  );
}
```

`components/builder/viewer/Viewer3D.tsx`:
- Importar `useDesign` (`@/lib/builder/state/design-context`), `framingFor` (`@/lib/builder/geometry/set-framing`) y `ShortsModel`.
- Quitar la constante `FLOOR_Y`.
- Al principio del componente: `const { state } = useDesign(); const { lift, floorY } = framingFor(state.shorts.included);`
- Reemplazar `<Suspense fallback={null}><JerseyModel /></Suspense>` por:

```tsx
      <group position={[0, lift, 0]}>
        <Suspense fallback={null}>
          <JerseyModel />
        </Suspense>
        {state.shorts.included && <ShortsModel />}
      </group>
```

- `ContactShadows position={[0, floorY, 0]}`.
- Actualizar el comentario de arriba ("The 'floor' shadow sits at FLOOR_Y…") para decir que el piso lo da `framingFor`.

- [ ] **Step 6: Verificar**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`.
Expected: verde. Con `npm run dev` el usuario elige "Conjunto" y mira: el pantalón provisorio aparece bajo la camiseta; ajustar `WITH_SHORTS` (`lift`, `floorY`) según sus capturas de pantalla y, si hace falta, alejar la cámara (`DEFAULT_CAMERA_RADIUS`/`DEFAULT_CAMERA_HEIGHT` en `camera-math.ts`). No se puede ver el visor desde acá: decir con claridad qué no se vio.

- [ ] **Step 7: Commit**

```bash
git add lib/builder components/builder tests/lib/geometry && git commit -m "feat: the viewer shows provisional shorts under the shirt when the kit is chosen

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Modelo real del pantalón

**Bloqueada por un insumo del usuario:** necesita el OBJ del pantalón y su textura. Pedirlos antes de empezar. El usuario aclaró que el modelo viene **con textura**; el spec original suponía un color liso, así que esta tarea empieza con una decisión.

**Files:**
- Create: `public/models/gepe_shorts.obj`, la textura en `public/textures/` (nombres según lo que entregue el usuario)
- Modify: `lib/builder/geometry/shorts-model.ts`, `components/builder/viewer/ShortsModel.tsx`, `lib/builder/geometry/set-framing.ts`
- Test: `tests/lib/geometry/shorts-model.test.ts` (medidas del OBJ real)

**Interfaces:**
- Consumes: `SHORTS_MODEL`, `JERSEY_CENTER_Y`, `framingFor` (Tarea 6).
- Produces: `SHORTS_MODEL.url` apunta al OBJ real; `ShortsModel` lo carga con `OBJLoader`.

- [ ] **Step 1: Pedir los archivos y decidir cómo se colorea**

Pedirle al usuario el OBJ y la textura. Con ellos, medir el OBJ igual que se midió la camiseta (caja contenedora en x, y, z) y comprobar el contrato: mismas unidades que la camiseta, borde superior de la cintura en y ≈ 167. Si no encaja, pedir que lo reexporte con ese origen/escala (no compensar con números mágicos).

Preguntarle con `AskUserQuestion` cómo debe colorearse el pantalón teniendo textura:
- **La textura es solo detalle (sombras, costuras, tejido), el color es lo que elige el cliente:** `material.color = shortsColor` y la textura multiplica. Es lo más probable.
- **La textura ya trae color:** el selector Primario/Secundario no podría cambiarlo; habría que replantear el spec.

- [ ] **Step 2: Escribir el test de las medidas**

`tests/lib/geometry/shorts-model.test.ts` (ajustar la ruta al nombre real del archivo): lee el OBJ, calcula el máximo `y` y comprueba que queda por debajo del borde inferior de la camiseta (< 167.2) y a menos de unos pocos puntos de él (> 160), y que el ancho en `x` no excede el de la camiseta (< 131.4).

- [ ] **Step 3: Ver que falla, copiar los archivos, implementar**

Run: `npx vitest run tests/lib/geometry/shorts-model.test.ts` → FAIL (falta el archivo). Copiar el OBJ y la textura a `public/`, y:
- `SHORTS_MODEL = { url: "/models/gepe_shorts.obj" }` (y la textura si corresponde, como `normalMapUrl` en `JERSEY_MODEL`).
- En `ShortsModel`, si `SHORTS_MODEL.url` está definido, cargar con `useLoader(OBJLoader, SHORTS_MODEL.url)`, tomar la primera malla con `firstMeshGeometry` (de `jersey-geometry.ts`), y dibujarla con el mismo material (`color`, y `map` si la textura es detalle); mantener la forma provisoria solo si `url` es `null`.
- Quitar `PLACEHOLDER_SHORTS` y la forma provisoria si ya no se usan.

- [ ] **Step 4: Verificar con capturas**

Run: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. El usuario mira el visor y manda capturas: afinar `WITH_SHORTS` en `set-framing.ts` y la cámara. Revisar también las miniaturas del checkout y la imagen de "Compartir" para ver que no cortan el pantalón (`lib/share/story-layout.ts` si hace falta).

- [ ] **Step 5: Commit**

```bash
git add public lib components tests && git commit -m "feat: the real shorts model replaces the placeholder

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

- **Cobertura del spec:** sección Pantalón y selectores → Tarea 4; `DesignState.shorts` y acciones → Tarea 1; `shortsColor` → Tarea 1; visor y `SHORTS_MODEL` → Tareas 6 y 7; talle por jugador y compatibilidad con pedidos viejos → Tarea 2; tabla, precio, resumen y confirmación → Tareas 3 y 5; encuadre → Tareas 6 y 7. Sin huecos.
- **Consistencia de tipos:** `ShortsConfig`/`shortsColor`/`SET_SHORTS_*` (Tarea 1) se usan igual en las Tareas 3, 4 y 6; `shortsSize` (Tarea 2) en las Tareas 5; `Totals.shorts` y `orderTotals(roster, withShorts)` (Tarea 3) en la Tarea 5; `Confirmation.shorts` (Tareas 2 y 3) en la Tarea 5.
- **Pendientes reales:** la Tarea 7 depende de los archivos del usuario y de una decisión sobre la textura; el resto se puede ejecutar sin ellos.
