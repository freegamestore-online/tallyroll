/**
 * Computer opponent. Every decision is an expected-value comparison over the
 * exact dice distribution, so the AI never needs a sampled simulation.
 *
 *   easy   — random holds, random legal category.
 *   normal — expected value over the hold masks with one roll of lookahead;
 *            category choice by points, ignoring the upper bonus.
 *   hard   — as normal, but looks two rolls ahead on the first decision of a
 *            turn and counts the upper bonus when choosing categories.
 *
 * Yatzy has no Yahtzee bonus in these rules, so "normal" differs from "hard"
 * by the bonus and the lookahead depth rather than by a bonus rule.
 */

import { DICE_COUNT, type Rng } from "../dice/diceEngine";
import {
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORIES,
  scoreCategory,
  type Category,
} from "../scoring/scorer";

export type Difficulty = "easy" | "normal" | "hard";
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

/** What the AI knows about its own score sheet. */
export interface AiSheet {
  /** Categories not yet scored. Every choice must come from this list. */
  readonly open: readonly Category[];
  /** Points already scored in the upper section. */
  readonly upperTotal: number;
}

const FACES = 6;
const MASK_COUNT = 1 << DICE_COUNT;

/** All ways to split `n` dice across six faces, as face counts. */
function compositions(n: number, parts: number): number[][] {
  if (parts === 1) return [[n]];
  const out: number[][] = [];
  for (let first = 0; first <= n; first++) {
    for (const rest of compositions(n - first, parts - 1)) out.push([first, ...rest]);
  }
  return out;
}

const countKey = (counts: readonly number[]) => counts.join(",");

interface Hand {
  /** Face counts, index 0 = face 1. */
  readonly counts: readonly number[];
  /** The same hand as five sorted dice. */
  readonly dice: readonly number[];
}

/** Every distinct five-dice hand, as an unordered multiset: 252 of them. */
const HANDS: readonly Hand[] = compositions(DICE_COUNT, FACES).map((counts) => ({
  counts,
  dice: counts.flatMap((n, face) => Array.from({ length: n }, () => face + 1)),
}));
const HAND_INDEX = new Map(HANDS.map((h, i) => [countKey(h.counts), i]));

interface Transition {
  /** Index into HANDS. */
  readonly hand: number;
  /** Exact probability of landing on that hand. */
  readonly prob: number;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

const transitionCache = new Map<string, readonly Transition[]>();

/**
 * Outcomes of re-rolling the dice not in `held`, given the held face counts.
 * Probabilities are exact multinomials, so the same dice never get enumerated
 * as ordered sequences.
 */
function transitions(held: readonly number[]): readonly Transition[] {
  const key = countKey(held);
  const cached = transitionCache.get(key);
  if (cached) return cached;

  const k = DICE_COUNT - held.reduce((a, b) => a + b, 0);
  const sixPowK = FACES ** k;
  const out: Transition[] = compositions(k, FACES).map((rolled) => {
    const ways = factorial(k) / rolled.reduce((acc, n) => acc * factorial(n), 1);
    const total = held.map((n, face) => n + (rolled[face] ?? 0));
    return { hand: HAND_INDEX.get(countKey(total)) ?? 0, prob: ways / sixPowK };
  });
  transitionCache.set(key, out);
  return out;
}

/** Face counts of the dice that a hold mask keeps. */
function heldCounts(dice: readonly number[], mask: number): number[] {
  const counts = [0, 0, 0, 0, 0, 0];
  dice.forEach((d, i) => {
    if (mask & (1 << i)) counts[d - 1] = (counts[d - 1] ?? 0) + 1;
  });
  return counts;
}

/** Value of a finished hand in one category, with the upper bonus when asked. */
function categoryValue(
  category: Category,
  dice: readonly number[],
  sheet: AiSheet,
  difficulty: Difficulty,
): number {
  const points = scoreCategory(category, dice);
  if (difficulty === "hard" && UPPER_CATEGORIES.includes(category)) {
    const crossesBonus =
      sheet.upperTotal < UPPER_BONUS_THRESHOLD &&
      sheet.upperTotal + points >= UPPER_BONUS_THRESHOLD;
    return points + (crossesBonus ? UPPER_BONUS : 0);
  }
  return points;
}

/** Best open category for each hand: the value of ending the turn there. */
function bestPerHand(sheet: AiSheet, difficulty: Difficulty): Float64Array {
  const best = new Float64Array(HANDS.length);
  HANDS.forEach((hand, i) => {
    best[i] = Math.max(
      ...sheet.open.map((c) => categoryValue(c, hand.dice, sheet, difficulty)),
    );
  });
  return best;
}

/** Expected value of holding `mask` and rolling the rest, given values per hand. */
function expectedAfterReroll(
  dice: readonly number[],
  mask: number,
  valueOf: (hand: number) => number,
): number {
  let e = 0;
  for (const t of transitions(heldCounts(dice, mask))) e += t.prob * valueOf(t.hand);
  return e;
}

/**
 * Choose which dice to hold before the next roll. Returns one flag per die;
 * true means keep it. `rollsLeft` counts rolls still available, including the
 * one this decision is for.
 */
export function chooseHold(
  dice: readonly number[],
  sheet: AiSheet,
  rollsLeft: number,
  rng: Rng,
  difficulty: Difficulty,
): boolean[] {
  if (sheet.open.length === 0) throw new Error("No open categories to play for");

  if (difficulty === "easy") {
    return dice.map(() => rng() < 0.5);
  }

  const best = bestPerHand(sheet, difficulty);
  // Two-roll lookahead: value of a hand with one roll still to come after the
  // next. Computed on demand and memoised for this decision only.
  const afterOneMore = new Float64Array(HANDS.length).fill(Number.NaN);
  const valueAfterOneMore = (hand: number): number => {
    if (Number.isNaN(afterOneMore[hand])) {
      const handDice = HANDS[hand]?.dice ?? [];
      let top = -Infinity;
      for (let mask = 0; mask < MASK_COUNT; mask++) {
        top = Math.max(top, expectedAfterReroll(handDice, mask, (h) => best[h] ?? 0));
      }
      afterOneMore[hand] = top;
    }
    return afterOneMore[hand] ?? 0;
  };

  const lookahead = difficulty === "hard" && rollsLeft >= 2;
  const valueOf = lookahead ? valueAfterOneMore : (h: number) => best[h] ?? 0;

  // Iterate from "hold everything" down so ties keep dice.
  let bestMask = MASK_COUNT - 1;
  let bestValue = -Infinity;
  for (let mask = MASK_COUNT - 1; mask >= 0; mask--) {
    const e = expectedAfterReroll(dice, mask, valueOf);
    if (e > bestValue) {
      bestValue = e;
      bestMask = mask;
    }
  }
  return dice.map((_, i) => (bestMask & (1 << i)) !== 0);
}

/** Choose the category to score now. Always one of `sheet.open`. */
export function chooseCategory(
  dice: readonly number[],
  sheet: AiSheet,
  rng: Rng,
  difficulty: Difficulty,
): Category {
  const { open } = sheet;
  if (open.length === 0) throw new Error("No open categories to play for");

  if (difficulty === "easy") {
    return open[Math.min(open.length - 1, Math.floor(rng() * open.length))] ?? open[0]!;
  }

  let choice = open[0]!;
  let bestValue = -Infinity;
  for (const c of open) {
    const value = categoryValue(c, dice, sheet, difficulty);
    if (value > bestValue) {
      bestValue = value;
      choice = c;
    }
  }
  return choice;
}
