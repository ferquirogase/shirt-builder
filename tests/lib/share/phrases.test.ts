import { describe, it, expect } from "vitest";
import { STORY_PHRASES, nextPhrase } from "@/lib/share/phrases";

describe("STORY_PHRASES", () => {
  it("has distinct, non-empty, short phrases", () => {
    expect(STORY_PHRASES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(STORY_PHRASES).size).toBe(STORY_PHRASES.length);
    for (const phrase of STORY_PHRASES) {
      expect(phrase.trim()).not.toBe("");
      expect(phrase.length).toBeLessThanOrEqual(40);
    }
  });
});

describe("nextPhrase", () => {
  it("never returns the current phrase, whatever the random value", () => {
    for (const current of STORY_PHRASES) {
      for (const value of [0, 0.25, 0.5, 0.75, 0.9999, 1]) {
        expect(nextPhrase(current, () => value)).not.toBe(current);
      }
    }
  });

  it("can return any phrase when there is no current one", () => {
    const n = STORY_PHRASES.length;
    const seen = new Set(STORY_PHRASES.map((_, i) => nextPhrase(null, () => (i + 0.5) / n)));
    expect(seen.size).toBe(n);
  });

  it("always returns a known phrase, even for a random value of exactly 1", () => {
    expect(STORY_PHRASES).toContain(nextPhrase(null, () => 1));
  });

  it("treats a current phrase that is not in the list as no current phrase", () => {
    expect(STORY_PHRASES).toContain(nextPhrase("otra cosa", () => 0));
  });
});
