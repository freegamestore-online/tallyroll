import { describe, expect, it } from "vitest";
import { isFiveOfAKind } from "./fiveOfAKind";

describe("isFiveOfAKind", () => {
  it("is true for five matching rolled dice, whatever the face", () => {
    for (let face = 1; face <= 6; face++) {
      expect(isFiveOfAKind([face, face, face, face, face])).toBe(true);
    }
  });

  it("is false for four of a kind or a full house", () => {
    expect(isFiveOfAKind([6, 6, 6, 6, 5])).toBe(false);
    expect(isFiveOfAKind([2, 2, 3, 3, 3])).toBe(false);
  });

  it("is false before the first roll, when dice read 0", () => {
    expect(isFiveOfAKind([0, 0, 0, 0, 0])).toBe(false);
  });

  it("is false for the wrong number of dice", () => {
    expect(isFiveOfAKind([4, 4, 4, 4])).toBe(false);
  });
});
