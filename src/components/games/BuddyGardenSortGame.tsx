/**
 * BuddyGardenSortGame — compatibility wrapper.
 *
 * The default export now points to the restored Bounce & Buds
 * paddle-and-ball game.  Named exports (GARDEN_CARDS, scoreGardenPick)
 * are kept for existing tests and any code that references them.
 */

// ── Data & scoring helpers (used by tests) ──────────────────────────────

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

// ── Default export: the restored Bounce & Buds game ─────────────────────

export { default } from "./BounceBudsGame";
