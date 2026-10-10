import type { PlayerLine } from "./order";

// Example prices for the demo. When Ripple or a real catalog arrives this is
// the only file whose numbers change.
export const CURRENCY = "USD";
export const PRICE_PER_SHIRT = 35;
export const PRICE_PER_SHORTS = 20;

// Largest threshold first: the first tier the order reaches wins.
export const DISCOUNT_TIERS: ReadonlyArray<{ minShirts: number; rate: number }> = [
  { minShirts: 20, rate: 0.15 },
  { minShirts: 10, rate: 0.1 },
];

export type Totals = {
  shirts: number;
  shorts: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  total: number;
};

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function orderTotals(roster: readonly PlayerLine[], withShorts = false): Totals {
  // One line is one shirt, and one pair of shorts when the order is a full kit.
  const shirts = roster.length;
  const shorts = withShorts ? roster.length : 0;
  const subtotal = cents(shirts * PRICE_PER_SHIRT + shorts * PRICE_PER_SHORTS);
  const discountRate = DISCOUNT_TIERS.find((tier) => shirts >= tier.minShirts)?.rate ?? 0;
  const discount = cents(subtotal * discountRate);
  return { shirts, shorts, subtotal, discountRate, discount, total: cents(subtotal - discount) };
}

/** What one player costs: the shirt, plus the shorts when the order is a full kit (before any quantity discount). */
export function pricePerPlayer(withShorts: boolean): number {
  return withShorts ? PRICE_PER_SHIRT + PRICE_PER_SHORTS : PRICE_PER_SHIRT;
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: CURRENCY }).format(amount);
}
