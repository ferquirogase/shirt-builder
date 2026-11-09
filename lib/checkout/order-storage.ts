import { findPattern } from "@/lib/builder/catalog/patterns";
import { initialDesignState, type DesignState } from "@/lib/builder/state/design-state";
import { SIZES, type Confirmation, type Order, type Thumbnails } from "./order";

export const ORDER_KEY = "gepe:order";
export const CONFIRMATION_KEY = "gepe:confirmation";
export const DESIGN_IMAGES_KEY = "gepe:design-images";
export const KEEPER_DESIGN_IMAGES_KEY = "gepe:keeper-design-images";

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
    // Orders saved before the shorts or the keeper existed lack those fields.
    (value.shortsSize === undefined || isSize(value.shortsSize)) &&
    (value.keeper === undefined || typeof value.keeper === "boolean")
  );
}

function isOrder(value: unknown): value is Order {
  if (!isRecord(value) || !isRecord(value.design)) return false;
  const thumbs = value.thumbnails;
  const thumbsOk =
    thumbs === null || (isRecord(thumbs) && typeof thumbs.front === "string" && typeof thumbs.back === "string");
  const keeperOk =
    value.keeperThumbnails === undefined || value.keeperThumbnails === null || isImagePair(value.keeperThumbnails);
  return thumbsOk && keeperOk && Array.isArray(value.roster) && value.roster.length > 0 && value.roster.every(isPlayerLine);
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

function isImagePair(value: unknown): value is Thumbnails {
  return isRecord(value) && typeof value.front === "string" && typeof value.back === "string";
}

// A design saved before the sleeves had colors of their own: they wore the shirt's.
export function withSleeveColors(colors: DesignState["colors"]): DesignState["colors"] {
  return { ...colors, sleeve: colors.sleeve ?? colors.primary, sleeveTrim: colors.sleeveTrim ?? colors.secondary };
}

// Orders saved before the shorts existed lack their fields: fill in the defaults.
function withShortsDefaults(order: Order): Order {
  const keeper = order.design.keeper;
  // A torso pattern that has since been taken out of the catalog would draw nothing: use the default one.
  const pattern = (id: string) => (findPattern(id) ? id : initialDesignState.bodyPatternId);
  return {
    ...order,
    design: {
      ...initialDesignState,
      ...order.design,
      bodyPatternId: pattern(order.design.bodyPatternId),
      colors: withSleeveColors(order.design.colors),
      keeper: keeper?.look
        ? { ...keeper, look: { ...keeper.look, bodyPatternId: pattern(keeper.look.bodyPatternId), colors: withSleeveColors(keeper.look.colors) } }
        : keeper,
      shorts: { ...initialDesignState.shorts, ...order.design.shorts },
    },
    roster: order.roster.map((line) => ({ ...line, shortsSize: line.shortsSize ?? "M", keeper: line.keeper ?? false })),
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
// The big images live apart from the order: they are heavy, and if they do not fit in
// sessionStorage the order itself must still be saved.
const designImagesSlot = createSlot(DESIGN_IMAGES_KEY, isImagePair);
const keeperDesignImagesSlot = createSlot(KEEPER_DESIGN_IMAGES_KEY, isImagePair);

export const loadOrder = orderSlot.load;
export const saveOrder = orderSlot.save;
export const clearOrder = orderSlot.clear;
export const loadConfirmation = confirmationSlot.load;
export const saveConfirmation = confirmationSlot.save;
export const clearConfirmation = confirmationSlot.clear;
export const loadDesignImages = designImagesSlot.load;
export const saveDesignImages = designImagesSlot.save;
export const clearDesignImages = designImagesSlot.clear;
export const loadKeeperDesignImages = keeperDesignImagesSlot.load;
export const saveKeeperDesignImages = keeperDesignImagesSlot.save;
export const clearKeeperDesignImages = keeperDesignImagesSlot.clear;
