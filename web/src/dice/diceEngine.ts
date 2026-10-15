/**
 * Framework-agnostic dice state for one Yatzy turn: five dice, up to three
 * rolls, tap-to-hold between rolls. Every function returns a new state so the
 * UI can store it directly; the RNG is injectable so tests stay deterministic.
 */

export const DICE_COUNT = 5;
export const MAX_ROLLS = 3;

/** Value of a die that has not been rolled yet this turn. */
export const UNROLLED = 0;

export type Rng = () => number;

export interface DiceState {
  /** Face values 1–6, or UNROLLED before the first roll of the turn. */
  readonly values: readonly number[];
  readonly held: readonly boolean[];
  readonly rollsUsed: number;
}

/** A fresh turn: nothing rolled, nothing held. */
export function createDiceState(): DiceState {
  return {
    values: Array.from({ length: DICE_COUNT }, () => UNROLLED),
    held: Array.from({ length: DICE_COUNT }, () => false),
    rollsUsed: 0,
  };
}

/** Uniform die roll in 1–6. */
export function rollDie(rng: Rng = Math.random): number {
  return Math.min(6, Math.floor(rng() * 6) + 1);
}

export function canRoll(state: DiceState): boolean {
  return state.rollsUsed < MAX_ROLLS;
}

/**
 * Re-roll every die that is not held. Returns the state unchanged once all
 * rolls for the turn are spent.
 */
export function rollDice(state: DiceState, rng: Rng = Math.random): DiceState {
  if (!canRoll(state)) return state;
  return {
    values: state.values.map((value, i) => (state.held[i] ? value : rollDie(rng))),
    held: state.held,
    rollsUsed: state.rollsUsed + 1,
  };
}

/**
 * Toggle hold on one die. Holding only makes sense between rolls: it is
 * ignored before the first roll and after the last one.
 */
export function toggleHold(state: DiceState, index: number): DiceState {
  if (state.rollsUsed === 0 || state.rollsUsed >= MAX_ROLLS) return state;
  if (index < 0 || index >= DICE_COUNT) return state;
  return {
    values: state.values,
    held: state.held.map((held, i) => (i === index ? !held : held)),
    rollsUsed: state.rollsUsed,
  };
}

/**
 * Set the whole hold pattern at once, e.g. from an AI choosing holds. Like
 * toggleHold, it is ignored before the first roll and after the last one.
 */
export function setHeld(state: DiceState, held: readonly boolean[]): DiceState {
  if (state.rollsUsed === 0 || state.rollsUsed >= MAX_ROLLS) return state;
  return { values: state.values, held: held.slice(0, DICE_COUNT), rollsUsed: state.rollsUsed };
}

/** Start the next turn. Call after a category has been scored. */
export function resetTurn(): DiceState {
  return createDiceState();
}
