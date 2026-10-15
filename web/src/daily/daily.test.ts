import { describe, expect, it } from "vitest";
import { claim, createMatch, openCategories, rollCurrent, withRandomness, type Match } from "../game/match";
import { getDailyChallengeSeed, seedForDateKey, utcDateKey } from "./daily";

/** Fallback that must never be used: daily rolls have to come from the seed. */
const forbidden = () => {
  throw new Error("daily roll used Math.random instead of the seeded stream");
};

/** Play `turns` full turns (three rolls, then score the first open category) and return every roll's faces. */
function rollSequence(date: string, turns: number): number[][] {
  let match: Match = createMatch({ mode: "daily", date });
  const rolls: number[][] = [];
  for (let t = 0; t < turns; t++) {
    for (let r = 0; r < 3; r++) {
      match = withRandomness(match, forbidden, (rng) => rollCurrent(match, rng));
      rolls.push([...match.dice.values]);
    }
    match = claim(match, openCategories(match.players[0]!)[0]!);
  }
  return rolls;
}

describe("utcDateKey", () => {
  it("uses the UTC calendar date, not the local one", () => {
    // 23:30 on 16 Oct in UTC−5 is 04:30 on 17 Oct in UTC.
    expect(utcDateKey(new Date("2026-10-16T23:30:00-05:00"))).toBe("2026-10-17");
  });
});

describe("getDailyChallengeSeed", () => {
  it("is the same for any time on the same UTC date", () => {
    expect(getDailyChallengeSeed(new Date("2026-10-16T00:00:00Z"))).toBe(
      getDailyChallengeSeed(new Date("2026-10-16T23:59:59Z")),
    );
  });

  it("changes from one UTC date to the next", () => {
    expect(getDailyChallengeSeed(new Date("2026-10-16T12:00:00Z"))).not.toBe(
      getDailyChallengeSeed(new Date("2026-10-17T12:00:00Z")),
    );
  });

  it("is an unsigned 32-bit integer", () => {
    const seed = seedForDateKey("2026-10-16");
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("daily roll sequence", () => {
  it("gives the same roll sequence for the same UTC date", () => {
    expect(rollSequence("2026-10-16", 4)).toEqual(rollSequence("2026-10-16", 4));
  });

  it("gives different roll sequences for different dates", () => {
    expect(rollSequence("2026-10-16", 4)).not.toEqual(rollSequence("2026-10-17", 4));
  });

  it("only produces faces 1–6", () => {
    for (const roll of rollSequence("2026-10-16", 4)) {
      for (const face of roll) {
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(6);
      }
    }
  });
});
