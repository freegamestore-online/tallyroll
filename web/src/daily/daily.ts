/**
 * Daily challenge: one shared roll sequence per UTC date. Everyone who plays
 * on the same date gets the same dice for the same sequence of actions.
 */

/** The UTC calendar date as YYYY-MM-DD. */
export function utcDateKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** 32-bit FNV-1a hash of the date key, so neighbouring dates get unrelated seeds. */
export function seedForDateKey(key: string): number {
  let hash = 0x811c9dc5;
  for (const ch of `tallyroll:daily:${key}`) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Seed for the daily challenge on the UTC date of `date` (default: now). */
export function getDailyChallengeSeed(date: Date = new Date()): number {
  return seedForDateKey(utcDateKey(date));
}

const bestKey = (date: string) => `tallyroll:daily-best:${date}`;

/** Best daily score the player has recorded for `date` on this device. */
export function readDailyBest(date: string): number | null {
  try {
    const raw = localStorage.getItem(bestKey(date));
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeDailyBest(date: string, score: number): void {
  try {
    localStorage.setItem(bestKey(date), String(score));
  } catch {
    // Ignored: the best score is only a convenience on this device.
  }
}
