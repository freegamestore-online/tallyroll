import { useEffect, useRef } from "react";
import { useLeaderboard } from "@freegamestore/games";
import { readDailyBest, writeDailyBest } from "../daily/daily";

/** Game id on the FreeGameStore leaderboard. */
export const LEADERBOARD_GAME_ID = "tallyroll";

interface DailySubmitProps {
  date: string;
  score: number;
}

/**
 * Sends a finished daily score to the leaderboard, once, and only when it
 * beats this device's best for the date. Renders nothing. Failures, including
 * "Invalid game", are dropped quietly: the score stays local and the next
 * finished daily tries again.
 */
export function DailySubmit({ date, score }: DailySubmitProps) {
  const { submitScore } = useLeaderboard(LEADERBOARD_GAME_ID);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const best = readDailyBest(date);
    if (best !== null && score <= best) return;

    submitScore(score)
      .then((result) => {
        if (result.ok) writeDailyBest(date, score);
      })
      .catch(() => {
        // Silent by design: a failed submission must never surface to the player.
      });
  }, [date, score, submitScore]);

  return null;
}
