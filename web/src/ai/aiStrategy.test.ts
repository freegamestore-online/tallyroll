import { describe, expect, it } from "vitest";
import { DIFFICULTIES, chooseCategory, chooseHold, type AiSheet, type Difficulty } from "./aiStrategy";
import { CATEGORIES, type Category } from "../scoring/scorer";
import { createRng } from "../rng";
import { aiStep, createMatch, isFinished, totalOf, type Match } from "../game/match";

const ALL: Category[] = [...CATEGORIES];

/** Random legal sheet and dice drawn from a seeded RNG. */
function randomState(seed: number) {
  const rng = createRng(seed);
  const dice = Array.from({ length: 5 }, () => Math.floor(rng() * 6) + 1);
  const open = ALL.filter(() => rng() < 0.6);
  if (open.length === 0) open.push(ALL[Math.floor(rng() * ALL.length)] ?? "chance");
  const upperTotal = Math.floor(rng() * 64);
  const rollsLeft = 1 + Math.floor(rng() * 2);
  return { dice, sheet: { open, upperTotal } satisfies AiSheet, rollsLeft, rng };
}

describe("AI always chooses a legal move", () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: category is always an open one`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const { dice, sheet, rng } = randomState(seed);
        const choice = chooseCategory(dice, sheet, rng, difficulty);
        expect(sheet.open, `seed ${seed}`).toContain(choice);
      }
    });

    it(`${difficulty}: holds are one flag per die`, () => {
      for (let seed = 1; seed <= 300; seed++) {
        const { dice, sheet, rollsLeft, rng } = randomState(seed);
        const held = chooseHold(dice, sheet, rollsLeft, rng, difficulty);
        expect(held).toHaveLength(5);
        expect(held.every((h) => typeof h === "boolean")).toBe(true);
      }
    });

    it(`${difficulty}: with one category left, it must take that one`, () => {
      for (let seed = 1; seed <= 50; seed++) {
        const { dice, rng } = randomState(seed);
        const sheet = { open: ["sixes"] as Category[], upperTotal: 0 };
        expect(chooseCategory(dice, sheet, rng, difficulty)).toBe("sixes");
      }
    });
  }

  it("refuses to choose when nothing is open", () => {
    const rng = createRng(1);
    for (const difficulty of DIFFICULTIES) {
      expect(() => chooseCategory([1, 2, 3, 4, 5], { open: [], upperTotal: 0 }, rng, difficulty)).toThrow();
    }
  });
});

describe("AI decisions", () => {
  const fresh: AiSheet = { open: ALL, upperTotal: 0 };

  it("hard keeps a four of a kind on the first decision", () => {
    const held = chooseHold([6, 6, 6, 6, 2], fresh, 2, createRng(1), "hard");
    expect(held.slice(0, 4)).toEqual([true, true, true, true]);
  });

  it("normal keeps a five of a kind rather than rolling it away", () => {
    const held = chooseHold([5, 5, 5, 5, 5], fresh, 1, createRng(1), "normal");
    expect(held).toEqual([true, true, true, true, true]);
  });

  it("takes yatzy when it is on the table", () => {
    for (const difficulty of ["normal", "hard"] as Difficulty[]) {
      expect(chooseCategory([4, 4, 4, 4, 4], fresh, createRng(1), difficulty)).toBe("yatzy");
    }
  });

  it("hard counts the upper bonus when it crosses 63; normal does not", () => {
    // Dice sum to 15. Upper total 60 + fours (12) crosses the bonus line.
    const dice = [4, 4, 4, 1, 2];
    const sheet: AiSheet = { open: ["threeKind", "chance", "fours"], upperTotal: 60 };
    expect(chooseCategory(dice, sheet, createRng(1), "hard")).toBe("fours");
    expect(chooseCategory(dice, sheet, createRng(1), "normal")).toBe("threeKind");
  });
});

/** Play a single computer player through a full solo game. */
function playSolo(difficulty: Difficulty, seed: number): Match {
  const rng = createRng(seed);
  let match: Match = {
    ...createMatch({ mode: "solo" }),
    players: [{ name: "AI", scores: {}, ai: difficulty }],
  };
  let steps = 0;
  while (!isFinished(match)) {
    match = aiStep(match, rng);
    if (++steps > 1000) throw new Error("AI game did not finish");
  }
  return match;
}

describe("seeded strength", () => {
  // Same seeds for every difficulty, so the comparison is deterministic.
  const SEEDS = Array.from({ length: 20 }, (_, i) => 1000 + i * 7919);

  it("completes every seeded game with all 13 categories filled and no illegal claim", () => {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const match = playSolo(difficulty, seed);
        expect(Object.keys(match.players[0]?.scores ?? {})).toHaveLength(13);
      }
    }
  });

  it("hard beats easy over the same 20 seeded games", () => {
    const hard = SEEDS.reduce((sum, s) => sum + totalOf(playSolo("hard", s).players[0]!), 0);
    const easy = SEEDS.reduce((sum, s) => sum + totalOf(playSolo("easy", s).players[0]!), 0);
    expect(hard).toBeGreaterThan(easy);
  });

  it("normal beats easy over the same 20 seeded games", () => {
    const normal = SEEDS.reduce((sum, s) => sum + totalOf(playSolo("normal", s).players[0]!), 0);
    const easy = SEEDS.reduce((sum, s) => sum + totalOf(playSolo("easy", s).players[0]!), 0);
    expect(normal).toBeGreaterThan(easy);
  });
});
