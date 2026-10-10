import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { JERSEY_BOTTOM_Y } from "@/lib/builder/geometry/jersey-model";
import { SHORTS_BOTTOM_Y } from "@/lib/builder/geometry/shorts-model";
import {
  MAX_SWAY,
  addShortsSwayWeights,
  addSwayWeights,
  shortsSwayWeight,
  stepSpring,
  swayTarget,
  swayWeight,
} from "@/lib/builder/geometry/cloth-sway";

describe("swayWeight", () => {
  it("is 0 on the chest, shoulders and neck", () => {
    expect(swayWeight(0, 250)).toBe(0);
    expect(swayWeight(30, 235)).toBe(0);
    expect(swayWeight(0, 295)).toBe(0);
    expect(swayWeight(45, 285)).toBeLessThan(0.1);
  });

  it("grows toward the hem and is full at the bottom edge", () => {
    expect(swayWeight(0, 200)).toBeGreaterThan(0);
    expect(swayWeight(0, 180)).toBeGreaterThan(swayWeight(0, 200));
    expect(swayWeight(0, 167)).toBe(1);
  });

  it("grows toward the sleeve cuff, the same on both sides", () => {
    expect(swayWeight(50, 250)).toBeGreaterThan(0);
    expect(swayWeight(60, 250)).toBeGreaterThan(swayWeight(50, 250));
    expect(swayWeight(66, 250)).toBe(1);
    expect(swayWeight(-60, 250)).toBe(swayWeight(60, 250));
  });
});

describe("shortsSwayWeight", () => {
  it("moves exactly like the shirt's body at every height where the two overlap", () => {
    // The waist is tucked inside the shirt: if it moved differently the shirt would cut through it.
    for (let y = JERSEY_BOTTOM_Y; y <= 230; y += 3) {
      expect(shortsSwayWeight(y)).toBeCloseTo(swayWeight(0, y), 10);
    }
  });

  it("is fully free at the shirt's hem, with no jump where the shirt ends", () => {
    expect(shortsSwayWeight(JERSEY_BOTTOM_Y)).toBeCloseTo(1, 3);
    expect(shortsSwayWeight(JERSEY_BOTTOM_Y - 0.01)).toBeCloseTo(1, 2);
  });

  it("fades out down the legs and is still at the bottom edge", () => {
    expect(shortsSwayWeight(SHORTS_BOTTOM_Y)).toBe(0);
    expect(shortsSwayWeight(SHORTS_BOTTOM_Y - 20)).toBe(0);
    const mid = (SHORTS_BOTTOM_Y + JERSEY_BOTTOM_Y) / 2;
    expect(shortsSwayWeight(mid)).toBeGreaterThan(0);
    expect(shortsSwayWeight(mid)).toBeLessThan(1);
  });

  it("never grows going down below the hem", () => {
    let previous = 1;
    for (let y = JERSEY_BOTTOM_Y; y >= SHORTS_BOTTOM_Y; y -= 2) {
      const weight = shortsSwayWeight(y);
      expect(weight).toBeLessThanOrEqual(previous + 1e-12);
      previous = weight;
    }
  });
});

describe("addShortsSwayWeights", () => {
  it("adds one weight per vertex from its height alone, leaving the positions alone", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([40, 205, 0, -40, JERSEY_BOTTOM_Y, 0, 0, SHORTS_BOTTOM_Y, 0], 3)
    );
    addShortsSwayWeights(geometry);
    const weights = geometry.getAttribute("swayWeight");
    expect(weights.count).toBe(3);
    expect(weights.getX(0)).toBeCloseTo(swayWeight(0, 205), 5);
    expect(weights.getX(1)).toBeCloseTo(1, 3);
    expect(weights.getX(2)).toBe(0);
    expect(geometry.getAttribute("position").getY(1)).toBeCloseTo(JERSEY_BOTTOM_Y, 3);
  });
});

describe("addSwayWeights", () => {
  it("adds one weight per vertex from its position, leaving the positions alone", () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 250, 0, 0, 167, 0, 66, 250, 0], 3));
    addSwayWeights(geometry);
    const weights = geometry.getAttribute("swayWeight");
    expect(weights.count).toBe(3);
    expect(weights.itemSize).toBe(1);
    expect([weights.getX(0), weights.getX(1), weights.getX(2)]).toEqual([0, 1, 1]);
    expect(geometry.getAttribute("position").getY(1)).toBe(167);
  });
});

describe("swayTarget", () => {
  it("lags opposite to the orbit direction", () => {
    expect(swayTarget(1)).toBeLessThan(0);
    expect(swayTarget(-1)).toBeGreaterThan(0);
    expect(swayTarget(0)).toBeCloseTo(0);
  });

  it("never exceeds MAX_SWAY, however fast the camera spins", () => {
    expect(swayTarget(1000)).toBe(-MAX_SWAY);
    expect(swayTarget(-1000)).toBe(MAX_SWAY);
  });
});

describe("stepSpring", () => {
  it("stays put when already at rest on its target", () => {
    expect(stepSpring({ value: 0, velocity: 0 }, 0, 1 / 60)).toEqual({ value: 0, velocity: 0 });
  });

  it("overshoots the target and then settles on it", () => {
    let state = { value: 0, velocity: 0 };
    let peak = 0;
    for (let i = 0; i < 600; i++) {
      state = stepSpring(state, 5, 1 / 60);
      peak = Math.max(peak, state.value);
    }
    expect(peak).toBeGreaterThan(5);
    expect(state.value).toBeCloseTo(5, 2);
    expect(Math.abs(state.velocity)).toBeLessThan(0.01);
  });

  it("is stable when a frame takes very long", () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 5, 5);
    expect(Number.isFinite(state.value)).toBe(true);
    expect(Math.abs(state.value)).toBeLessThan(50);
  });
});
