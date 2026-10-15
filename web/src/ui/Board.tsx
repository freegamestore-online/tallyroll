import { GameButton } from "@freegamestore/games";
import { DICE_COUNT, MAX_ROLLS, canRoll } from "../dice/diceEngine";
import { isAiTurn, totalOf, type Match } from "../game/match";
import {
  LOWER_CATEGORIES,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  UPPER_CATEGORIES,
  calculateUpperBonus,
  scoreCategory,
  upperTotal,
  type Category,
} from "../scoring/scorer";
import { CATEGORY_LABELS } from "./labels";

interface BoardProps {
  match: Match;
  onRoll: () => void;
  onHold: (index: number) => void;
  onClaim: (category: Category) => void;
}

/** Dice, roll button and the current player's score sheet. */
export function Board({ match, onRoll, onHold, onClaim }: BoardProps) {
  const player = match.players[match.current];
  const { dice } = match;
  const ai = isAiTurn(match);
  const rolled = dice.rollsUsed > 0;
  const rollable = canRoll(dice) && !ai;
  const holdable = rolled && canRoll(dice) && !ai;
  const claimable = rolled && !ai;
  const scores = player?.scores ?? {};
  const bonus = calculateUpperBonus(scores);
  const upper = upperTotal(scores);

  const turnText = ai ? `${player?.name} is thinking…` : `${player?.name}'s turn`;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2 p-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold" style={{ color: "var(--accent)" }}>
          {turnText}
        </span>
        <Standings match={match} />
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: DICE_COUNT }, (_, i) => {
          const value = dice.values[i];
          const held = dice.held[i];
          return (
            <button
              key={i}
              type="button"
              aria-label={`Die ${i + 1}: ${value || "not rolled"}${held ? ", held" : ""}`}
              aria-pressed={held}
              disabled={!holdable}
              onClick={() => onHold(i)}
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
        <GameButton block disabled={!rollable} onClick={onRoll}>
          {rolled ? `Roll (${MAX_ROLLS - dice.rollsUsed} left)` : "Roll"}
        </GameButton>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {rolled ? "Tap dice to hold them, then pick a category." : "Roll to start your turn."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1 text-sm">
        <section className="flex flex-col gap-1 min-h-0">
          {UPPER_CATEGORIES.map((c) => (
            <ScoreRow
              key={c}
              label={CATEGORY_LABELS[c]}
              scored={scores[c]}
              preview={rolled ? scoreCategory(c, dice.values) : undefined}
              disabled={!claimable}
              onClick={() => onClaim(c)}
            />
          ))}
          <div className="flex justify-between px-2 pt-1" style={{ color: "var(--muted)" }}>
            <span>
              Bonus {Math.min(upper, UPPER_BONUS_THRESHOLD)}/{UPPER_BONUS_THRESHOLD}
            </span>
            <span className="font-semibold" style={{ color: bonus ? "var(--accent)" : undefined }}>
              {bonus ? `+${UPPER_BONUS}` : "0"}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-1 min-h-0">
          {LOWER_CATEGORIES.map((c) => (
            <ScoreRow
              key={c}
              label={CATEGORY_LABELS[c]}
              scored={scores[c]}
              preview={rolled ? scoreCategory(c, dice.values) : undefined}
              disabled={!claimable}
              onClick={() => onClaim(c)}
            />
          ))}
          <div className="flex justify-between px-2 pt-1 font-semibold">
            <span>Total</span>
            <span>{player ? totalOf(player) : 0}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Every player's running total; the player to move is highlighted. */
function Standings({ match }: { match: Match }) {
  if (match.players.length === 1) return null;
  return (
    <ul className="flex gap-2 text-xs" aria-label="Standings">
      {match.players.map((p, i) => (
        <li key={i} className="px-1.5 py-0.5 rounded" style={{ background: i === match.current ? "var(--accent-soft)" : undefined }}>
          {p.name.replace("Player ", "P")} {totalOf(p)}
        </li>
      ))}
    </ul>
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
