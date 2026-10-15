import { GameButton, useGameSounds } from "@freegamestore/games";
import { DICE_COUNT, MAX_ROLLS, canRoll } from "../dice/diceEngine";
import face1 from "../assets/dice/face-1.svg";
import face2 from "../assets/dice/face-2.svg";
import face3 from "../assets/dice/face-3.svg";
import face4 from "../assets/dice/face-4.svg";
import face5 from "../assets/dice/face-5.svg";
import face6 from "../assets/dice/face-6.svg";
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
  type Scorecard,
} from "../scoring/scorer";
import { CATEGORY_LABELS } from "./labels";

const FACES = [face1, face2, face3, face4, face5, face6];

interface BoardProps {
  match: Match;
  onRoll: () => void;
  onHold: (index: number) => void;
  onClaim: (category: Category) => void;
  onMenu: () => void;
}

/** Dice, roll button and the current player's score sheet. */
export function Board({ match, onRoll, onHold, onClaim, onMenu }: BoardProps) {
  const player = match.players[match.current];
  const { dice } = match;
  const ai = isAiTurn(match);
  const rolled = dice.rollsUsed > 0;
  const rollable = canRoll(dice) && !ai;
  const holdable = rolled && canRoll(dice) && !ai;
  const claimable = rolled && !ai;
  const scores: Scorecard = player?.scores ?? {};
  const bonus = calculateUpperBonus(scores);
  const upper = upperTotal(scores);
  const sounds = useGameSounds();

  const turnText = ai
    ? `${player?.name} is thinking…`
    : player?.name === "You"
      ? "Your turn"
      : `${player?.name}'s turn`;

  const roll = () => {
    sounds.playDrop();
    onRoll();
  };
  const claim = (c: Category) => {
    sounds.playScore();
    onClaim(c);
  };

  const row = (c: Category) => (
    <ScoreRow
      key={c}
      label={CATEGORY_LABELS[c]}
      scored={scores[c]}
      preview={rolled ? scoreCategory(c, dice.values) : undefined}
      disabled={!claimable}
      onClick={() => claim(c)}
    />
  );

  return (
    <div className="table-felt flex flex-col h-full min-h-0 gap-2 p-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold" style={{ color: "var(--accent)" }}>
            {turnText}
          </span>
          <Standings match={match} />
        </div>
        <GameButton size="sm" variant="ghost" onClick={onMenu}>
          Menu
        </GameButton>
      </div>

      <div className="flex justify-center gap-2">
        {Array.from({ length: DICE_COUNT }, (_, i) => {
          const value = dice.values[i] ?? 0;
          const held = dice.held[i] ?? false;
          return (
            <button
              key={i}
              type="button"
              aria-label={`Die ${i + 1}: ${value || "not rolled"}${held ? ", held" : ""}`}
              aria-pressed={held}
              disabled={!holdable}
              onClick={() => onHold(i)}
              className={`die flex items-center justify-center w-12 h-12 min-w-[44px] min-h-[44px] disabled:opacity-60 ${held ? "die-held" : ""}`}
            >
              {value ? (
                <img
                  // Remounting on each roll restarts the tumble for every die that moved.
                  key={dice.rollsUsed}
                  src={FACES[value - 1]}
                  alt=""
                  className={`die-face ${held ? "" : "die-roll"}`}
                />
              ) : (
                <span className="text-2xl font-bold" style={{ color: "var(--muted)" }}>
                  –
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col items-center">
        <GameButton block disabled={!rollable} onClick={roll}>
          {rolled ? `Roll (${MAX_ROLLS - dice.rollsUsed} left)` : "Roll"}
        </GameButton>
      </div>

      <div className="grid grid-cols-2 gap-2 min-h-0 flex-1 text-sm">
        <section className="flex flex-col gap-1 min-h-0">
          {UPPER_CATEGORIES.map(row)}
          <div className="flex justify-between px-2 pt-1 text-xs" style={{ color: "var(--muted)" }}>
            <span>
              Bonus {Math.min(upper, UPPER_BONUS_THRESHOLD)}/{UPPER_BONUS_THRESHOLD}
            </span>
            <span className="font-semibold" style={{ color: bonus ? "var(--accent)" : undefined }}>
              {bonus ? `+${UPPER_BONUS}` : "0"}
            </span>
          </div>
        </section>

        <section className="flex flex-col gap-1 min-h-0">{LOWER_CATEGORIES.map(row)}</section>
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
      className={`score-row flex items-center justify-between ${canClaim ? "score-row-open" : ""}`}
    >
      <span>{label}</span>
      {claimed ? (
        // Keyed on the claimed state so the tick plays when the value first appears.
        <span key="scored" className="score-tick font-semibold">
          {scored}
        </span>
      ) : (
        <span key="preview" style={{ color: canClaim ? "var(--accent)" : "var(--muted)" }}>
          {preview ?? "–"}
        </span>
      )}
    </button>
  );
}
