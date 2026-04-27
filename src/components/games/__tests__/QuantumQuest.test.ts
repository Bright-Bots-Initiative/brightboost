import { describe, expect, it } from "vitest";
import { buildQuantumQuestCompletionPayload, getQuantumQuestStarCount } from "../QuantumQuestGame";

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
