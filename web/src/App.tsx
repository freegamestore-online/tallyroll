import { useState } from "react";
import { GameAuth, GameButton, GameShell, GameTopbar } from "@freegamestore/games";
import {
  DICE_COUNT,
  MAX_ROLLS,
  canRoll,
  createDiceState,
  resetTurn,
  rollDice,
  toggleHold,
  type DiceState,
} from "./dice/diceEngine";
import {
  CATEGORIES,
  LOWER_CATEGORIES,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORIES,
  calculateUpperBonus,
  scoreCategory,
  sheetTotal,
  upperTotal,
  type Category,
  type Scorecard,
} from "./scoring/scorer";

const LABELS: Record<Category, string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  threeKind: "3 of a kind",
  fourKind: "4 of a kind",
  fullHouse: "Full house",
  smallStraight: "Sm. straight",
  largeStraight: "Lg. straight",
  yatzy: "Yatzy",
  chance: "Chance",
};

export default function App() {
  const [dice, setDice] = useState<DiceState>(createDiceState);
  const [scores, setScores] = useState<Scorecard>({});

  const rolled = dice.rollsUsed > 0;
  const scoredCount = CATEGORIES.filter((c) => scores[c] !== undefined).length;
  const gameOver = scoredCount === CATEGORIES.length;
  const total = sheetTotal(scores);

  function claim(category: Category) {
    if (!rolled || gameOver || scores[category] !== undefined) return;
    setScores((s) => ({ ...s, [category]: scoreCategory(category, dice.values) }));
    setDice(resetTurn());
  }

  function newGame() {
    setScores({});
    setDice(resetTurn());
  }

  const rollsLeft = MAX_ROLLS - dice.rollsUsed;

  return (
    <GameShell
      topbar={
        <GameTopbar
          title="Tallyroll"
          stats={[{ label: "Total", value: total, accent: true }]}
          actions={<GameAuth />}
        />
      }
    >
      <div className="flex flex-col h-full min-h-0 gap-2 p-2">
        <div className="flex justify-center gap-2">
          {Array.from({ length: DICE_COUNT }, (_, i) => {
            const value = dice.values[i];
            const held = dice.held[i];
            const holdable = rolled && canRoll(dice) && !gameOver;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Die ${i + 1}: ${value || "not rolled"}${held ? ", held" : ""}`}
                aria-pressed={held}
                disabled={!holdable}
                onClick={() => setDice((d) => toggleHold(d, i))}
                className="flex items-center justify-center w-12 h-12 min-w-[44px] min-h-[44px] rounded-xl border-2 text-2xl font-bold disabled:opacity-60"
                style={{
                  borderColor: held ? "var(--accent)" : "var(--line-strong)",
                  background: held ? "var(--accent-soft)" : "var(--paper)",
                  color: "var(--ink)",
                }}
              >
                {value || "–"}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-1">
          {gameOver ? (
            <GameButton block onClick={newGame}>
              New game · {total} points
            </GameButton>
          ) : (
            <GameButton block disabled={!canRoll(dice) || gameOver} onClick={() => setDice((d) => rollDice(d))}>
              {rolled ? `Roll (${rollsLeft} left)` : "Roll"}
            </GameButton>
          )}
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {rolled
              ? "Tap dice to hold them, then pick a category."
              : "Roll to start your turn."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 min-h-0 flex-1 text-sm">
          <section className="flex flex-col gap-1 min-h-0">
            {UPPER_CATEGORIES.map((c) => (
              <ScoreRow
                key={c}
                label={LABELS[c]}
                scored={scores[c]}
                preview={rolled ? scoreCategory(c, dice.values) : undefined}
                disabled={!rolled || gameOver}
                onClick={() => claim(c)}
              />
            ))}
            <div className="flex justify-between px-2 pt-1" style={{ color: "var(--muted)" }}>
              <span>
                Bonus {Math.min(upperTotal(scores), UPPER_BONUS_THRESHOLD)}/{UPPER_BONUS_THRESHOLD}
              </span>
              <span className="font-semibold" style={{ color: calculateUpperBonus(scores) ? "var(--accent)" : undefined }}>
                {calculateUpperBonus(scores) ? `+${UPPER_BONUS}` : "0"}
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-1 min-h-0">
            {LOWER_CATEGORIES.map((c) => (
              <ScoreRow
                key={c}
                label={LABELS[c]}
                scored={scores[c]}
                preview={rolled ? scoreCategory(c, dice.values) : undefined}
                disabled={!rolled || gameOver}
                onClick={() => claim(c)}
              />
            ))}
          </section>
        </div>
      </div>
    </GameShell>
  );
}

interface ScoreRowProps {
  label: string;
  /** Final score once the category is claimed. */
  scored: number | undefined;
  /** Live score for the current dice; undefined before the first roll. */
  preview: number | undefined;
  disabled: boolean;
  onClick: () => void;
}

function ScoreRow({ label, scored, preview, disabled, onClick }: ScoreRowProps) {
  const claimed = scored !== undefined;
  const canClaim = !claimed && !disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canClaim}
      className="flex items-center justify-between min-h-[36px] px-2 rounded-lg border disabled:cursor-default"
      style={{
        borderColor: "var(--line)",
        background: canClaim ? "var(--panel)" : "transparent",
        color: "var(--ink)",
      }}
    >
      <span>{label}</span>
      {claimed ? (
        <span className="font-semibold">{scored}</span>
      ) : (
        <span style={{ color: canClaim ? "var(--accent)" : "var(--muted)" }}>{preview ?? "–"}</span>
      )}
    </button>
  );
}
