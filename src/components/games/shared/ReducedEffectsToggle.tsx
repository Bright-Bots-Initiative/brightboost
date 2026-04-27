import { useId } from "react";
import { Button } from "@/components/ui/button";
import { ReducedEffectsSource } from "./useReducedGameEffects";

type ReducedEffectsToggleProps = {
  reducedEffects: boolean;
  source: ReducedEffectsSource;
  onToggle: (nextValue: boolean) => void;
};

export function ReducedEffectsToggle({
  reducedEffects,
  source,
  onToggle,
}: ReducedEffectsToggleProps) {
  const descriptionId = useId();
  const sourceLabel = source === "manual" ? "Manual" : source === "system" ? "System" : "Default";

  return (
    <div className="flex justify-end">
      <div className="inline-flex flex-col items-end gap-1 rounded-xl border border-slate-200 bg-white/80 px-2 py-1 shadow-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold"
          aria-pressed={reducedEffects}
          aria-describedby={descriptionId}
          onClick={() => onToggle(!reducedEffects)}
        >
          Reduced effects: {reducedEffects ? "On" : "Off"}
        </Button>
        <p id={descriptionId} className="text-[11px] text-slate-500">
          Reduces motion, particles, and visual intensity for smoother play. Source: {sourceLabel}.
        </p>
      </div>
    </div>
  );
}
