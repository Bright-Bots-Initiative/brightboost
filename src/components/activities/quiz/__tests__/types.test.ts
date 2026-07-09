import { describe, it, expect } from "vitest";
import type { QuizQuestion } from "@/components/activities/quiz/types";

describe("QuizQuestion type", () => {
  it("accepts legacy-shaped question without explanation", () => {
    const legacy = {
      id: "q1",
      prompt: { en: "What is 2+2?", es: "¿Cuánto es 2+2?" },
      choices: [
        { en: "3", es: "3" },
        { en: "4", es: "4" },
      ],
      answerIndex: 1,
      hint: { en: "Count on your fingers.", es: "Cuenta con los dedos." },
    } satisfies QuizQuestion;
    expect(legacy.id).toBe("q1");
  });

  // covered-by AC-6.2
  it("E-10: accepts i18nKey-shaped prompt and choices", () => {
    const i18nKey = {
      id: "rhymo-q1",
      prompt: { i18nKey: "games.rhymo.question1" },
      choices: [
        { i18nKey: "games.rhymo.choice1a" },
        { i18nKey: "games.rhymo.choice1b" },
      ],
      answerIndex: 0,
    } satisfies QuizQuestion;
    expect(i18nKey.prompt).toEqual({ i18nKey: "games.rhymo.question1" });
  });
});
