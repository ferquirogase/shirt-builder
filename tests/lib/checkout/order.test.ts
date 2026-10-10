import { describe, it, expect } from "vitest";
import { initialDesignState } from "@/lib/builder/state/design-state";
import {
  MAX_NAME_LENGTH,
  createPlayerLine,
  orderFromDesign,
  orderReducer,
  type Order,
  type PlayerLine,
} from "@/lib/checkout/order";

function orderWith(...roster: PlayerLine[]): Order {
  return { design: initialDesignState, thumbnails: null, roster };
}

describe("orderReducer", () => {
  it("adds a blank size M player at the end", () => {
    const order = orderWith(createPlayerLine("a", { name: "Leo", number: "10" }));
    const next = orderReducer(order, { type: "ADD_PLAYER", id: "b" });
    expect(next.roster).toHaveLength(2);
    expect(next.roster[1]).toEqual({ id: "b", name: "", number: "", size: "M" });
  });

  it("removes a player but never the last one", () => {
    const two = orderWith(createPlayerLine("a"), createPlayerLine("b"));
    const one = orderReducer(two, { type: "REMOVE_PLAYER", id: "a" });
    expect(one.roster.map((l) => l.id)).toEqual(["b"]);
    expect(orderReducer(one, { type: "REMOVE_PLAYER", id: "b" })).toBe(one);
  });

  it("updates only the targeted player", () => {
    const order = orderWith(createPlayerLine("a"), createPlayerLine("b"));
    const next = orderReducer(order, { type: "UPDATE_PLAYER", id: "b", patch: { name: "Dibu", size: "XL" } });
    expect(next.roster[0]).toEqual(order.roster[0]);
    expect(next.roster[1]).toMatchObject({ name: "Dibu", size: "XL" });
  });

  it("cleans the patch: name capped, number digits only and 2 max, unknown size ignored", () => {
    const order = orderWith(createPlayerLine("a"));
    const next = orderReducer(order, {
      type: "UPDATE_PLAYER",
      id: "a",
      patch: { name: "Nombre demasiado largo", number: "1a0b9", size: "XXXL" as never },
    });
    expect(next.roster[0].name).toBe("Nombre demasiado largo".slice(0, MAX_NAME_LENGTH));
    expect(next.roster[0].number).toBe("10");
    expect(next.roster[0].size).toBe("M");
  });

  it("returns the same order for an unknown id", () => {
    const order = orderWith(createPlayerLine("a"));
    expect(orderReducer(order, { type: "UPDATE_PLAYER", id: "nope", patch: { name: "x" } })).toBe(order);
  });
});

describe("orderFromDesign", () => {
  const thumbs = { front: "f", back: "b" };

  it("starts the roster from the builder's name and number", () => {
    const design = { ...initialDesignState, playerName: "MESSI", playerNumber: "10" };
    const order = orderFromDesign(design, thumbs, null);
    expect(order.design).toBe(design);
    expect(order.thumbnails).toBe(thumbs);
    expect(order.roster).toHaveLength(1);
    expect(order.roster[0]).toMatchObject({ name: "MESSI", number: "10", size: "M" });
  });

  it("starts with one blank player when the builder has no name or number", () => {
    const order = orderFromDesign(initialDesignState, null, null);
    expect(order.thumbnails).toBeNull();
    expect(order.roster).toHaveLength(1);
    expect(order.roster[0]).toMatchObject({ name: "", number: "" });
  });

  it("keeps the roster already loaded when the first player is filled in", () => {
    const previous = orderWith(createPlayerLine("a", { name: "Leo", number: "10" }), createPlayerLine("b", { name: "Dibu", number: "1" }));
    const design = { ...initialDesignState, playerName: "OTRO", playerNumber: "7" };
    const order = orderFromDesign(design, thumbs, previous);
    expect(order.roster).toEqual(previous.roster);
    expect(order.design).toBe(design);
  });

  it("fills a blank first player from the builder and keeps the rest", () => {
    const previous = orderWith(createPlayerLine("a"), createPlayerLine("b", { name: "Dibu", number: "1" }));
    const design = { ...initialDesignState, playerName: "MESSI", playerNumber: "10" };
    const order = orderFromDesign(design, thumbs, previous);
    expect(order.roster[0]).toMatchObject({ id: "a", name: "MESSI", number: "10" });
    expect(order.roster[1]).toEqual(previous.roster[1]);
  });

  it("does not reuse old thumbnails when the new capture failed", () => {
    const previous = { ...orderWith(createPlayerLine("a", { name: "Leo", number: "10" })), thumbnails: thumbs };
    expect(orderFromDesign(initialDesignState, null, previous).thumbnails).toBeNull();
  });
});
