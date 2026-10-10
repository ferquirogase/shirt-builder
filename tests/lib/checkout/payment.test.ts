import { describe, it, expect, vi } from "vitest";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, type Order } from "@/lib/checkout/order";
import { SIMULATED_PAYMENT_MS, orderNumber, payWithRipple } from "@/lib/checkout/payment";
import { orderTotals } from "@/lib/checkout/pricing";
import type { ContactInfo } from "@/lib/checkout/validation";

const contact: ContactInfo = {
  fullName: "Leo Messi",
  email: "leo@club.com",
  phone: "1",
  address: "Calle 1",
  city: "Rosario",
  postalCode: "2000",
};
const order: Order = {
  design: { ...initialDesignState, projectName: "Los del viernes" },
  thumbnails: null,
  roster: [createPlayerLine("a", { name: "Leo", number: "10" }), createPlayerLine("b", { name: "Dibu", number: "1" })],
};

describe("orderNumber", () => {
  it("is GEPE- plus six characters without look-alikes", () => {
    expect(orderNumber()).toMatch(/^GEPE-[A-HJ-NP-Z2-9]{6}$/);
  });

  it("is deterministic for a given random source", () => {
    expect(orderNumber(() => 0)).toBe("GEPE-AAAAAA");
  });
});

describe("payWithRipple", () => {
  it("waits, then confirms with the order's totals", async () => {
    const wait = vi.fn(async () => {});
    const confirmation = await payWithRipple(order, contact, wait);
    expect(wait).toHaveBeenCalledWith(SIMULATED_PAYMENT_MS);
    expect(confirmation).toMatchObject({
      email: "leo@club.com",
      projectName: "Los del viernes",
      shirts: 2,
      total: orderTotals(order.roster).total,
      roster: order.roster,
    });
    expect(confirmation.number).toMatch(/^GEPE-/);
  });
});
