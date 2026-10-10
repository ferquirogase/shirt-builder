import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, type Confirmation, type Order } from "@/lib/checkout/order";
import {
  CONFIRMATION_KEY,
  ORDER_KEY,
  clearConfirmation,
  clearOrder,
  loadConfirmation,
  loadOrder,
  saveConfirmation,
  saveOrder,
} from "@/lib/checkout/order-storage";

function makeOrder(name = "Leo"): Order {
  return {
    design: initialDesignState,
    thumbnails: { front: "data:image/jpeg;base64,F", back: "data:image/jpeg;base64,B" },
    roster: [createPlayerLine("a", { name, number: "10" })],
  };
}

const confirmation: Confirmation = {
  number: "GEPE-ABC234",
  email: "leo@club.com",
  projectName: "Mi diseño",
  shirts: 2,
  total: 70,
  roster: [createPlayerLine("a", { name: "Leo", number: "10", quantity: 2 })],
};

beforeEach(() => {
  clearOrder();
  clearConfirmation();
});
afterEach(() => vi.restoreAllMocks());

describe("order storage", () => {
  it("returns null when nothing was saved", () => {
    expect(loadOrder()).toBeNull();
  });

  it("round-trips an order through sessionStorage", () => {
    expect(saveOrder(makeOrder())).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(ORDER_KEY)!)).toEqual(makeOrder());
    expect(loadOrder()).toEqual(makeOrder());
  });

  it("reads from sessionStorage after a page refresh (memory empty)", () => {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(makeOrder("Dibu")));
    expect(loadOrder()?.roster[0].name).toBe("Dibu");
  });

  it("treats damaged JSON as no order", () => {
    sessionStorage.setItem(ORDER_KEY, "{not json");
    expect(loadOrder()).toBeNull();
  });

  it("treats a value with the wrong shape as no order", () => {
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ design: 1 }));
    expect(loadOrder()).toBeNull();
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ design: {}, thumbnails: null, roster: [] }));
    expect(loadOrder()).toBeNull();
    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ design: {}, thumbnails: null, roster: [{ id: "a", name: "x", number: "1", size: "XXXL", quantity: 1 }] })
    );
    expect(loadOrder()).toBeNull();
  });

  it("keeps working in memory when sessionStorage is full, and reports it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveOrder(makeOrder("Memoria"))).toBe(false);
    expect(loadOrder()?.roster[0].name).toBe("Memoria");
  });

  it("does not leave an old order behind when a newer one cannot be written", () => {
    expect(saveOrder(makeOrder("Viejo"))).toBe(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(saveOrder(makeOrder("Nuevo"))).toBe(false);
    expect(sessionStorage.getItem(ORDER_KEY)).toBeNull();
    expect(loadOrder()?.roster[0].name).toBe("Nuevo");
  });

  it("clearOrder removes it from memory and from sessionStorage", () => {
    saveOrder(makeOrder());
    clearOrder();
    expect(sessionStorage.getItem(ORDER_KEY)).toBeNull();
    expect(loadOrder()).toBeNull();
  });
});

describe("confirmation storage", () => {
  it("round-trips and clears a confirmation", () => {
    expect(loadConfirmation()).toBeNull();
    expect(saveConfirmation(confirmation)).toBe(true);
    expect(sessionStorage.getItem(CONFIRMATION_KEY)).not.toBeNull();
    expect(loadConfirmation()).toEqual(confirmation);
    clearConfirmation();
    expect(loadConfirmation()).toBeNull();
  });

  it("ignores a damaged confirmation", () => {
    sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify({ number: 5 }));
    expect(loadConfirmation()).toBeNull();
  });
});
