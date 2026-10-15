import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  LOWER_CATEGORIES,
  UPPER_BONUS,
  UPPER_CATEGORIES,
  calculateUpperBonus,
  scoreCategory,
  sheetTotal,
  upperTotal,
  type Category,
  type Scorecard,
} from "./scorer";

function expectScores(category: Category, cases: [number[], number][]) {
  for (const [dice, expected] of cases) {
    expect(scoreCategory(category, dice), `${category} for [${dice}]`).toBe(expected);
  }
}

describe("upper section", () => {
  it("ones sums only the ones", () => {
    expectScores("ones", [
      [[1, 1, 2, 3, 4], 2],
      [[1, 1, 1, 1, 1], 5],
      [[2, 3, 4, 5, 6], 0],
    ]);
  });

  it("twos sums only the twos", () => {
    expectScores("twos", [
      [[2, 2, 3, 4, 5], 4],
      [[2, 2, 2, 2, 2], 10],
      [[1, 3, 4, 5, 6], 0],
    ]);
  });

  it("threes sums only the threes", () => {
    expectScores("threes", [
      [[3, 3, 3, 1, 2], 9],
      [[3, 1, 1, 1, 1], 3],
      [[1, 2, 4, 5, 6], 0],
    ]);
  });

  it("fours sums only the fours", () => {
    expectScores("fours", [
      [[4, 4, 1, 2, 3], 8],
      [[4, 4, 4, 4, 4], 20],
      [[1, 2, 3, 5, 6], 0],
    ]);
  });

  it("fives sums only the fives", () => {
    expectScores("fives", [
      [[5, 5, 5, 1, 2], 15],
      [[5, 1, 2, 3, 4], 5],
      [[1, 2, 3, 4, 6], 0],
    ]);
  });

  it("sixes sums only the sixes", () => {
    expectScores("sixes", [
      [[6, 6, 6, 1, 2], 18],
      [[6, 6, 6, 6, 6], 30],
      [[1, 2, 3, 4, 5], 0],
    ]);
  });
});

describe("upper bonus", () => {
  // Ones=3, twos=6, threes=9, fours=12, fives=15, sixes=18 → 63 at exactly par.
  const par: Scorecard = { ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18 };

  it("awards nothing below 63", () => {
    const scores: Scorecard = { ...par, ones: 2 };
    expect(upperTotal(scores)).toBe(62);
    expect(calculateUpperBonus(scores)).toBe(0);
  });

  it("awards 35 at exactly 63", () => {
    expect(upperTotal(par)).toBe(63);
    expect(calculateUpperBonus(par)).toBe(UPPER_BONUS);
    expect(UPPER_BONUS).toBe(35);
  });

  it("awards 35 above 63", () => {
    const scores: Scorecard = { ...par, sixes: 24 };
    expect(upperTotal(scores)).toBe(69);
    expect(calculateUpperBonus(scores)).toBe(35);
  });

  it("is zero while the upper section is unfinished", () => {
    expect(calculateUpperBonus({ sixes: 30, fives: 25 })).toBe(0);
    expect(calculateUpperBonus({})).toBe(0);
  });

  it("ignores lower-section scores", () => {
    expect(calculateUpperBonus({ ...par, ones: 2, yatzy: 50, chance: 30 })).toBe(0);
  });
});

describe("three of a kind", () => {
  it("sums all five dice when three match", () => {
    expectScores("threeKind", [
      [[3, 3, 3, 1, 2], 12],
      [[2, 2, 2, 6, 6], 18],
    ]);
  });

  it("counts a four of a kind", () => {
    expectScores("threeKind", [[[1, 1, 1, 1, 6], 10]]);
  });

  it("counts five of a kind", () => {
    expectScores("threeKind", [[[5, 5, 5, 5, 5], 25]]);
  });

  it("scores 0 without three matching", () => {
    expectScores("threeKind", [
      [[1, 2, 3, 4, 5], 0],
      [[1, 1, 2, 2, 6], 0],
    ]);
  });
});

describe("four of a kind", () => {
  it("sums all five dice when four match", () => {
    expectScores("fourKind", [
      [[5, 5, 5, 5, 2], 22],
      [[1, 1, 1, 1, 6], 10],
    ]);
  });

  it("counts five of a kind", () => {
    expectScores("fourKind", [[[4, 4, 4, 4, 4], 20]]);
  });

  it("scores 0 without four matching", () => {
    expectScores("fourKind", [
      [[1, 1, 1, 2, 2], 0],
      [[2, 2, 2, 3, 3], 0],
    ]);
  });
});

describe("full house", () => {
  it("scores 25 for three of one face and two of another", () => {
    expectScores("fullHouse", [
      [[2, 2, 3, 3, 3], 25],
      [[6, 6, 6, 1, 1], 25],
      [[1, 1, 4, 4, 4], 25],
    ]);
  });

  it("does not count five of a kind", () => {
    expectScores("fullHouse", [[[4, 4, 4, 4, 4], 0]]);
  });

  it("does not count four of a kind plus a single", () => {
    expectScores("fullHouse", [[[1, 1, 1, 1, 2], 0]]);
  });

  it("scores 0 for two pair and for no pattern", () => {
    expectScores("fullHouse", [
      [[1, 1, 2, 2, 3], 0],
      [[1, 2, 3, 4, 4], 0],
      [[1, 2, 3, 4, 5], 0],
    ]);
  });
});

describe("small straight", () => {
  it("scores 30 for any run of four", () => {
    expectScores("smallStraight", [
      [[1, 2, 3, 4, 6], 30],
      [[2, 3, 4, 5, 5], 30],
      [[3, 4, 5, 6, 6], 30],
      [[1, 2, 3, 4, 4], 30],
    ]);
  });

  it("counts a large straight as a small straight", () => {
    expectScores("smallStraight", [
      [[1, 2, 3, 4, 5], 30],
      [[2, 3, 4, 5, 6], 30],
    ]);
  });

  it("scores 0 without four in a row", () => {
    expectScores("smallStraight", [
      [[1, 2, 3, 5, 6], 0],
      [[1, 1, 3, 4, 6], 0],
    ]);
  });
});

describe("large straight", () => {
  it("scores 40 for 1-2-3-4-5 and 2-3-4-5-6", () => {
    expectScores("largeStraight", [
      [[1, 2, 3, 4, 5], 40],
      [[6, 5, 4, 3, 2], 40],
      [[2, 3, 4, 5, 6], 40],
    ]);
  });

  it("scores 0 for a small straight with a repeat or gap", () => {
    expectScores("largeStraight", [
      [[1, 2, 3, 4, 6], 0],
      [[1, 2, 3, 4, 4], 0],
      [[1, 3, 4, 5, 6], 0],
    ]);
  });
});

describe("yatzy (five of a kind)", () => {
  it("scores 50 for five matching dice", () => {
    expectScores("yatzy", [
      [[6, 6, 6, 6, 6], 50],
      [[1, 1, 1, 1, 1], 50],
    ]);
  });

  it("scores 0 for four of a kind", () => {
    expectScores("yatzy", [[[6, 6, 6, 6, 5], 0]]);
  });
});

describe("chance", () => {
  it("always sums all five dice", () => {
    expectScores("chance", [
      [[1, 2, 3, 4, 5], 15],
      [[6, 6, 6, 6, 6], 30],
      [[1, 1, 1, 1, 1], 5],
    ]);
  });
});

describe("dice validation", () => {
  it("rejects the wrong number of dice", () => {
    expect(() => scoreCategory("chance", [1, 2, 3, 4])).toThrow();
  });

  it("rejects faces outside 1–6", () => {
    expect(() => scoreCategory("chance", [0, 2, 3, 4, 5])).toThrow();
    expect(() => scoreCategory("chance", [1, 2, 3, 4, 7])).toThrow();
    expect(() => scoreCategory("chance", [1, 2, 3, 4, 2.5])).toThrow();
  });
});

describe("sheet totals", () => {
  it("covers all 13 categories, six upper and seven lower", () => {
    expect(CATEGORIES).toHaveLength(13);
    expect(UPPER_CATEGORIES).toHaveLength(6);
    expect(LOWER_CATEGORIES).toHaveLength(7);
  });

  it("adds the upper bonus to the sum of every scored category", () => {
    const scores: Scorecard = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      yatzy: 50,
      chance: 20,
    };
    expect(sheetTotal(scores)).toBe(63 + 35 + 50 + 20);
  });

  it("an empty sheet totals 0", () => {
    expect(sheetTotal({})).toBe(0);
  });
});
