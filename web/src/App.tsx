import { useCallback, useEffect, useState } from "react";
import { GameAuth, GameShell, GameTopbar } from "@freegamestore/games";
import type { Rng } from "./dice/diceEngine";
import { readDailyBest, utcDateKey } from "./daily/daily";
import { Celebration } from "./feel/Celebration";
import { isFiveOfAKind } from "./feel/fiveOfAKind";
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
  withRandomness,
  type Match,
  type MatchConfig,
} from "./game/match";
import { clearSavedGame, loadSavedGame, saveGame } from "./game/save";
import { Board } from "./ui/Board";
import { DailySubmit } from "./ui/DailySubmit";
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
  const [savedGame, setSavedGame] = useState<Match | null>(loadSavedGame);
  const [soloBest, recordSolo] = useHighScore(SOLO_BEST_KEY);
  // The roll whose five-of-a-kind burst has already played. Holds don't change
  // the signature, so toggling a die never replays it.
  const [celebrated, setCelebrated] = useState("");
  const celebrationDone = useCallback((id: string) => setCelebrated(id), []);

  function start(next: MatchConfig) {
    setConfig(next);
    setMatch(createMatch(next));
    setSavedGame(null);
  }

  function resume() {
    if (!savedGame) return;
    setConfig(null);
    setMatch(savedGame);
    setSavedGame(null);
  }

  function discard() {
    clearSavedGame();
    setSavedGame(null);
  }

  function toMenu() {
    setConfig(null);
    setMatch(null);
    setSavedGame(loadSavedGame());
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

  // Keep the saved game in step with play. A finished game has nothing to resume.
  useEffect(() => {
    if (!match) return;
    if (isFinished(match)) clearSavedGame();
    else saveGame(match);
  }, [match]);

  // Solo games count toward the high score once they finish.
  useEffect(() => {
    if (match?.mode === "solo" && isFinished(match)) {
      recordSolo(totalOf(match.players[0]!));
    }
  }, [match, recordSolo]);

  // Human actions are ignored on computer turns. Rolls go through withRandomness
  // so daily matches draw from their seeded stream.
  const roll = () =>
    setMatch((m) => (m && !isAiTurn(m) ? withRandomness(m, rng, (r) => rollCurrent(m, r)) : m));
  const hold = (i: number) => setMatch((m) => (m && !isAiTurn(m) ? holdCurrent(m, i) : m));
  const score = (c: Category) => setMatch((m) => (m && !isAiTurn(m) ? claim(m, c) : m));

  const current = match?.players[match.current];
  // Five of a kind on a human's turn, once per roll.
  const rollId = match ? `${match.dice.rollsUsed}:${match.dice.values.join("")}` : "";
  const celebrate =
    match !== null && !isAiTurn(match) && isFiveOfAKind(match.dice.values) && rollId !== celebrated;
  const topbar = (
    <GameTopbar
      title="Tallyroll"
      about={
        <p>
          Tallyroll is free, MIT-licensed and tracks nothing. Built for{" "}
          <a href="https://freegamestore.online" className="underline">
            freegamestore.online
          </a>
          .
        </p>
      }
      stats={
        match
          ? [{ label: "Total", value: current ? totalOf(current) : 0, accent: true }]
          : [{ label: "Best", value: soloBest, accent: true }]
      }
      actions={<GameAuth />}
    />
  );

  return (
    <GameShell topbar={topbar}>
      {celebrate && <Celebration id={rollId} onDone={celebrationDone} />}
      {!match ? (
        <ModeSelector
          best={soloBest}
          dailyBest={readDailyBest(utcDateKey())}
          saved={savedGame}
          onStart={start}
          onResume={resume}
          onDiscard={discard}
        />
      ) : isFinished(match) ? (
        <>
          <Results match={match} onAgain={() => config && start(config)} onMenu={toMenu} />
          {match.daily && <DailySubmit date={match.daily.date} score={totalOf(match.players[0]!)} />}
        </>
      ) : (
        <Board match={match} onRoll={roll} onHold={hold} onClaim={score} onMenu={toMenu} />
      )}
    </GameShell>
  );
}
