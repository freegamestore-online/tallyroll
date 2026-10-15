import { describe, expect, it } from "vitest";
import { CATEGORIES } from "../scoring/scorer";
import { createRng } from "../rng";
import {
  aiStep,
  claim,
  createMatch,
  holdCurrent,
  isAiTurn,
  isFinished,
  openCategories,
  rollCurrent,
  winners,
  type Match,
} from "./match";

describe("createMatch", () => {
  it("solo has one human player", () => {
    const m = createMatch({ mode: "solo" });
    expect(m.players).toHaveLength(1);
    expect(m.players[0]?.ai).toBeUndefined();
  });

  it("pass & play takes 2–4 human players", () => {
    for (const n of [2, 3, 4]) {
      const m = createMatch({ mode: "passAndPlay", players: n });
      expect(m.players).toHaveLength(n);
      expect(m.players.some((p) => p.ai)).toBe(false);
    }
  });

  it("pass & play rejects counts outside 2–4", () => {
    expect(() => createMatch({ mode: "passAndPlay", players: 1 })).toThrow();
    expect(() => createMatch({ mode: "passAndPlay", players: 5 })).toThrow();
  });

  it("vs AI is a human against one computer player at the chosen level", () => {
    const m = createMatch({ mode: "vsAi", difficulty: "hard" });
    expect(m.players.map((p) => p.ai)).toEqual([undefined, "hard"]);
  });
});

describe("turns", () => {
  it("rotates to the next player after each claim", () => {
    let m = createMatch({ mode: "passAndPlay", players: 3 });
    m = rollCurrent(m, () => 0.5);
    m = claim(m, "chance");
    expect(m.current).toBe(1);
    m = rollCurrent(m, () => 0.5);
    m = claim(m, "chance");
    expect(m.current).toBe(2);
    m = rollCurrent(m, () => 0.5);
    m = claim(m, "chance");
    expect(m.current).toBe(0);
  });

  it("gives each player their own score sheet", () => {
    let m = createMatch({ mode: "passAndPlay", players: 2 });
    m = claim(rollCurrent(m, () => 0.99), "chance");
    expect(m.players[0]?.scores.chance).toBe(30);
    expect(m.players[1]?.scores).toEqual({});
  });

  it("needs a roll before scoring", () => {
    const m = createMatch({ mode: "solo" });
    expect(() => claim(m, "chance")).toThrow();
  });

  it("refuses to score a filled category", () => {
    let m = claim(rollCurrent(createMatch({ mode: "solo" }), () => 0.5), "chance");
    m = rollCurrent(m, () => 0.5);
    expect(() => claim(m, "chance")).toThrow();
  });

  it("holds only between rolls", () => {
    let m = createMatch({ mode: "solo" });
    expect(holdCurrent(m, 0)).toBe(m);
    m = rollCurrent(m, () => 0.5);
    expect(holdCurrent(m, 0).dice.held[0]).toBe(true);
  });

  it("gives every player one claim per category and then finishes", () => {
    let m = createMatch({ mode: "passAndPlay", players: 2 });
    for (let turn = 0; turn < CATEGORIES.length * 2; turn++) {
      m = rollCurrent(m, () => 0.5);
      const next = openCategories(m.players[m.current]!)[0]!;
      m = claim(m, next);
    }
    expect(isFinished(m)).toBe(true);
    expect(m.players.every((p) => openCategories(p).length === 0)).toBe(true);
  });
});

describe("winners", () => {
  it("picks the highest total", () => {
    const m: Match = {
      ...createMatch({ mode: "passAndPlay", players: 3 }),
      players: [
        { name: "A", scores: { chance: 20 } },
        { name: "B", scores: { chance: 25 } },
        { name: "C", scores: { chance: 10 } },
      ],
    };
    expect(winners(m)).toEqual([1]);
  });

  it("returns every player tied for first", () => {
    const m: Match = {
      ...createMatch({ mode: "passAndPlay", players: 2 }),
      players: [
        { name: "A", scores: { chance: 20 } },
        { name: "B", scores: { chance: 20 } },
      ],
    };
    expect(winners(m)).toEqual([0, 1]);
  });
});

describe("aiStep", () => {
  it("does nothing on a human turn", () => {
    const m = createMatch({ mode: "vsAi", difficulty: "hard" });
    expect(isAiTurn(m)).toBe(false);
    expect(aiStep(m, createRng(1))).toBe(m);
  });

  it("plays a full vs-AI game with a scripted human, never breaking a rule", () => {
    for (const difficulty of ["easy", "normal", "hard"] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        const rng = createRng(seed);
        let m = createMatch({ mode: "vsAi", difficulty });
        let steps = 0;
        while (!isFinished(m)) {
          if (++steps > 2000) throw new Error("game did not finish");
          if (isAiTurn(m)) {
            m = aiStep(m, rng);
          } else if (m.dice.rollsUsed < 3) {
            m = rollCurrent(m, rng);
          } else {
            m = claim(m, openCategories(m.players[m.current]!)[0]!);
          }
        }
        expect(m.players.map((p) => Object.keys(p.scores).length)).toEqual([13, 13]);
        expect(winners(m).length).toBeGreaterThan(0);
      }
    }
  });
});
