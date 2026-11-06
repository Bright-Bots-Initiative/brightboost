import type { GradeBand } from "@/hooks/useGradeBand";
import type { GlyphKind, Instruction, Part } from "@shared/greatwork-engine";
export type InstructionKind = Exclude<
  Instruction,
  "MOVE_PLUS" | "MOVE_MINUS" | "PIVOT_CW" | "PIVOT_CCW"
>;
export type PartKind = Exclude<Part["kind"], "track">;
export interface GreatWorkBandConfig {
  maxTapeSlots: number | null;
  instructions: readonly InstructionKind[];
  parts: readonly PartKind[];
  openModeSeed: "starter" | "blank";
  targetRoutes: readonly ("palette" | "designer")[];
  defaultTargetCount: number;
  showMetrics: boolean;
}
export interface PartAllowList {
  parts?: readonly PartKind[];
  glyphs?: readonly GlyphKind[];
  instructions?: readonly InstructionKind[];
}
export const R1_INSTRUCTIONS: readonly InstructionKind[] = Object.freeze([
  "GRAB",
  "ROTATE_CW",
  "ROTATE_CCW",
  "DROP",
  "WAIT",
  "RESET",
  "REPEAT",
]);
const PARTS: readonly PartKind[] = Object.freeze([
  "arm",
  "dispenser",
  "acceptor",
  "glyph",
]);
export function resolveBandConfig(
  band: GradeBand | unknown,
): GreatWorkBandConfig {
  return band === "g3_5"
    ? {
        maxTapeSlots: null,
        instructions: [...R1_INSTRUCTIONS],
        parts: [...PARTS],
        openModeSeed: "blank",
        targetRoutes: ["palette", "designer"],
        defaultTargetCount: 6,
        showMetrics: true,
      }
    : {
        maxTapeSlots: 3,
        instructions: ["GRAB", "ROTATE_CW", "DROP"],
        parts: [...PARTS],
        openModeSeed: "starter",
        targetRoutes: ["palette"],
        defaultTargetCount: 3,
        showMetrics: false,
      };
}
/** Resolve every render. A prop override can narrow access but cannot create P2 instructions. */
export function effectiveBandConfig(
  band: GradeBand | unknown,
  supplied?: GreatWorkBandConfig,
): GreatWorkBandConfig {
  const base = resolveBandConfig(band);
  if (!supplied) return base;
  const slots = supplied.maxTapeSlots;
  const limit =
    Number.isSafeInteger(slots) && Number(slots) > 0
      ? Math.min(256, Number(slots))
      : null;
  return {
    ...base,
    maxTapeSlots: base.maxTapeSlots === 3 ? 3 : limit,
    instructions: base.instructions.filter((i) =>
      supplied.instructions?.includes(i),
    ),
    parts: base.parts.filter((p) => supplied.parts?.includes(p)),
    showMetrics: base.showMetrics && supplied.showMetrics === true,
  };
}
export function availableInstructions(
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
): readonly InstructionKind[] {
  return config.instructions.filter(
    (i) => !allow?.instructions || allow.instructions.includes(i),
  );
}
