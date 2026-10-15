import { useEffect, useState } from "react";
import { GameAuth, GameButton, GameShell, GameTopbar } from "@freegamestore/games";
import type { Rng } from "./dice/diceEngine";
import { useHighScore } from "./hooks/useHighScore";
import {
  aiStep,
  claim,
  createMatch,
  holdCurrent,
  isAiTurn,
  isFinished,
  rollCurrent,
  totalOf,
  type Match,
  type MatchConfig,
} from "./game/match";
import { Board } from "./ui/Board";
import { ModeSelector } from "./ui/ModeSelector";
import { Results } from "./ui/Results";
import type { Category } from "./scoring/scorer";

/** Pause between computer moves so each one is visible. */
const AI_STEP_MS = 650;
const SOLO_BEST_KEY = "tallyroll:solo-best";
const rng: Rng = Math.random;

export default function App() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [soloBest, recordSolo] = useHighScore(SOLO_BEST_KEY);

  function start(next: MatchConfig) {
    setConfig(next);
    setMatch(createMatch(next));
  }

  function toMenu() {
    setConfig(null);
    setMatch(null);
  }

  // Computer turns advance one step per timer tick, so each move is visible.
  useEffect(() => {
    if (!match || !isAiTurn(match)) return;
    const timer = window.setTimeout(
      () => setMatch((m) => (m && isAiTurn(m) ? aiStep(m, rng) : m)),
      AI_STEP_MS,
    );
    return () => window.clearTimeout(timer);
  }, [match]);

  // Solo games count toward the high score once they finish.
  useEffect(() => {
    if (match?.mode === "solo" && isFinished(match)) {
      recordSolo(totalOf(match.players[0]!));
    }
  }, [match, recordSolo]);

  // Human actions are ignored on computer turns.
  const roll = () => setMatch((m) => (m && !isAiTurn(m) ? rollCurrent(m, rng) : m));
  const hold = (i: number) => setMatch((m) => (m && !isAiTurn(m) ? holdCurrent(m, i) : m));
  const score = (c: Category) => setMatch((m) => (m && !isAiTurn(m) ? claim(m, c) : m));

  const current = match?.players[match.current];
  const topbar = (
    <GameTopbar
      title="Tallyroll"
      stats={
        match
          ? [{ label: "Total", value: current ? totalOf(current) : 0, accent: true }]
          : [{ label: "Best", value: soloBest, accent: true }]
      }
      actions={
        <>
          <GameAuth />
          {match && (
            <GameButton size="sm" variant="ghost" onClick={toMenu}>
              Menu
            </GameButton>
          )}
        </>
      }
    />
  );

  return (
    <GameShell topbar={topbar}>
      {!match ? (
        <ModeSelector best={soloBest} onStart={start} />
      ) : isFinished(match) ? (
        <Results match={match} onAgain={() => config && start(config)} onMenu={toMenu} />
      ) : (
        <Board match={match} onRoll={roll} onHold={hold} onClaim={score} />
      )}
    </GameShell>
  );
}
