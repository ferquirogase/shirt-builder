import { initialDesignState } from "@/lib/builder/state/design-state";
import { SIZES, type Confirmation, type Order } from "./order";

export const ORDER_KEY = "gepe:order";
export const CONFIRMATION_KEY = "gepe:confirmation";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function isOrder(value: unknown): value is Order {
  if (!isRecord(value) || !isRecord(value.design)) return false;
  const thumbs = value.thumbnails;
  const thumbsOk =
    thumbs === null || (isRecord(thumbs) && typeof thumbs.front === "string" && typeof thumbs.back === "string");
  return thumbsOk && Array.isArray(value.roster) && value.roster.length > 0 && value.roster.every(isPlayerLine);
}

function isConfirmation(value: unknown): value is Confirmation {
  return (
    isRecord(value) &&
    typeof value.number === "string" &&
    typeof value.email === "string" &&
    typeof value.projectName === "string" &&
    typeof value.shirts === "number" &&
    typeof value.shorts === "number" &&
    typeof value.total === "number" &&
    Array.isArray(value.roster) &&
    value.roster.every(isPlayerLine)
  );
}

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

// The module-level `memory` always holds the latest value saved in this page
// (it survives client-side navigation); sessionStorage only matters after a
// refresh. If a write fails the key is removed so an older value cannot come back.
function createSlot<T>(key: string, isValid: (value: unknown) => value is T, normalize: (value: T) => T = (v) => v) {
  let memory: T | null = null;

  return {
    load(): T | null {
      if (memory) return memory;
      if (typeof window === "undefined") return null;
      try {
        const raw = window.sessionStorage.getItem(key);
        if (raw === null) return null;
        const parsed: unknown = JSON.parse(raw);
        return isValid(parsed) ? normalize(parsed) : null;
      } catch {
        return null;
      }
    },
    save(value: T): boolean {
      memory = value;
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          // Storage is unavailable altogether; memory is all we have.
        }
        return false;
      }
    },
    clear(): void {
      memory = null;
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Nothing to clear.
      }
    },
  };
}

const orderSlot = createSlot(ORDER_KEY, isOrder, withShortsDefaults);
const confirmationSlot = createSlot(CONFIRMATION_KEY, isConfirmation);

export const loadOrder = orderSlot.load;
export const saveOrder = orderSlot.save;
export const clearOrder = orderSlot.clear;
export const loadConfirmation = confirmationSlot.load;
export const saveConfirmation = confirmationSlot.save;
export const clearConfirmation = confirmationSlot.clear;
