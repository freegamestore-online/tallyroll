import type { Rng } from "./dice/diceEngine";

/**
 * Seeded pseudo-random generator (mulberry32). Same seed, same sequence, so
 * AI-vs-AI tests and replays are deterministic. Returns values in [0, 1).
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seeded roll stream whose position can be saved and restored. */
export interface SeededStream {
  readonly rng: Rng;
  /** Number of values drawn so far. Together with the seed, this is the stream's state. */
  draws(): number;
}

/**
 * Seeded stream that can resume mid-sequence. Restoring replays `draws`
 * values, so a saved game continues with the same rolls it would have had.
 */
export function createSeededStream(seed: number, draws = 0): SeededStream {
  const base = createRng(seed);
  let count = 0;
  for (; count < draws; count++) base();
  return {
    rng: () => {
      count++;
      return base();
    },
    draws: () => count,
  };
}
