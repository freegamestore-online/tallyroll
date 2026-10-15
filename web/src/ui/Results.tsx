import { GameButton } from "@freegamestore/games";
import { totalOf, winners, type Match } from "../game/match";
import { CATEGORIES, UPPER_BONUS, calculateUpperBonus, upperTotal } from "../scoring/scorer";
import { CATEGORY_LABELS } from "./labels";

interface ResultsProps {
  match: Match;
  onAgain: () => void;
  onMenu: () => void;
}

/** Final screen: who won, and every player's sheet side by side. */
export function Results({ match, onAgain, onMenu }: ResultsProps) {
  const won = winners(match);
  const solo = match.players.length === 1;
  const headline = solo
    ? `Final score ${totalOf(match.players[0]!)}`
    : won.length === 1
      ? `${match.players[won[0]!]?.name} wins`
      : `Tie: ${won.map((i) => match.players[i]?.name).join(" & ")}`;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2 p-2">
      <h1 className="text-center text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
        {headline}
      </h1>

      <div className="flex-1 min-h-0 overflow-hidden">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr style={{ color: "var(--muted)" }}>
              <th className="text-left font-normal py-1" />
              {match.players.map((p, i) => (
                <th key={i} className="font-semibold py-1 px-1" style={{ color: won.includes(i) ? "var(--accent)" : "var(--ink)" }}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="text-left py-0.5">{CATEGORY_LABELS[c]}</td>
                {match.players.map((p, i) => (
                  <td key={i} className="py-0.5">
                    {p.scores[c] ?? "–"}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t" style={{ borderColor: "var(--line)" }}>
              <td className="text-left py-0.5">Upper bonus</td>
              {match.players.map((p, i) => (
                <td key={i} className="py-0.5">
                  {calculateUpperBonus(p.scores) ? `+${UPPER_BONUS}` : `0 (${upperTotal(p.scores)}/63)`}
                </td>
              ))}
            </tr>
            <tr className="border-t font-semibold" style={{ borderColor: "var(--line)" }}>
              <td className="text-left py-0.5">Total</td>
              {match.players.map((p, i) => (
                <td key={i} className="py-0.5">
                  {totalOf(p)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <GameButton onClick={onAgain}>Play again</GameButton>
        <GameButton variant="secondary" onClick={onMenu}>
          Modes
        </GameButton>
      </div>
    </div>
  );
}
