import { useMemo, useState } from "react";
import { LearningGameFrame } from "./shared/LearningGameFrame";
import type { GameResult } from "./shared/GameShell";

type Round = {
  prompt: string;
  choices: string[];
  answer: string;
};

export const RHYME_ROUNDS: Round[] = [
  { prompt: "cat", choices: ["hat", "dog", "sun"], answer: "hat" },
  { prompt: "bug", choices: ["hug", "leaf", "rock"], answer: "hug" },
  { prompt: "star", choices: ["car", "tree", "pen"], answer: "car" },
  { prompt: "ship", choices: ["clip", "moon", "gate"], answer: "clip" },
  { prompt: "beam", choices: ["team", "fish", "log"], answer: "team" },
];

export function advanceRhymoRound(
  current: { roundIndex: number; score: number },
  chosenWord: string,
  rounds: Round[] = RHYME_ROUNDS,
) {
  const round = rounds[current.roundIndex];
  if (!round) return { ...current, done: true, lastCorrect: false };

  const isCorrect = chosenWord === round.answer;
  const nextScore = isCorrect ? current.score + 1 : current.score;
  const nextIndex = current.roundIndex + 1;

  return {
    roundIndex: nextIndex,
    score: nextScore,
    done: nextIndex >= rounds.length,
    lastCorrect: isCorrect,
    correctAnswer: round.answer,
    promptWord: round.prompt,
  };
}

export default function RhymoRhymeRocketGame({
  onComplete,
}: {
  onComplete?: (result: GameResult) => void;
}) {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(
    "Pick the word that rhymes with the prompt.",
  );
  const [locked, setLocked] = useState(false);

  const round = RHYME_ROUNDS[roundIndex];
  const progressLabel = useMemo(
    () => `Round ${roundIndex + 1}/${RHYME_ROUNDS.length}`,
    [roundIndex],
  );

  function choose(word: string) {
    if (locked) return;

    const isCorrect = word === round.answer;
    setLocked(true);

    if (isCorrect) {
      const nextScore = score + 1;
      setScore(nextScore);
      setFeedback(
        `Nice! "${word}" rhymes with "${round.prompt}".`,
      );

      if (roundIndex === RHYME_ROUNDS.length - 1) {
        onComplete?.({
          gameKey: "rhymo_rhyme_rocket",
          score: nextScore,
          total: RHYME_ROUNDS.length,
          streakMax: nextScore,
          roundsCompleted: RHYME_ROUNDS.length,
        });
        return;
      }
    } else {
      setFeedback(
        `Good try. "${round.answer}" rhymes with "${round.prompt}".`,
      );
    }

    window.setTimeout(() => {
      setRoundIndex((n) => Math.min(n + 1, RHYME_ROUNDS.length - 1));
      setLocked(false);
      setFeedback("Pick the word that rhymes with the prompt.");
    }, 900);
  }

  const isLastDone = locked && roundIndex === RHYME_ROUNDS.length - 1;

  return (
    <LearningGameFrame
      title="Rhymo's Rhyme Rocket"
      objective="Listen, look closely, and choose the rhyming word."
      vocabulary={["rhyme", "sound", "word family"]}
      progressLabel={progressLabel}
      feedback={feedback}
    >
      <div className="space-y-6 rounded-2xl border bg-gradient-to-b from-sky-50 to-white p-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Prompt word
          </p>
          <div className="mt-2 text-5xl font-black text-slate-900">
            {round.prompt}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {round.choices.map((choice) => (
            <button
              key={choice}
              onClick={() => choose(choice)}
              disabled={locked}
              className="rounded-2xl border bg-white px-4 py-6 text-2xl font-bold shadow-sm transition hover:-translate-y-0.5"
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-sm">
          Score: {score} / {RHYME_ROUNDS.length}
        </div>

        {isLastDone ? (
          <div className="rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
            Great listening! You completed Rhymo's Rhyme Rocket.
          </div>
        ) : null}
      </div>
    </LearningGameFrame>
  );
}
