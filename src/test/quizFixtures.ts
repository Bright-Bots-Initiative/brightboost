import type { QuizQuestion } from "@/components/activities/quiz/types";

/** Fisher-Yates shuffle — returns a new shuffled copy of indices [0..n-1] */
function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildShuffleMap(questions: QuizQuestion[]): Record<string, number[]> {
  // Non-deterministic — do not use for display-order assertions; see identityShuffleMap.
  const sMap: Record<string, number[]> = {};
  for (const q of questions) {
    sMap[q.id] = shuffledIndices(q.choices.length);
  }
  return sMap;
}

/** Identity order [0, 1, …] — use for deterministic order assertions (not buildShuffleMap). */
export function identityShuffleMap(
  questions: QuizQuestion[],
): Record<string, number[]> {
  const sMap: Record<string, number[]> = {};
  for (const q of questions) {
    sMap[q.id] = q.choices.map((_, i) => i);
  }
  return sMap;
}

/** Reversed display order per question — deterministic shuffle for order tests. */
export function reversedShuffleMap(
  questions: QuizQuestion[],
): Record<string, number[]> {
  const sMap: Record<string, number[]> = {};
  for (const q of questions) {
    sMap[q.id] = q.choices.map((_, i) => q.choices.length - 1 - i);
  }
  return sMap;
}

export const threeQuestionFixture: QuizQuestion[] = [
  {
    id: "q1",
    prompt: {
      en: "What is Boost trying to do?",
      es: "¿Qué intenta hacer Boost?",
    },
    choices: [
      { en: "Reach the charging station", es: "Llegar a la estación de carga" },
      { en: "Go to sleep", es: "Irse a dormir" },
      { en: "Paint the wall", es: "Pintar la pared" },
    ],
    answerIndex: 0,
    hint: {
      en: "Read the first slide again.",
      es: "Lee la primera diapositiva de nuevo.",
    },
  },
  {
    id: "q2",
    prompt: {
      en: "Which tool helps Boost plan?",
      es: "¿Qué herramienta ayuda a Boost a planificar?",
    },
    choices: [
      { en: "A map", es: "Un mapa" },
      { en: "A hammer", es: "Un martillo" },
      { en: "A pillow", es: "Una almohada" },
    ],
    answerIndex: 0,
    hint: {
      en: "Think about navigation.",
      es: "Piensa en la navegación.",
    },
  },
  {
    id: "q3",
    prompt: {
      en: "What color is Boost?",
      es: "¿De qué color es Boost?",
    },
    choices: [
      { en: "Blue", es: "Azul" },
      { en: "Red", es: "Rojo" },
      { en: "Green", es: "Verde" },
    ],
    answerIndex: 0,
    hint: {
      en: "Look at the story pictures.",
      es: "Mira las imágenes de la historia.",
    },
  },
];

export const singleQuestionFixture: QuizQuestion[] = [threeQuestionFixture[0]];

export const i18nKeyFixture: QuizQuestion[] = [
  {
    id: "rhymo-q1",
    prompt: { i18nKey: "games.rhymo.q1.prompt" },
    choices: [
      { i18nKey: "games.rhymo.q1.c1" },
      { i18nKey: "games.rhymo.q1.c2" },
      { i18nKey: "games.rhymo.q1.c3" },
    ],
    answerIndex: 0,
    hint: { i18nKey: "games.rhymo.q1.hint" },
  },
];

export const noHintFixture: QuizQuestion[] = [
  {
    id: "no-hint-q1",
    prompt: { en: "Pick one.", es: "Elige uno." },
    choices: [
      { en: "A", es: "A" },
      { en: "B", es: "B" },
    ],
    answerIndex: 0,
  },
];

export const malformedAnswerIndexFixture: QuizQuestion[] = [
  {
    id: "malformed-q1",
    prompt: { en: "Broken question.", es: "Pregunta rota." },
    choices: [
      { en: "Only choice", es: "Solo opción" },
    ],
    answerIndex: 99,
  },
];
