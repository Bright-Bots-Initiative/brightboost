import { useMemo, useState } from "react";
import GameShell, { type GameResult, type MissionBriefing } from "./shared/GameShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type GameProps = {
  config?: any;
  onComplete?: (result: GameResult) => void;
};

export type DataCard = {
  id: string;
  name: string;
  plantBed: "A" | "B" | "C";
  sunlightNeed: "full" | "partial" | "shade";
  waterNeed: "low" | "medium" | "high";
  leafType: "broad" | "needle" | "frond";
  seedType: "pod" | "cone" | "spore";
  growthSpeed: "slow" | "medium" | "fast";
};

export type SortRuleKey = "sunlightNeed" | "waterNeed" | "leafType";

export const DATA_DASH_CARDS: DataCard[] = [
  { id: "bean", name: "Bean", plantBed: "A", sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  { id: "fern", name: "Fern", plantBed: "B", sunlightNeed: "shade", waterNeed: "high", leafType: "frond", seedType: "spore", growthSpeed: "medium" },
  { id: "pine", name: "Pine", plantBed: "C", sunlightNeed: "full", waterNeed: "low", leafType: "needle", seedType: "cone", growthSpeed: "slow" },
  { id: "pea", name: "Pea", plantBed: "A", sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  { id: "moss", name: "Moss", plantBed: "B", sunlightNeed: "shade", waterNeed: "high", leafType: "frond", seedType: "spore", growthSpeed: "slow" },
  { id: "spruce", name: "Spruce", plantBed: "C", sunlightNeed: "partial", waterNeed: "low", leafType: "needle", seedType: "cone", growthSpeed: "medium" },
  { id: "sunflower", name: "Sunflower", plantBed: "A", sunlightNeed: "full", waterNeed: "medium", leafType: "broad", seedType: "pod", growthSpeed: "fast" },
  { id: "hosta", name: "Hosta", plantBed: "B", sunlightNeed: "shade", waterNeed: "high", leafType: "broad", seedType: "pod", growthSpeed: "medium" },
];

export const SORT_RULES: Record<SortRuleKey, { label: string; values: string[] }> = {
  sunlightNeed: { label: "Sunlight need", values: ["full", "partial", "shade"] },
  waterNeed: { label: "Water need", values: ["low", "medium", "high"] },
  leafType: { label: "Leaf type", values: ["broad", "needle", "frond"] },
};

export function evaluateSortAssignment(cards: DataCard[], assignments: Record<string, string>, rule: SortRuleKey) {
  const correct = cards.filter((card) => assignments[card.id] === card[rule]).length;
  return { correct, total: cards.length };
}

export function buildChartCounts(cards: DataCard[], rule: SortRuleKey) {
  return SORT_RULES[rule].values.map((value) => ({ label: value, count: cards.filter((card) => card[rule] === value).length }));
}

export function checkChartAnswer(correctIndex: number, selectedIndex: number | null) {
  return selectedIndex === correctIndex;
}

export function calculateDataDashScore(input: { sortCorrect: number; sortTotal: number; inferredRuleCorrect: boolean; chartCorrect: number; chartTotal: number; hintsUsed: number }) {
  const total = input.sortTotal + 1 + input.chartTotal;
  const score = input.sortCorrect + (input.inferredRuleCorrect ? 1 : 0) + input.chartCorrect;
  const accuracy = Math.round((score / total) * 100);
  const evidenceScore = Math.round((input.chartCorrect / input.chartTotal) * 100);
  return { score, total, accuracy, evidenceScore };
}

export function buildCompletionPayload(input: { sortCorrect: number; sortTotal: number; inferredRuleCorrect: boolean; chartCorrect: number; chartTotal: number; hintsUsed: number; roundsCompleted: number }) {
  const calc = calculateDataDashScore(input);
  return {
    gameKey: "data_dash_sort_discover",
    score: calc.score,
    total: calc.total,
    streakMax: 0,
    roundsCompleted: input.roundsCompleted,
    accuracy: calc.accuracy,
    evidenceScore: calc.evidenceScore,
    hintsUsed: input.hintsUsed,
  };
}

const BRIEFING: MissionBriefing = {
  title: "Data Dash: Sort & Discover",
  story: "Your greenhouse team sent a data drop. Sort plant cards, infer hidden rules, and use chart evidence to support a claim.",
  icon: "📊",
  tips: ["Use one attribute per sort rule", "Look for what all cards in a group share", "Use chart counts as evidence"],
  chapterLabel: "Life Science Data",
  themeColor: "emerald",
};

function DataDashPlayfield({ onFinish }: { onFinish: (result: GameResult) => void }) {
  const [phase, setPhase] = useState<"sort" | "infer" | "chart">("sort");
  const [rule] = useState<SortRuleKey>("sunlightNeed");
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [sortResult, setSortResult] = useState<{ correct: number; total: number } | null>(null);

  const inferRule: SortRuleKey = "seedType" as unknown as SortRuleKey;
  const inferOptions = ["sunlightNeed", "waterNeed", "seedType", "growthSpeed"];
  const [inferChoice, setInferChoice] = useState<string | null>(null);

  const chartQuestions = [
    {
      prompt: "Which claim is best supported by the chart?",
      choices: ["Most plants need full sunlight.", "Most plants need shade.", "All plants need partial sunlight."],
      answerIndex: 0,
    },
    {
      prompt: "What evidence best supports your claim?",
      choices: ["The full-sun bar is tallest.", "Fern has frond leaves.", "Plant bed A has three cards."],
      answerIndex: 0,
    },
  ];
  const [chartAnswers, setChartAnswers] = useState<Record<number, number>>({});

  const chartData = useMemo(() => buildChartCounts(DATA_DASH_CARDS, rule), [rule]);

  const allSorted = DATA_DASH_CARDS.every((card) => Boolean(assignments[card.id]));

  const groupedForInfer = useMemo(() => {
    const groups = ["pod", "cone", "spore"].map((label) => ({
      label,
      cards: DATA_DASH_CARDS.filter((card) => card.seedType === label),
    }));
    return groups;
  }, []);

  const submitSort = () => {
    const result = evaluateSortAssignment(DATA_DASH_CARDS, assignments, rule);
    setSortResult(result);
    setPhase("infer");
  };

  const finishGame = () => {
    const chartCorrect = chartQuestions.filter((q, i) => checkChartAnswer(q.answerIndex, chartAnswers[i] ?? null)).length;
    const payload = buildCompletionPayload({
      sortCorrect: sortResult?.correct ?? 0,
      sortTotal: sortResult?.total ?? DATA_DASH_CARDS.length,
      inferredRuleCorrect: inferChoice === inferRule,
      chartCorrect,
      chartTotal: chartQuestions.length,
      hintsUsed,
      roundsCompleted: 3,
    });

    onFinish(payload as GameResult);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase {phase === "sort" ? "A" : phase === "infer" ? "B" : "C"}: {phase === "sort" ? "Sort by Attribute" : phase === "infer" ? "Infer the Rule" : "Read the Chart"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === "sort" && (
            <>
              <p className="text-sm text-slate-600">Rule: Sort all cards by <strong>{SORT_RULES[rule].label}</strong>.</p>
              <div className="grid md:grid-cols-2 gap-3">
                {DATA_DASH_CARDS.map((card) => (
                  <button key={card.id} className={`border rounded-lg p-2 text-left ${selectedCard === card.id ? "border-emerald-500" : "border-slate-200"}`} onClick={() => setSelectedCard(card.id)}>
                    <div className="font-semibold">{card.name}</div>
                    <div className="text-xs text-slate-500">Bed {card.plantBed} • Sun: {card.sunlightNeed} • Water: {card.waterNeed} • Leaf: {card.leafType} • Seed: {card.seedType} • Growth: {card.growthSpeed}</div>
                    <div className="text-xs mt-1">Assigned bin: <strong>{assignments[card.id] ?? "—"}</strong></div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {SORT_RULES[rule].values.map((value) => (
                  <Button key={value} variant="outline" onClick={() => selectedCard && setAssignments((prev) => ({ ...prev, [selectedCard]: value }))} disabled={!selectedCard}>
                    Place in "{value}" bin
                  </Button>
                ))}
                <Button variant="secondary" onClick={() => setHintsUsed((v) => v + 1)}>Hint</Button>
              </div>
              <Button disabled={!allSorted} onClick={submitSort}>Submit Phase A</Button>
            </>
          )}

          {phase === "infer" && (
            <>
              <p className="text-sm text-slate-600">Scientists grouped these cards with a hidden rule. Which attribute did they use?</p>
              <div className="grid md:grid-cols-3 gap-3">
                {groupedForInfer.map((group) => (
                  <div key={group.label} className="border rounded-lg p-3 bg-slate-50">
                    <div className="font-semibold mb-2">Group {group.label}</div>
                    <ul className="text-sm list-disc ml-4">
                      {group.cards.map((card) => <li key={card.id}>{card.name}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {inferOptions.map((option) => (
                  <Button key={option} variant={inferChoice === option ? "default" : "outline"} onClick={() => setInferChoice(option)}>{option}</Button>
                ))}
                <Button variant="secondary" onClick={() => setHintsUsed((v) => v + 1)}>Hint</Button>
              </div>
              <Button disabled={!inferChoice} onClick={() => setPhase("chart")}>Submit Phase B</Button>
            </>
          )}

          {phase === "chart" && (
            <>
              <p className="text-sm text-slate-600">Chart from your Phase A sort ({SORT_RULES[rule].label}):</p>
              <div className="space-y-2">
                {chartData.map((row) => (
                  <div key={row.label}>
                    <div className="text-sm">{row.label}: {row.count}</div>
                    <div className="h-3 bg-slate-100 rounded"><div className="h-3 bg-emerald-500 rounded" style={{ width: `${row.count * 20}%` }} /></div>
                  </div>
                ))}
              </div>
              {chartQuestions.map((q, i) => (
                <div key={q.prompt} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium">{q.prompt}</div>
                  <div className="flex flex-col gap-2">
                    {q.choices.map((choice, idx) => (
                      <Button key={choice} variant={chartAnswers[i] === idx ? "default" : "outline"} onClick={() => setChartAnswers((prev) => ({ ...prev, [i]: idx }))}>{choice}</Button>
                    ))}
                  </div>
                </div>
              ))}
              <Button variant="secondary" onClick={() => setHintsUsed((v) => v + 1)}>Hint</Button>
              <Button onClick={finishGame} disabled={Object.keys(chartAnswers).length < chartQuestions.length}>Complete Mission</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DataDashSortDiscoverGame({ onComplete }: GameProps) {
  return (
    <GameShell
      gameKey="data_dash_sort_discover"
      title="Data Dash: Sort & Discover"
      briefing={BRIEFING}
      onComplete={(result) => onComplete?.(result)}
    >
      {({ onFinish, reducedEffects: _reducedEffects }) => <DataDashPlayfield onFinish={onFinish} />}
    </GameShell>
  );
}
