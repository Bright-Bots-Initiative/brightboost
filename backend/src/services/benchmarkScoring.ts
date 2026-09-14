/**
 * #879 (DATA-03): score a benchmark submission against the template's
 * canonical question set, once per question.
 *
 * Pure: no I/O, so the property "0 ≤ score ≤ questions.length" is proven by
 * construction and testable without a database. The handler refuses the
 * whole submission on any defect, so nothing partial is ever persisted.
 */

export type BenchmarkQuestion = {
  id: string;
  prompt?: string;
  choices?: unknown;
  correctIndex?: number;
  skillTag?: string;
};

export type SubmittedAnswer = { questionId: string; selectedIndex: number };

export type ScoredAnswer = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  skillTag: string;
};

export type ScoringResult =
  | { ok: true; score: number; answers: ScoredAnswer[] }
  | { ok: false; error: string };

export function scoreBenchmarkSubmission(
  questions: readonly BenchmarkQuestion[],
  submitted: readonly SubmittedAnswer[],
): ScoringResult {
  const byId = new Map<string, number>();
  for (const a of submitted) {
    if (byId.has(a.questionId)) {
      return { ok: false, error: "Each question may be answered once" };
    }
    byId.set(a.questionId, a.selectedIndex);
  }

  const known = new Set(questions.map((q) => q.id));
  for (const id of byId.keys()) {
    if (!known.has(id)) {
      return { ok: false, error: "Answer for an unknown question" };
    }
  }

  let score = 0;
  const answers: ScoredAnswer[] = [];
  for (const q of questions) {
    const selectedIndex = byId.get(q.id);
    if (selectedIndex === undefined) {
      return { ok: false, error: "Every question must be answered" };
    }
    const choiceCount = Array.isArray(q.choices) ? q.choices.length : 0;
    if (selectedIndex >= choiceCount) {
      return { ok: false, error: "Answer choice is out of range" };
    }
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) score += 1;
    answers.push({
      questionId: q.id,
      selectedIndex,
      isCorrect,
      skillTag: q.skillTag ?? "unknown",
    });
  }
  return { ok: true, score, answers };
}
