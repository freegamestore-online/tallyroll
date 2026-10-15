/**
 * Public-domain Yatzy scoring. Pure functions over a five-die array; no UI or
 * state here, so every rule is unit-testable on its own.
 */

export const CATEGORIES = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeKind",
  "fourKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yatzy",
  "chance",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const UPPER_CATEGORIES = CATEGORIES.slice(0, 6) as readonly Category[];
export const LOWER_CATEGORIES = CATEGORIES.slice(6) as readonly Category[];

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;

export const FULL_HOUSE_SCORE = 25;
export const SMALL_STRAIGHT_SCORE = 30;
export const LARGE_STRAIGHT_SCORE = 40;
export const YATZY_SCORE = 50;

/** Scored categories for a sheet. Missing keys are still unclaimed. */
export type Scorecard = Partial<Record<Category, number>>;

const DICE_COUNT = 5;

function assertDice(dice: readonly number[]): void {
  if (dice.length !== DICE_COUNT || dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
    throw new Error(`Expected ${DICE_COUNT} dice with faces 1–6, got [${dice.join(", ")}]`);
  }
}

/** How many dice show each face; index 1–6 is used, index 0 stays 0. */
function faceCounts(dice: readonly number[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d] = (counts[d] ?? 0) + 1;
  return counts;
}

function sum(dice: readonly number[]): number {
  return dice.reduce((total, d) => total + d, 0);
}

/** Score one category for the given dice. Dice must be five faces 1–6. */
export function scoreCategory(category: Category, dice: readonly number[]): number {
  assertDice(dice);
  const counts = faceCounts(dice);
  const maxCount = Math.max(...counts);
  const distinct = new Set(dice);

  switch (category) {
    case "ones":
    case "twos":
    case "threes":
    case "fours":
    case "fives":
    case "sixes": {
      const face = UPPER_CATEGORIES.indexOf(category) + 1;
      return face * (counts[face] ?? 0);
    }
    case "threeKind":
      return maxCount >= 3 ? sum(dice) : 0;
    case "fourKind":
      return maxCount >= 4 ? sum(dice) : 0;
    case "fullHouse": {
      // Exactly three of one face and two of another. Five of a kind is not a
      // full house in standard Yatzy.
      const pairs = counts.filter((c) => c > 0).sort((a, b) => a - b);
      return pairs.length === 2 && pairs[0] === 2 && pairs[1] === 3 ? FULL_HOUSE_SCORE : 0;
    }
    case "smallStraight": {
      const runs = [
        [1, 2, 3, 4],
        [2, 3, 4, 5],
        [3, 4, 5, 6],
      ];
      return runs.some((run) => run.every((f) => distinct.has(f))) ? SMALL_STRAIGHT_SCORE : 0;
    }
    case "largeStraight": {
      const runs = [
        [1, 2, 3, 4, 5],
        [2, 3, 4, 5, 6],
      ];
      return runs.some((run) => run.every((f) => distinct.has(f)) && distinct.size === 5)
        ? LARGE_STRAIGHT_SCORE
        : 0;
    }
    case "yatzy":
      return maxCount === DICE_COUNT ? YATZY_SCORE : 0;
    case "chance":
      return sum(dice);
  }
}

/** Sum of the six upper-section categories that have a score. */
export function upperTotal(scores: Scorecard): number {
  return UPPER_CATEGORIES.reduce((total, c) => total + (scores[c] ?? 0), 0);
}

/** 35 once the upper section reaches 63; otherwise 0. */
export function calculateUpperBonus(upperScores: Scorecard): number {
  return upperTotal(upperScores) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
}

/** Full sheet total: every scored category plus the upper bonus. */
export function sheetTotal(scores: Scorecard): number {
  const base = CATEGORIES.reduce((total, c) => total + (scores[c] ?? 0), 0);
  return base + calculateUpperBonus(scores);
}
