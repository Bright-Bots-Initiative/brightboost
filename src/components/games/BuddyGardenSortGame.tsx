import { useState } from "react";
import { LearningGameFrame } from "./shared/LearningGameFrame";
import type { GameResult } from "./shared/GameShell";

type Bucket = "need" | "part" | "not-helpful";

type CardItem = {
  label: string;
  bucket: Bucket;
  clue: string;
};

export const GARDEN_CARDS: CardItem[] = [
  { label: "Water", bucket: "need", clue: "Plants need this to grow." },
  {
    label: "Sunlight",
    bucket: "need",
    clue: "Plants use this to make food.",
  },
  { label: "Soil", bucket: "need", clue: "Roots grow here." },
  {
    label: "Root",
    bucket: "part",
    clue: "This part drinks water from the soil.",
  },
  {
    label: "Leaf",
    bucket: "part",
    clue: "This part helps make food for the plant.",
  },
  {
    label: "Rock",
    bucket: "not-helpful",
    clue: "This is not one of the main things a plant needs.",
  },
];

const LABELS: Record<Bucket, string> = {
  need: "Plant Need",
  part: "Plant Part",
  "not-helpful": "Not a Main Need",
};

export function scoreGardenPick(
  item: CardItem,
  chosenBucket: Bucket,
): { correct: boolean; explanation: string } {
  const correct = chosenBucket === item.bucket;
  return {
    correct,
    explanation: correct
      ? `Yes! ${item.label} is a ${LABELS[item.bucket].toLowerCase()}.`
      : `Almost. ${item.label} belongs in "${LABELS[item.bucket]}".`,
  };
}

export default function BuddyGardenSortGame({
  onComplete,
}: {
  onComplete?: (result: GameResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(
    "Read the clue and choose the best bucket.",
  );

  const item = GARDEN_CARDS[index];
  const done = index >= GARDEN_CARDS.length;

  function pick(bucket: Bucket) {
    if (done) return;

    const { correct, explanation } = scoreGardenPick(item, bucket);
    const nextScore = correct ? score + 1 : score;

    setScore(nextScore);
    setFeedback(explanation);

    const nextIndex = index + 1;
    if (nextIndex >= GARDEN_CARDS.length) {
      onComplete?.({
        gameKey: "buddy_garden_sort",
        score: nextScore,
        total: GARDEN_CARDS.length,
        streakMax: nextScore,
        roundsCompleted: GARDEN_CARDS.length,
      });
    }

    window.setTimeout(() => {
      setIndex(nextIndex);
      if (nextIndex < GARDEN_CARDS.length) {
        setFeedback("Read the clue and choose the best bucket.");
      }
    }, 900);
  }

  return (
    <LearningGameFrame
      title="Buddy's Garden Sort"
      objective="Sort each card into the right garden group."
      vocabulary={["root", "leaf", "soil", "sunlight"]}
      progressLabel={done ? "Complete" : `Card ${index + 1}/${GARDEN_CARDS.length}`}
      feedback={feedback}
    >
      <div className="space-y-6 rounded-2xl border bg-white p-6">
        {done ? (
          <div className="rounded-xl bg-emerald-50 p-6 text-center">
            <p className="text-lg font-bold text-emerald-900">
              Garden sorting complete!
            </p>
            <p className="mt-2 text-sm text-emerald-800">
              Great job sorting plant parts and plant needs.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-lime-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Clue
              </p>
              <p className="mt-2 text-2xl font-bold">{item.clue}</p>
              <p className="mt-4 text-4xl font-black text-slate-900">
                {item.label}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {(Object.keys(LABELS) as Bucket[]).map((bucket) => (
                <button
                  key={bucket}
                  onClick={() => pick(bucket)}
                  className="rounded-2xl border bg-white px-4 py-6 text-lg font-bold shadow-sm transition hover:-translate-y-0.5"
                >
                  {LABELS[bucket]}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              Score: {score} / {GARDEN_CARDS.length}
            </div>
          </>
        )}
      </div>
    </LearningGameFrame>
  );
}
