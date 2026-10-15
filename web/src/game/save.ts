/**
 * Save and resume an in-progress match in localStorage. The stored value is
 * the whole Match, so a reload continues exactly where play stopped, including
 * the dice, holds and roll count, and the daily stream's position.
 */

import { DIFFICULTIES } from "../ai/aiStrategy";
import { CATEGORIES, type Scorecard } from "../scoring/scorer";
import type { DiceState } from "../dice/diceEngine";
import { MAX_PLAYERS, MIN_PLAYERS, type GameMode, type Match, type PlayerState } from "./match";

export const SAVED_GAME_KEY = "tallyroll_saved_game";
const FORMAT_VERSION = 1;
const DICE_COUNT = 5;
const MAX_ROLLS = 3;
const MODES: readonly GameMode[] = ["solo", "passAndPlay", "vsAi", "daily"];

export function serializeMatch(match: Match): string {
  return JSON.stringify({ v: FORMAT_VERSION, match });
}

const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

function isDice(value: unknown): value is DiceState {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    Array.isArray(d.values) &&
    d.values.length === DICE_COUNT &&
    d.values.every((v) => isInt(v, 0, 6)) &&
    Array.isArray(d.held) &&
    d.held.length === DICE_COUNT &&
    d.held.every((h) => typeof h === "boolean") &&
    isInt(d.rollsUsed, 0, MAX_ROLLS)
  );
}

function isScorecard(value: unknown): value is Scorecard {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(
    // 50 is the highest score any single category can take (Yatzy).
    ([key, score]) => (CATEGORIES as readonly string[]).includes(key) && isInt(score, 0, 50),
  );
}

function isPlayer(value: unknown): value is PlayerState {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === "string" &&
    p.name.length > 0 &&
    p.name.length <= 40 &&
    isScorecard(p.scores) &&
    (p.ai === undefined || DIFFICULTIES.includes(p.ai as never))
  );
}

/** Check that an untrusted object is a Match this build can resume. */
function isMatch(value: unknown): value is Match {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  if (!MODES.includes(m.mode as GameMode)) return false;
  if (!Array.isArray(m.players) || !m.players.every(isPlayer)) return false;

  const count = m.players.length;
  const countOk =
    m.mode === "solo" || m.mode === "daily"
      ? count === 1
      : m.mode === "vsAi"
        ? count === 2
        : count >= MIN_PLAYERS && count <= MAX_PLAYERS;
  if (!countOk) return false;
  if (!isInt(m.current, 0, count - 1) || !isDice(m.dice)) return false;

  if (m.mode === "daily") {
    const d = m.daily as Record<string, unknown> | undefined;
    return (
      typeof d === "object" &&
      d !== null &&
      typeof d.date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
      isInt(d.seed, 0, 0xffffffff) &&
      isInt(d.draws, 0, Number.MAX_SAFE_INTEGER)
    );
  }
  return m.daily === undefined;
}

/** Parse a saved value. Returns null for anything missing, unreadable or from another format. */
export function parseSavedMatch(raw: string | null): Match | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: unknown; match?: unknown };
    if (parsed.v !== FORMAT_VERSION || !isMatch(parsed.match)) return null;
    return parsed.match as Match;
  } catch {
    return null;
  }
}

/** Storage can be blocked (private mode, quota). Failing to save should never break play. */
export function saveGame(match: Match): void {
  try {
    localStorage.setItem(SAVED_GAME_KEY, serializeMatch(match));
  } catch {
    // Ignored: the game still works without a save.
  }
}

export function loadSavedGame(): Match | null {
  try {
    return parseSavedMatch(localStorage.getItem(SAVED_GAME_KEY));
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch {
    // Ignored, as above.
  }
}
