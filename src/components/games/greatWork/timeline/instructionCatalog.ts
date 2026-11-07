import type { InstructionKind } from "../greatWorkBandConfig";
export const INSTRUCTION_SYMBOLS: Readonly<Record<InstructionKind, string>> =
  Object.freeze({
    GRAB: "⊙",
    DROP: "⇩",
    ROTATE_CW: "↻",
    ROTATE_CCW: "↺",
    WAIT: "Ⅱ",
    RESET: "⌂",
    REPEAT: "⤾",
  });
export function tapeSlotId(armId: number, index: number): string {
  return `slot:${armId}:${index}`;
}
export function parseTapeSlot(
  id: unknown,
): { armId: number; index: number } | null {
  if (typeof id !== "string") return null;
  const match = /^slot:(\d{1,7}):(\d{1,3})$/.exec(id);
  return match ? { armId: Number(match[1]), index: Number(match[2]) } : null;
}
