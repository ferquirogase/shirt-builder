import { describe, it, expect } from "vitest";
import { createPlayerLine } from "@/lib/checkout/order";
import { PRICE_PER_SHIRT, formatMoney, orderTotals } from "@/lib/checkout/pricing";

// Each roster line is one shirt.
function players(count: number) {
  return Array.from({ length: count }, (_, i) => createPlayerLine(`l${i}`));
}

describe("orderTotals", () => {
  it("charges the unit price with no discount for a small order", () => {
    expect(orderTotals(players(1))).toEqual({
      shirts: 1,
      subtotal: PRICE_PER_SHIRT,
      discountRate: 0,
      discount: 0,
      total: PRICE_PER_SHIRT,
    });
  });

  it("counts one shirt per player", () => {
    expect(orderTotals(players(5)).shirts).toBe(5);
    expect(orderTotals(players(12)).shirts).toBe(12);
  });

  it("applies 10% from 10 shirts and not before", () => {
    expect(orderTotals(players(9)).discountRate).toBe(0);
    const ten = orderTotals(players(10));
    expect(ten.discountRate).toBe(0.1);
    expect(ten.subtotal).toBe(10 * PRICE_PER_SHIRT);
    expect(ten.discount).toBe(10 * PRICE_PER_SHIRT * 0.1);
    expect(ten.total).toBe(ten.subtotal - ten.discount);
  });

  it("applies 15% from 20 shirts", () => {
    expect(orderTotals(players(19)).discountRate).toBe(0.1);
    expect(orderTotals(players(20)).discountRate).toBe(0.15);
  });

  it("rounds money to cents", () => {
    const totals = orderTotals(players(13));
    expect(Number.isInteger(totals.discount * 100)).toBe(true);
    expect(Number.isInteger(totals.total * 100)).toBe(true);
  });
});

describe("formatMoney", () => {
  it("formats with the currency and two decimals", () => {
    const text = formatMoney(1234.5);
    expect(text).toMatch(/1\.234,50/);
    expect(text).toMatch(/US\$|USD/);
  });
});
