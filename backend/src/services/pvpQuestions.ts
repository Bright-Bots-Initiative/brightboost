
export interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  options: string[];
}

const QUESTION_BANK: Record<string, Question[]> = {
  "K2": [
    {
      id: "k2_seq_1",
      prompt: "What comes next? 1, 2, 3, __",
      options: ["4", "5", "3"],
      correctIndex: 0
    },
    {
      id: "k2_pat_1",
      prompt: "Complete the pattern: Red, Blue, Red, __",
      options: ["Green", "Blue", "Yellow"],
      correctIndex: 1
    },
    {
      id: "k2_measure_1",
      prompt: "Which is heavier?",
      options: ["A feather", "A rock", "Air"],
      correctIndex: 1
    },
    {
      id: "k2_cause_1",
      prompt: "If you drop a glass, it might...",
      options: ["Float", "Break", "Bounce"],
      correctIndex: 1
    },
    {
      id: "k2_seq_2",
      prompt: "First breakfast, then...",
      options: ["Sleep", "Lunch", "Wake up"],
      correctIndex: 1
    },
    {
      id: "k2_pat_2",
      prompt: "Circle, Square, Circle, __",
      options: ["Triangle", "Square", "Star"],
      correctIndex: 1
    },
    {
      id: "k2_math_1",
      prompt: "2 + 2 = ?",
      options: ["3", "4", "5"],
      correctIndex: 1
    },
    {
      id: "k2_logic_1",
      prompt: "Which animal says 'Meow'?",
      options: ["Dog", "Cat", "Cow"],
      correctIndex: 1
    }
  ]
};

// Fallback for unknown bands
const DEFAULT_QUESTIONS = QUESTION_BANK["K2"];

export const getQuestionForBand = (band: string): PublicQuestion => {
  const bank = QUESTION_BANK[band] || DEFAULT_QUESTIONS;
  const q = bank[Math.floor(Math.random() * bank.length)];
  return {
    id: q.id,
    prompt: q.prompt,
    options: q.options
  };
};

export const checkAnswer = (band: string, questionId: string, answerIndex: number): boolean => {
  const bank = QUESTION_BANK[band] || DEFAULT_QUESTIONS;
  const question = bank.find(q => q.id === questionId);

  if (!question) return false;

  return question.correctIndex === answerIndex;
};
