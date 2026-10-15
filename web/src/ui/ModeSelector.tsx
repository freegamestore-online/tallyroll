import { useState, type ReactNode } from "react";
import { GameButton } from "@freegamestore/games";
import { DIFFICULTIES, type Difficulty } from "../ai/aiStrategy";
import { CATEGORIES } from "../scoring/scorer";
import { utcDateKey } from "../daily/daily";
import { MAX_PLAYERS, MIN_PLAYERS, openCategories, type Match, type MatchConfig } from "../game/match";

interface ModeSelectorProps {
  /** Best solo total, shown on the Solo card. */
  best: number;
  /** Best daily score for today's UTC date on this device, if any. */
  dailyBest: number | null;
  /** An unfinished game from an earlier visit, if one was saved. */
  saved: Match | null;
  onStart: (config: MatchConfig) => void;
  onResume: () => void;
  onDiscard: () => void;
}

const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", normal: "Normal", hard: "Hard" };

/** One-line summary of a saved match, e.g. "vs AI · Hard · round 4 of 13". */
export function describeMatch(match: Match): string {
  const filled = Math.min(...match.players.map((p) => CATEGORIES.length - openCategories(p).length));
  const round = Math.min(filled + 1, CATEGORIES.length);
  const mode = match.daily
    ? `Daily ${match.daily.date}`
    : match.mode === "solo"
      ? "Solo"
      : match.mode === "passAndPlay"
        ? `Pass & play, ${match.players.length} players`
        : `vs AI, ${DIFFICULTY_LABEL[match.players[1]?.ai ?? "normal"]}`;
  return `${mode} · round ${round} of ${CATEGORIES.length}`;
}

/** Start screen: resume a saved game, or pick a mode. */
export function ModeSelector({ best, dailyBest, saved, onStart, onResume, onDiscard }: ModeSelectorProps) {
  const [players, setPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const today = utcDateKey();

  return (
    <div className="flex flex-col h-full min-h-0 justify-center gap-2 p-2">
      {saved && (
        <Card title="Resume game" detail={describeMatch(saved)}>
          <div className="grid grid-cols-2 gap-2">
            <GameButton size="sm" onClick={onResume}>
              Resume
            </GameButton>
            <GameButton size="sm" variant="ghost" onClick={onDiscard}>
              Discard
            </GameButton>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Card title="Solo" detail={`Best ${best}`}>
          <GameButton block size="sm" onClick={() => onStart({ mode: "solo" })}>
            Start
          </GameButton>
        </Card>
        <Card title="Daily" detail={dailyBest === null ? today : `${today} · best ${dailyBest}`}>
          <GameButton block size="sm" onClick={() => onStart({ mode: "daily", date: today })}>
            Play today
          </GameButton>
        </Card>
      </div>

      <Card title="Pass & play" detail={`${players} players on one device`}>
        <Segments
          label="Players"
          options={PLAYER_COUNTS.map((n) => ({ value: n, label: String(n) }))}
          value={players}
          onChange={setPlayers}
        />
        <GameButton block size="sm" onClick={() => onStart({ mode: "passAndPlay", players })}>
          Start with {players} players
        </GameButton>
      </Card>

      <Card title="vs AI" detail={`You against the computer · ${DIFFICULTY_LABEL[difficulty]}`}>
        <Segments
          label="Difficulty"
          options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
          value={difficulty}
          onChange={setDifficulty}
        />
        <GameButton block size="sm" onClick={() => onStart({ mode: "vsAi", difficulty })}>
          Start vs AI
        </GameButton>
      </Card>
    </div>
  );
}

function Card({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border p-2" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {detail}
        </p>
      </div>
      {children}
    </section>
  );
}

interface SegmentsProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

function Segments<T extends string | number>({ label, options, value, onChange }: SegmentsProps<T>) {
  return (
    <div role="group" aria-label={label} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className="min-h-[44px] rounded-lg border text-sm font-semibold"
            style={{
              borderColor: selected ? "var(--accent)" : "var(--line-strong)",
              background: selected ? "var(--accent-soft)" : "var(--paper)",
              color: "var(--ink)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
