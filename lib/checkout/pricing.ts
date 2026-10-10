import type { PlayerLine } from "./order";

// Example prices for the demo. When Ripple or a real catalog arrives this is
// the only file whose numbers change.
export const CURRENCY = "USD";
export const PRICE_PER_SHIRT = 35;

// Largest threshold first: the first tier the order reaches wins.
export const DISCOUNT_TIERS: ReadonlyArray<{ minShirts: number; rate: number }> = [
  { minShirts: 20, rate: 0.15 },
  { minShirts: 10, rate: 0.1 },
];

export type Totals = {
  shirts: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  total: number;
};

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function orderTotals(roster: readonly PlayerLine[]): Totals {
  const shirts = roster.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cents(shirts * PRICE_PER_SHIRT);
  const discountRate = DISCOUNT_TIERS.find((tier) => shirts >= tier.minShirts)?.rate ?? 0;
  const discount = cents(subtotal * discountRate);
  return { shirts, subtotal, discountRate, discount, total: cents(subtotal - discount) };
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: CURRENCY }).format(amount);
}
