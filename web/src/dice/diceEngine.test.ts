import { describe, expect, it } from "vitest";
import {
  DICE_COUNT,
  MAX_ROLLS,
  UNROLLED,
  canRoll,
  createDiceState,
  resetTurn,
  rollDice,
  rollDie,
  toggleHold,
  type Rng,
} from "./diceEngine";

/** Yields the given numbers in order, then repeats the last one. */
function sequenceRng(...values: number[]): Rng {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

/** Maps a die face to an RNG draw that rollDie will turn back into that face. */
const faceToDraw = (face: number) => (face - 0.5) / 6;

describe("rollDie", () => {
  it("maps the RNG range [0, 1) onto faces 1–6", () => {
    expect(rollDie(() => 0)).toBe(1);
    expect(rollDie(() => faceToDraw(3))).toBe(3);
    expect(rollDie(() => 0.999999)).toBe(6);
  });

  it("always stays within 1–6 over many draws", () => {
    for (let i = 0; i <= 1000; i++) {
      const face = rollDie(() => i / 1000);
      expect(face).toBeGreaterThanOrEqual(1);
      expect(face).toBeLessThanOrEqual(6);
    }
  });
});

describe("createDiceState", () => {
  it("starts with five unrolled, unheld dice and no rolls used", () => {
    const state = createDiceState();
    expect(state.values).toEqual([UNROLLED, UNROLLED, UNROLLED, UNROLLED, UNROLLED]);
    expect(state.held).toEqual([false, false, false, false, false]);
    expect(state.rollsUsed).toBe(0);
    expect(canRoll(state)).toBe(true);
  });
});

describe("rollDice", () => {
  it("rolls all five dice on the first roll", () => {
    const state = rollDice(createDiceState(), sequenceRng(faceToDraw(1), faceToDraw(2), faceToDraw(3), faceToDraw(4), faceToDraw(5)));
    expect(state.values).toEqual([1, 2, 3, 4, 5]);
    expect(state.rollsUsed).toBe(1);
  });

  it("re-rolls only the dice that are not held", () => {
    let state = rollDice(createDiceState(), sequenceRng(faceToDraw(1), faceToDraw(2), faceToDraw(3), faceToDraw(4), faceToDraw(5)));
    state = toggleHold(state, 0);
    state = toggleHold(state, 2);
    state = rollDice(state, sequenceRng(faceToDraw(6), faceToDraw(6), faceToDraw(6), faceToDraw(6), faceToDraw(6)));
    expect(state.values).toEqual([1, 6, 3, 6, 6]);
    expect(state.rollsUsed).toBe(2);
  });

  it("does not change the held flags", () => {
    let state = rollDice(createDiceState(), sequenceRng(0.5));
    state = toggleHold(state, 4);
    const next = rollDice(state, sequenceRng(0));
    expect(next.held).toEqual(state.held);
  });

  it("allows exactly three rolls per turn", () => {
    let state = createDiceState();
    for (let i = 0; i < MAX_ROLLS; i++) {
      expect(canRoll(state)).toBe(true);
      state = rollDice(state, sequenceRng(0));
    }
    expect(state.rollsUsed).toBe(MAX_ROLLS);
    expect(canRoll(state)).toBe(false);
  });

  it("is a no-op after the third roll", () => {
    let state = createDiceState();
    for (let i = 0; i < MAX_ROLLS; i++) state = rollDice(state, sequenceRng(0));
    const after = rollDice(state, sequenceRng(0.99));
    expect(after).toBe(state);
  });

  it("does not mutate the previous state", () => {
    const before = createDiceState();
    rollDice(before, sequenceRng(0.5));
    expect(before.values).toEqual([UNROLLED, UNROLLED, UNROLLED, UNROLLED, UNROLLED]);
    expect(before.rollsUsed).toBe(0);
  });
});

describe("toggleHold", () => {
  it("is ignored before the first roll", () => {
    const state = createDiceState();
    expect(toggleHold(state, 0)).toBe(state);
  });

  it("holds and unholds a die between rolls", () => {
    let state = rollDice(createDiceState(), sequenceRng(0.5));
    state = toggleHold(state, 1);
    expect(state.held[1]).toBe(true);
    state = toggleHold(state, 1);
    expect(state.held[1]).toBe(false);
  });

  it("only flips the die it is given", () => {
    let state = rollDice(createDiceState(), sequenceRng(0.5));
    state = toggleHold(state, 3);
    expect(state.held).toEqual([false, false, false, true, false]);
  });

  it("is ignored after the last roll", () => {
    let state = createDiceState();
    for (let i = 0; i < MAX_ROLLS; i++) state = rollDice(state, sequenceRng(0));
    expect(toggleHold(state, 0)).toBe(state);
  });

  it("ignores out-of-range indexes", () => {
    const state = rollDice(createDiceState(), sequenceRng(0.5));
    expect(toggleHold(state, -1)).toBe(state);
    expect(toggleHold(state, DICE_COUNT)).toBe(state);
  });
});

describe("resetTurn", () => {
  it("returns a fresh turn after a full round of rolls and holds", () => {
    let state = rollDice(createDiceState(), sequenceRng(0.5));
    state = toggleHold(state, 0);
    state = rollDice(state, sequenceRng(0.9));
    state = rollDice(state, sequenceRng(0.1));
    expect(canRoll(state)).toBe(false);

    const next = resetTurn();
    expect(next).toEqual(createDiceState());
    expect(canRoll(next)).toBe(true);
    expect(next.held.some(Boolean)).toBe(false);
  });
});
