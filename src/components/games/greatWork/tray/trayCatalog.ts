import { ELEMENTS, GLYPHS } from "@shared/greatwork-engine";
import type { ElementId, GlyphKind } from "@shared/greatwork-engine";
import { choiceAllowed, choiceKey } from "../greatWorkModel";
import type { PartChoice } from "../greatWorkModel";
import type {
  GreatWorkBandConfig,
  PartAllowList,
} from "../greatWorkBandConfig";
export interface TrayItem {
  id: string;
  choice: PartChoice;
  key: string;
  hintKey: string;
  icon: string;
  group: "parts" | "glyphs";
}
export const GLYPH_MARKS: Record<GlyphKind, string> = {
  simplify: "◇",
  duplicate: "2×",
  growth: "✿",
  compression: "⇢⇠",
  refinement: "✦",
  affect: "≈",
  realize: "⇄",
  unification: "✧",
  destroy: "×",
  bond_single: "↔",
};
export function trayCatalog(
  config: GreatWorkBandConfig,
  allow?: PartAllowList,
  element: ElementId = "fire",
): TrayItem[] {
  const entries: TrayItem[] = [
    {
      id: "arm",
      choice: { kind: "arm" },
      key: "parts.arm",
      hintKey: "parts.armHint",
      icon: "⤴",
      group: "parts",
    },
    {
      id: `dispenser-${element}`,
      choice: { kind: "dispenser", element },
      key: "parts.dispenser",
      hintKey: "parts.dispenserHint",
      icon: ELEMENTS[element].icon,
      group: "parts",
    },
    {
      id: "acceptor",
      choice: { kind: "acceptor" },
      key: "parts.acceptor",
      hintKey: "parts.acceptorHint",
      icon: "⇩",
      group: "parts",
    },
    ...Object.keys(GLYPHS).map((glyph) => ({
      id: `glyph-${glyph}`,
      choice: { kind: "glyph", glyph: glyph as GlyphKind } as PartChoice,
      key: `glyph.${glyph}`,
      hintKey: `glyphHints.${glyph}`,
      icon: GLYPH_MARKS[glyph as GlyphKind],
      group: "glyphs" as const,
    })),
  ];
  return entries.filter((e) => choiceAllowed(e.choice, config, allow));
}
export { choiceKey };
