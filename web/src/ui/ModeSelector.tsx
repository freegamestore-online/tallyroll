import { useState, type ReactNode } from "react";
import { GameButton } from "@freegamestore/games";
import { DIFFICULTIES, type Difficulty } from "../ai/aiStrategy";
import { MAX_PLAYERS, MIN_PLAYERS, type MatchConfig } from "../game/match";

interface ModeSelectorProps {
  /** Best solo total, shown on the Solo card. */
  best: number;
  onStart: (config: MatchConfig) => void;
}

const PLAYER_COUNTS = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", normal: "Normal", hard: "Hard" };

/** Start screen: pick solo, pass & play, or a computer opponent. */
export function ModeSelector({ best, onStart }: ModeSelectorProps) {
  const [players, setPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  return (
    <div className="flex flex-col h-full min-h-0 justify-center gap-3 p-3">
      <h1 className="text-center text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
        Choose a mode
      </h1>

      <Card title="Solo" detail={`Beat your high score · best ${best}`}>
        <GameButton block size="sm" onClick={() => onStart({ mode: "solo" })}>
          Start solo
        </GameButton>
      </Card>

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
    <section className="flex flex-col gap-2 rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "var(--panel)" }}>
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
