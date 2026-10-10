import type { DesignState } from "@/lib/builder/state/design-state";

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const MAX_NAME_LENGTH = 12;
export const MAX_QUANTITY = 99;

export type PlayerLine = { id: string; name: string; number: string; size: Size; quantity: number };
export type Thumbnails = { front: string; back: string };

// A frozen design plus the roster that wears it. Plain JSON on purpose: this
// is what the Ripple integration will eventually send.
export type Order = {
  design: DesignState;
  thumbnails: Thumbnails | null;
  roster: PlayerLine[];
};

// What the confirmation screen shows after the (simulated) payment.
export type Confirmation = {
  number: string;
  email: string;
  projectName: string;
  shirts: number;
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
  return { id, name: "", number: "", size: "M", quantity: 1, ...patch };
}

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(value)));
}

function cleanNumber(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

function cleanPatch(patch: Partial<Omit<PlayerLine, "id">>): Partial<Omit<PlayerLine, "id">> {
  const clean: Partial<Omit<PlayerLine, "id">> = {};
  if (patch.name !== undefined) clean.name = patch.name.slice(0, MAX_NAME_LENGTH);
  if (patch.number !== undefined) clean.number = cleanNumber(patch.number);
  if (patch.size !== undefined && (SIZES as readonly string[]).includes(patch.size)) clean.size = patch.size;
  if (patch.quantity !== undefined) clean.quantity = clampQuantity(patch.quantity);
  return clean;
}

export type OrderAction =
  | { type: "ADD_PLAYER"; id: string }
  | { type: "REMOVE_PLAYER"; id: string }
  | { type: "DUPLICATE_PLAYER"; id: string; newId: string }
  | { type: "UPDATE_PLAYER"; id: string; patch: Partial<Omit<PlayerLine, "id">> };

export function orderReducer(order: Order, action: OrderAction): Order {
  switch (action.type) {
    case "ADD_PLAYER":
      return { ...order, roster: [...order.roster, createPlayerLine(action.id)] };
    case "REMOVE_PLAYER":
      if (order.roster.length <= 1) return order;
      return { ...order, roster: order.roster.filter((line) => line.id !== action.id) };
    case "DUPLICATE_PLAYER": {
      const index = order.roster.findIndex((line) => line.id === action.id);
      if (index === -1) return order;
      const roster = [...order.roster];
      roster.splice(index + 1, 0, { ...order.roster[index], id: action.newId });
      return { ...order, roster };
    }
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
export function orderFromDesign(design: DesignState, thumbnails: Thumbnails | null, previous: Order | null): Order {
  const fromBuilder = {
    name: design.playerName.slice(0, MAX_NAME_LENGTH),
    number: cleanNumber(design.playerNumber),
  };
  if (!previous || previous.roster.length === 0) {
    return { design, thumbnails, roster: [createPlayerLine(newLineId(), fromBuilder)] };
  }
  const [first, ...rest] = previous.roster;
  const firstIsBlank = first.name.trim() === "" && first.number === "";
  return {
    design,
    thumbnails,
    roster: firstIsBlank ? [{ ...first, ...fromBuilder }, ...rest] : previous.roster,
  };
}
