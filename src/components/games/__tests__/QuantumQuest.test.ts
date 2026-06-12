import { describe, expect, it } from "vitest";
import {
  buildQuantumQuestCompletionPayload,
  getQuantumQuestStarCount,
  resolveQuantumQuestSectors,
} from "../QuantumQuestGame";
import { QUANTUM_QUEST_G35_SECTORS } from "../gradeBandContent";

describe("Quantum Quest completion", () => {
  it("builds final payload with accuracy and achievements", () => {
    const t = (key: string) => key;
    const payload = buildQuantumQuestCompletionPayload({
      sectors: [
        { id: "a", titles: {}, problems: [{ id: "1", prompts: {}, correctAnswer: 1, decoys: [2], skillTag: "count" }], speed: 1, spawnRate: 1, theme: "harbor" },
        { id: "b", titles: {}, problems: [{ id: "2", prompts: {}, correctAnswer: 2, decoys: [1], skillTag: "add" }], speed: 1, spawnRate: 1, theme: "nebula" },
      ],
      totalCorrect: 2,
      totalAttempted: 2,
      maxStreak: 5,
      lives: 3,
      sectorsCleared: 2,
      powerUpsUsed: 1,
      t,
    });

    expect(payload).toMatchObject({
      gameKey: "quantum_quest",
      score: 2,
      total: 2,
      roundsCompleted: 2,
      accuracy: 100,
      firstTryClear: true,
      gameSpecific: { powerUpsUsed: 1 },
    });
    expect(payload.achievements).toContain("games.quantumQuest.achPerfect");
    expect(payload.achievements).toContain("games.quantumQuest.achExplorer");
  });

  it("reduces decorative starfield count when reduced effects is enabled", () => {
    expect(getQuantumQuestStarCount(false)).toBe(40);
    expect(getQuantumQuestStarCount(true)).toBe(12);
  });
});

describe("Quantum Quest banded sectors", () => {
  it("serves g3_5 sectors for a g3_5 config and built-ins otherwise", () => {
    const k2 = resolveQuantumQuestSectors({ gameKey: "quantum_quest", sectors: [] });
    const g35 = resolveQuantumQuestSectors({
      gameKey: "quantum_quest",
      sectors: [],
      gradeBand: "g3_5",
    });
    expect(g35).toBe(QUANTUM_QUEST_G35_SECTORS);
    expect(k2).not.toBe(QUANTUM_QUEST_G35_SECTORS);
    expect(k2.length).toBeGreaterThan(0);
  });

  it("explicit sectors from the activity config always win", () => {
    const custom = [
      { id: "x", titles: {}, problems: [], speed: 1, spawnRate: 1, theme: "harbor" as const },
    ];
    expect(
      resolveQuantumQuestSectors({ gameKey: "quantum_quest", sectors: custom, gradeBand: "g3_5" }),
    ).toBe(custom);
  });

  it("g3_5 problems are internally consistent (no decoy equals the answer)", () => {
    expect(QUANTUM_QUEST_G35_SECTORS).toHaveLength(3);
    for (const sector of QUANTUM_QUEST_G35_SECTORS) {
      expect(sector.problems.length).toBeGreaterThanOrEqual(5);
      for (const p of sector.problems) {
        expect(p.decoys, `${p.id} decoys`).toHaveLength(3);
        expect(p.decoys, `${p.id} decoy collides with answer`).not.toContain(p.correctAnswer);
        expect(new Set(p.decoys).size, `${p.id} duplicate decoys`).toBe(3);
        expect(p.prompts.en, `${p.id} missing en prompt`).toBeTruthy();
        expect(p.skillTag).toBeTruthy();
      }
    }
  });

  it("g3_5 sectors cover the upper-elementary skills", () => {
    const tags = new Set(
      QUANTUM_QUEST_G35_SECTORS.flatMap((s) => s.problems.map((p) => p.skillTag)),
    );
    for (const required of [
      "multiplication",
      "division",
      "fractions",
      "order-of-operations",
      "patterns",
    ]) {
      expect(tags, `missing skill ${required}`).toContain(required);
    }
  });
});
