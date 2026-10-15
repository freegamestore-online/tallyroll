/**
 * A match: one or more players taking turns on the same score-sheet engine.
 * Every transition is a pure function, so AI turns and human turns share the
 * same code path and the same tests.
 */

import {
  MAX_ROLLS,
  canRoll,
  createDiceState,
  resetTurn,
  rollDice,
  setHeld,
  toggleHold,
  type DiceState,
  type Rng,
} from "../dice/diceEngine";
import { chooseCategory, chooseHold, type Difficulty } from "../ai/aiStrategy";
import {
  CATEGORIES,
  scoreCategory,
  sheetTotal,
  upperTotal,
  type Category,
  type Scorecard,
} from "../scoring/scorer";

export type GameMode = "solo" | "passAndPlay" | "vsAi";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;

export type MatchConfig =
  | { mode: "solo" }
  | { mode: "passAndPlay"; players: number }
  | { mode: "vsAi"; difficulty: Difficulty };

export interface PlayerState {
  readonly name: string;
  readonly scores: Scorecard;
  /** Set for computer players; undefined for humans. */
  readonly ai?: Difficulty;
}

export interface Match {
  readonly mode: GameMode;
  readonly players: readonly PlayerState[];
  /** Index of the player whose turn it is. */
  readonly current: number;
  readonly dice: DiceState;
}

export function createMatch(config: MatchConfig): Match {
  let players: PlayerState[];
  switch (config.mode) {
    case "solo":
      players = [{ name: "You", scores: {} }];
      break;
    case "passAndPlay":
      if (config.players < MIN_PLAYERS || config.players > MAX_PLAYERS) {
        throw new Error(`Pass & play needs ${MIN_PLAYERS}–${MAX_PLAYERS} players`);
      }
      players = Array.from({ length: config.players }, (_, i) => ({
        name: `Player ${i + 1}`,
        scores: {},
      }));
      break;
    case "vsAi":
      players = [
        { name: "You", scores: {} },
        { name: "AI", scores: {}, ai: config.difficulty },
      ];
      break;
  }
  return { mode: config.mode, players, current: 0, dice: createDiceState() };
}

export function openCategories(player: PlayerState): Category[] {
  return CATEGORIES.filter((c) => player.scores[c] === undefined);
}

export function isFinished(match: Match): boolean {
  return match.players.every((p) => openCategories(p).length === 0);
}

export function isAiTurn(match: Match): boolean {
  return !isFinished(match) && match.players[match.current]?.ai !== undefined;
}

export function totalOf(player: PlayerState): number {
  return sheetTotal(player.scores);
}

/** Indices of the players tied for the highest total. */
export function winners(match: Match): number[] {
  const best = Math.max(...match.players.map(totalOf));
  return match.players.flatMap((p, i) => (totalOf(p) === best ? [i] : []));
}

export function rollCurrent(match: Match, rng: Rng): Match {
  if (!canRoll(match.dice)) return match;
  return { ...match, dice: rollDice(match.dice, rng) };
}

export function holdCurrent(match: Match, index: number): Match {
  const dice = toggleHold(match.dice, index);
  return dice === match.dice ? match : { ...match, dice };
}

/**
 * Score the current dice in `category` and pass the turn. Throws if the
 * category is already filled or the dice have not been rolled this turn.
 */
export function claim(match: Match, category: Category): Match {
  const player = match.players[match.current];
  if (!player) throw new Error("No current player");
  if (match.dice.rollsUsed === 0) throw new Error("Roll before scoring");
  if (player.scores[category] !== undefined) throw new Error(`${category} is already scored`);

  const scored: PlayerState = {
    ...player,
    scores: { ...player.scores, [category]: scoreCategory(category, match.dice.values) },
  };
  const players = match.players.map((p, i) => (i === match.current ? scored : p));
  return {
    ...match,
    players,
    current: (match.current + 1) % match.players.length,
    dice: resetTurn(),
  };
}

/**
 * Advance the computer player by one step: roll, hold-and-roll, or score.
 * Returns the match unchanged when it is not an AI turn. The UI calls this on
 * a timer so AI moves are visible.
 */
export function aiStep(match: Match, rng: Rng): Match {
  if (!isAiTurn(match)) return match;
  const player = match.players[match.current];
  const difficulty = player?.ai;
  if (!player || !difficulty) return match;

  const sheet = { open: openCategories(player), upperTotal: upperTotal(player.scores) };
  const { dice } = match;

  if (dice.rollsUsed === 0) {
    return { ...match, dice: rollDice(dice, rng) };
  }
  if (canRoll(dice)) {
    const rollsLeft = MAX_ROLLS - dice.rollsUsed;
    const held = chooseHold(dice.values, sheet, rollsLeft, rng, difficulty);
    return { ...match, dice: rollDice(setHeld(dice, held), rng) };
  }
  return claim(match, chooseCategory(dice.values, sheet, rng, difficulty));
}
