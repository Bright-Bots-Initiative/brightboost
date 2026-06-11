import { useId } from "react";
import { Button } from "@/components/ui/button";
import { ReducedEffectsSource } from "./useReducedGameEffects";

type ReducedEffectsToggleProps = {
  reducedEffects: boolean;
  source: ReducedEffectsSource;
  onToggle: (nextValue: boolean) => void;
};

/**
 * Compact accessibility control. Renders as a single contained row that
 * flows full-width on mobile (no half-width floating fragment — the old
 * right-aligned column read as a broken orphan between the game header
 * and content on phones). The long explanation lives in title +
 * aria-describedby (sr-only) so the visible footprint stays one line.
 */
export function ReducedEffectsToggle({
  reducedEffects,
  source,
  onToggle,
}: ReducedEffectsToggleProps) {
  const descriptionId = useId();
  const sourceLabel =
    source === "manual" ? "Manual" : source === "system" ? "System" : "Default";
  const description = `Reduces motion, particles, and visual intensity for smoother play. Source: ${sourceLabel}.`;

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 shadow-sm sm:w-auto sm:self-end">
      <span className="text-xs font-medium text-slate-500">
        ✨ Reduced effects
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 min-w-[52px] px-3 text-xs font-semibold"
        aria-pressed={reducedEffects}
        aria-describedby={descriptionId}
        title={description}
        onClick={() => onToggle(!reducedEffects)}
      >
        {reducedEffects ? "On" : "Off"}
      </Button>
      <p id={descriptionId} className="sr-only">
        {description}
      </p>
    </div>
  );
}
