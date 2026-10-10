import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initialDesignState } from "@/lib/builder/state/design-state";
import { createPlayerLine, type Confirmation, type Order } from "@/lib/checkout/order";
import {
  CONFIRMATION_KEY,
  DESIGN_IMAGES_KEY,
  ORDER_KEY,
  clearConfirmation,
  clearDesignImages,
  clearOrder,
  loadConfirmation,
  loadDesignImages,
  loadOrder,
  saveConfirmation,
  saveDesignImages,
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
  shorts: 0,
  total: 70,
  roster: [createPlayerLine("a", { name: "Leo", number: "10" })],
};

beforeEach(() => {
  clearOrder();
  clearConfirmation();
});
afterEach(() => vi.restoreAllMocks());

describe("order storage", () => {
  it("reads an order saved before the shorts existed, filling in the defaults", () => {
    const old = makeOrder();
    const oldDesign: Record<string, unknown> = { ...old.design };
    delete oldDesign.shorts;
    const oldLine = { id: "a", name: "Leo", number: "10", size: "L" };
    sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ...old, design: oldDesign, roster: [oldLine] }));
    const loaded = loadOrder()!;
    expect(loaded.design.shorts).toEqual({ included: false, colorSource: "primary" });
    expect(loaded.roster[0]).toEqual({ ...oldLine, shortsSize: "M", keeper: false });
  });

  it("rejects an order whose shorts size is not a real size", () => {
    const order = makeOrder();
    sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ ...order, roster: [{ ...order.roster[0], shortsSize: "XXXL" }] })
    );
    expect(loadOrder()).toBeNull();
  });

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
      JSON.stringify({ design: {}, thumbnails: null, roster: [{ id: "a", name: "x", number: "1", size: "XXXL" }] })
    );
    expect(loadOrder()).toBeNull();
  });

  it("opens an order whose lines have no quantity", () => {
    const lines = { ...makeOrder(), roster: [{ id: "a", name: "Leo", number: "10", size: "M" }] };
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(lines));
    expect(loadOrder()?.roster[0]).toEqual({ id: "a", name: "Leo", number: "10", size: "M", shortsSize: "M", keeper: false });
  });

  it("opens an order saved before quantities were removed, ignoring the old field", () => {
    const old = { ...makeOrder(), roster: [{ id: "a", name: "Leo", number: "10", size: "M", quantity: 2 }] };
    sessionStorage.setItem(ORDER_KEY, JSON.stringify(old));
    expect(loadOrder()?.roster[0]).toMatchObject({ id: "a", name: "Leo", number: "10", size: "M" });
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

describe("design images", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearDesignImages();
  });

  it("saves and loads the big images apart from the order", () => {
    const images = { front: "data:image/jpeg;base64,FF", back: "data:image/jpeg;base64,BB" };
    expect(loadDesignImages()).toBeNull();
    expect(saveDesignImages(images)).toBe(true);
    expect(loadDesignImages()).toEqual(images);
    expect(window.sessionStorage.getItem(ORDER_KEY)).toBeNull();
  });

  it("clears them", () => {
    saveDesignImages({ front: "F", back: "B" });
    clearDesignImages();
    expect(loadDesignImages()).toBeNull();
    expect(window.sessionStorage.getItem(DESIGN_IMAGES_KEY)).toBeNull();
  });

  it("ignores stored data that is not a pair of images", () => {
    clearDesignImages();
    window.sessionStorage.setItem(DESIGN_IMAGES_KEY, JSON.stringify({ front: 1 }));
    expect(loadDesignImages()).toBeNull();
  });
});

describe("orders saved before the made crest", () => {
  beforeEach(() => clearOrder());

  it("load with no crest", () => {
    const oldDesign: Partial<typeof initialDesignState> = { ...initialDesignState };
    delete oldDesign.crestConfig;
    window.sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ design: oldDesign, thumbnails: null, roster: [createPlayerLine("a")] })
    );
    expect(loadOrder()?.design.crestConfig).toBeNull();
  });
});

describe("orders saved before the keeper", () => {
  beforeEach(() => clearOrder());

  it("load with nobody as keeper", () => {
    window.sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({
        design: initialDesignState,
        thumbnails: null,
        roster: [{ id: "a", name: "Leo", number: "10", size: "M", shortsSize: "M" }],
      })
    );
    expect(loadOrder()?.roster[0].keeper).toBe(false);
  });

  it("are rejected when the keeper thumbnails are not a pair of images", () => {
    window.sessionStorage.setItem(
      ORDER_KEY,
      JSON.stringify({ design: initialDesignState, thumbnails: null, keeperThumbnails: { front: 1 }, roster: [createPlayerLine("a")] })
    );
    expect(loadOrder()).toBeNull();
  });
});
