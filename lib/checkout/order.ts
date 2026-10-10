import type { DesignState } from "@/lib/builder/state/design-state";

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const MAX_NAME_LENGTH = 12;

// One line is one shirt.
export type PlayerLine = {
  id: string;
  name: string;
  number: string;
  size: Size;
  shortsSize: Size;
  /** Wears the keeper's shirt. Only counts while the keeper is in the design. */
  keeper: boolean;
};
export type Thumbnails = { front: string; back: string };

// A frozen design plus the roster that wears it. Plain JSON on purpose: this
// is what the Ripple integration will eventually send.
export type Order = {
  design: DesignState;
  thumbnails: Thumbnails | null;
  /** The keeper's shirt, when the design has one. */
  keeperThumbnails?: Thumbnails | null;
  roster: PlayerLine[];
};

// What the confirmation screen shows after the (simulated) payment.
export type Confirmation = {
  number: string;
  email: string;
  projectName: string;
  shirts: number;
  shorts: number;
  total: number;
  roster: PlayerLine[];
};

let lineCounter = 0;

// Ids are made by the caller, never inside the reducer, so the reducer stays pure.
export function newLineId(): string {
  lineCounter += 1;
  return `line-${Date.now().toString(36)}-${lineCounter}`;
}

export function createPlayerLine(id: string, patch: Partial<Omit<PlayerLine, "id">> = {}): PlayerLine {
  return { id, name: "", number: "", size: "M", shortsSize: "M", keeper: false, ...patch };
}

function cleanNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

function cleanPatch(patch: Partial<Omit<PlayerLine, "id">>): Partial<Omit<PlayerLine, "id">> {
  const clean: Partial<Omit<PlayerLine, "id">> = {};
  if (patch.name !== undefined) clean.name = patch.name.slice(0, MAX_NAME_LENGTH);
  if (patch.number !== undefined) clean.number = cleanNumber(patch.number);
  if (patch.size !== undefined && (SIZES as readonly string[]).includes(patch.size)) clean.size = patch.size;
  if (patch.shortsSize !== undefined && (SIZES as readonly string[]).includes(patch.shortsSize)) {
    clean.shortsSize = patch.shortsSize;
  }
  if (typeof patch.keeper === "boolean") clean.keeper = patch.keeper;
  return clean;
}

export type OrderAction =
  | { type: "ADD_PLAYER"; id: string }
  | { type: "REMOVE_PLAYER"; id: string }
  | { type: "UPDATE_PLAYER"; id: string; patch: Partial<Omit<PlayerLine, "id">> };

export function orderReducer(order: Order, action: OrderAction): Order {
  switch (action.type) {
    case "ADD_PLAYER":
      return { ...order, roster: [...order.roster, createPlayerLine(action.id)] };
    case "REMOVE_PLAYER":
      if (order.roster.length <= 1) return order;
      return { ...order, roster: order.roster.filter((line) => line.id !== action.id) };
    case "UPDATE_PLAYER": {
      if (!order.roster.some((line) => line.id === action.id)) return order;
      const patch = cleanPatch(action.patch);
      return {
        ...order,
        roster: order.roster.map((line) => (line.id === action.id ? { ...line, ...patch } : line)),
      };
    }
  }
}

// Called when the user taps "Revisar diseño". The builder's name and number
// become the first player; a roster already loaded in a previous visit stays.
export function orderFromDesign(
  design: DesignState,
  thumbnails: Thumbnails | null,
  previous: Order | null,
  keeperThumbnails: Thumbnails | null = null
): Order {
  const fromBuilder = {
    name: design.playerName.slice(0, MAX_NAME_LENGTH),
    number: cleanNumber(design.playerNumber),
  };
  if (!previous || previous.roster.length === 0) {
    return { design, thumbnails, keeperThumbnails, roster: [createPlayerLine(newLineId(), fromBuilder)] };
  }
  const [first, ...rest] = previous.roster;
  const firstIsBlank = first.name.trim() === "" && first.number === "";
  return {
    design,
    thumbnails,
    keeperThumbnails,
    roster: firstIsBlank ? [{ ...first, ...fromBuilder }, ...rest] : previous.roster,
  };
}
