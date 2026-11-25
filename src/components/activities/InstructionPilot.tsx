import { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import InstructionReadAloud from "./InstructionReadAloud";

export const K2InstructionPilot = createContext(false);
const instructions: Record<string, string> = {
  buddy_garden_sort: "bounce",
  gotcha_gears_unity: "gears",
  rhymo_rhyme_rocket: "rhyme",
  tank_trek: "tank",
  quantum_quest: "quantum",
  choice: "choice",
};
export function PilotInstruction({ surface }: { surface: string }) {
  const enabled = useContext(K2InstructionPilot);
  const { t, i18n } = useTranslation();
  if (!enabled || !instructions[surface]) return null;
  const key = "narration.instructions." + instructions[surface];
  const text = t(key);
  const language =
    t(key, { returnDetails: true }).usedLng ||
    i18n.resolvedLanguage ||
    i18n.language;
  return (
    <div className="my-3 space-y-2 rounded-xl border p-3">
      <p lang={language}>{text}</p>
      <InstructionReadAloud text={text} language={language} />
    </div>
  );
}
