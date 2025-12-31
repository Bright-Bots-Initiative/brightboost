// src/components/activities/SequenceDragDropGame.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Level = {
  id: string;
  cards: string[];
  answer: string[];
};

type Config = {
  type: "minigame";
  gameKey: "sequence_drag_drop";
  levels: Level[];
};

export default function SequenceDragDropGame({
  config,
  onComplete,
}: {
  config: Config;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const levels = Array.isArray(config?.levels) ? config.levels : [];
  const [levelIndex, setLevelIndex] = useState(0);

  const level = levels[levelIndex];
  const slotCount = level?.answer?.length ?? 0;

  const [slots, setSlots] = useState<Array<string | null>>([]);
  const [available, setAvailable] = useState<string[]>([]);

  const shuffled = useMemo(() => {
    if (!level?.cards) return [];
    const copy = [...level.cards];
    copy.sort(() => Math.random() - 0.5);
    return copy;
  }, [level]);

  useEffect(() => {
    if (!level) return;
    setSlots(Array.from({ length: slotCount }, () => null));
    setAvailable(shuffled);
  }, [level, levelIndex, slotCount, shuffled]);

  if (!level) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="font-semibold">Game config missing levels.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fillFirstEmpty = (card: string) => {
    const idx = slots.findIndex((s) => s === null);
    if (idx < 0) return;
    const next = [...slots];
    next[idx] = card;
    setSlots(next);
    setAvailable((prev) => prev.filter((c) => c !== card));
  };

  const removeFromSlot = (slotIdx: number) => {
    const card = slots[slotIdx];
    if (!card) return;
    const next = [...slots];
    next[slotIdx] = null;
    setSlots(next);
    setAvailable((prev) => [...prev, card]);
  };

  const resetLevel = () => {
    setSlots(Array.from({ length: slotCount }, () => null));
    setAvailable(shuffled);
  };

  const check = () => {
    const isComplete = slots.every((s) => s !== null);
    if (!isComplete) return;
    const correct = slots.every((s, i) => s === level.answer[i]);
    if (!correct) {
      toast({ title: "Try again!", description: "That order isn’t quite right.", variant: "destructive" });
      resetLevel();
      return;
    }
    if (levelIndex < levels.length - 1) {
      toast({ title: "Great job!", description: "Next level unlocked." });
      setLevelIndex((i) => i + 1);
      return;
    }
    toast({ title: "You did it!", description: "All levels complete." });
    onComplete();
  };

  const filledAll = slots.length > 0 && slots.every((s) => s !== null);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">Fix the Order</div>
        <div className="text-sm text-gray-500">
          Level {levelIndex + 1}/{levels.length}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="font-semibold">Tap cards to place them into slots.</div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {slots.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                className="h-16 justify-center"
                onClick={() => removeFromSlot(i)}
                aria-label={`Slot ${i + 1}${s ? ` contains ${s}` : ""}`}
              >
                {s ? <span className="font-semibold">{s}</span> : <span className="opacity-40">Slot {i + 1}</span>}
              </Button>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-sm text-gray-600 mb-2">Available cards</div>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => (
                <Button
                  key={c}
                  variant="secondary"
                  className="h-12"
                  onClick={() => fillFirstEmpty(c)}
                  aria-label={`Place ${c}`}
                >
                  {c}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetLevel}>
              Reset
            </Button>
            <Button onClick={check} disabled={!filledAll}>
              Check Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
