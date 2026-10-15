import { beforeEach, describe, expect, it } from "vitest";
import { claim, createMatch, holdCurrent, openCategories, rollCurrent, withRandomness, type Match } from "./match";
import {
  SAVED_GAME_KEY,
  clearSavedGame,
  loadSavedGame,
  parseSavedMatch,
  saveGame,
  serializeMatch,
} from "./save";

const DATE = "2026-10-16";
/** Daily rolls must come from the seed, so any fallback use is a bug. */
const forbidden = () => {
  throw new Error("used Math.random");
};

/** A daily match part-way through a turn: rolled twice, one die held. */
function midTurn(): Match {
  let m = createMatch({ mode: "daily", date: DATE });
  m = withRandomness(m, forbidden, (r) => rollCurrent(m, r));
  m = holdCurrent(m, 1);
  m = withRandomness(m, forbidden, (r) => rollCurrent(m, r));
  return m;
}

describe("save round-trip", () => {
  it("restores a mid-turn daily match exactly", () => {
    const original = midTurn();
    const restored = parseSavedMatch(serializeMatch(original));
    expect(restored).toEqual(original);
  });

  it("restores a pass & play match with scores on several sheets", () => {
    let m = createMatch({ mode: "passAndPlay", players: 3 });
    for (let turn = 0; turn < 4; turn++) {
      m = claim(rollCurrent(m, () => 0.5), openCategories(m.players[m.current]!)[0]!);
    }
    expect(parseSavedMatch(serializeMatch(m))).toEqual(m);
  });

  it("resumes with the same rolls as an uninterrupted game", () => {
    // Uninterrupted: roll, hold, roll, roll.
    let straight = createMatch({ mode: "daily", date: DATE });
    straight = withRandomness(straight, forbidden, (r) => rollCurrent(straight, r));
    straight = holdCurrent(straight, 1);
    straight = withRandomness(straight, forbidden, (r) => rollCurrent(straight, r));
    straight = withRandomness(straight, forbidden, (r) => rollCurrent(straight, r));

    // Interrupted after the first roll: save, reload, carry on.
    let resumed = createMatch({ mode: "daily", date: DATE });
    resumed = withRandomness(resumed, forbidden, (r) => rollCurrent(resumed, r));
    resumed = parseSavedMatch(serializeMatch(resumed))!;
    resumed = holdCurrent(resumed, 1);
    resumed = withRandomness(resumed, forbidden, (r) => rollCurrent(resumed, r));
    resumed = withRandomness(resumed, forbidden, (r) => rollCurrent(resumed, r));

    expect(resumed.dice.values).toEqual(straight.dice.values);
    expect(resumed.daily?.draws).toBe(straight.daily?.draws);
  });
});

describe("parseSavedMatch", () => {
  const valid = JSON.parse(serializeMatch(midTurn())) as { v: number; match: Record<string, unknown> };

  it("returns null for missing or unreadable data", () => {
    expect(parseSavedMatch(null)).toBeNull();
    expect(parseSavedMatch("")).toBeNull();
    expect(parseSavedMatch("{not json")).toBeNull();
  });

  it("returns null for another format version", () => {
    expect(parseSavedMatch(JSON.stringify({ ...valid, v: 99 }))).toBeNull();
  });

  it("returns null when the dice are out of range", () => {
    const bad = { ...valid, match: { ...valid.match, dice: { ...(valid.match.dice as object), values: [1, 2, 3, 4, 7] } } };
    expect(parseSavedMatch(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when the player count does not fit the mode", () => {
    const bad = { ...valid, match: { ...valid.match, players: [] } };
    expect(parseSavedMatch(JSON.stringify(bad))).toBeNull();
  });

  it("returns null for a daily match without its seed", () => {
    const bad = { ...valid, match: { ...valid.match, daily: undefined } };
    expect(parseSavedMatch(JSON.stringify(bad))).toBeNull();
  });

  it("returns null for an unknown scoring category", () => {
    const match = valid.match as { players: { scores: Record<string, number> }[] };
    match.players[0]!.scores = { bogus: 5 };
    expect(parseSavedMatch(JSON.stringify(valid))).toBeNull();
  });
});

describe("localStorage", () => {
  beforeEach(() => localStorage.clear());

  it("stores under the saved-game key and loads it back", () => {
    const m = midTurn();
    saveGame(m);
    expect(localStorage.getItem(SAVED_GAME_KEY)).not.toBeNull();
    expect(loadSavedGame()).toEqual(m);
  });

  it("clears the saved game", () => {
    saveGame(midTurn());
    clearSavedGame();
    expect(loadSavedGame()).toBeNull();
  });

  it("returns null when nothing has been saved", () => {
    expect(loadSavedGame()).toBeNull();
  });
});
