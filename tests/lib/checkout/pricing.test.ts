import { describe, it, expect } from "vitest";
import { createPlayerLine } from "@/lib/checkout/order";
import { PRICE_PER_SHIRT, PRICE_PER_SHORTS, formatMoney, orderTotals, pricePerPlayer } from "@/lib/checkout/pricing";

// Each roster line is one shirt.
function players(count: number) {
  return Array.from({ length: count }, (_, i) => createPlayerLine(`l${i}`));
}

describe("orderTotals", () => {
  it("charges the unit price with no discount for a small order", () => {
    expect(orderTotals(players(1))).toEqual({
      shirts: 1,
      shorts: 0,
      subtotal: PRICE_PER_SHIRT,
      discountRate: 0,
      discount: 0,
      total: PRICE_PER_SHIRT,
    });
  });

  it("charges no shorts when the order is shirt only", () => {
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

describe("pricePerPlayer", () => {
  it("is the shirt alone, or the shirt and the shorts", () => {
    expect(pricePerPlayer(false)).toBe(PRICE_PER_SHIRT);
    expect(pricePerPlayer(true)).toBe(PRICE_PER_SHIRT + PRICE_PER_SHORTS);
  });
});

describe("formatMoney", () => {
  it("formats with the currency and two decimals", () => {
    const text = formatMoney(1234.5);
    expect(text).toMatch(/1\.234,50/);
    expect(text).toMatch(/US\$|USD/);
  });
});
