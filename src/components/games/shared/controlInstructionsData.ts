import type { TFunction } from "i18next";

export type ControlInstructionsModel = {
  keyboard?: string[];
  touch?: string[];
  buttons?: string[];
  screenReader?: string[];
};

export function mergeControlInstructions(
  instructions: ControlInstructionsModel | undefined,
  t: TFunction,
): ControlInstructionsModel {
  return {
    keyboard: instructions?.keyboard?.length
      ? instructions.keyboard
      : [
          t("games.shared.keyboardHint", {
            defaultValue:
              "Use Tab to move between controls and Enter or Space to choose.",
          }),
        ],
    touch: instructions?.touch?.length
      ? instructions.touch
      : [
          t("games.shared.touchHint", {
            defaultValue: "Tap buttons or cards to make your choice.",
          }),
        ],
    buttons: instructions?.buttons?.length
      ? instructions.buttons
      : [
          t("games.shared.buttonsHint", {
            defaultValue: "Follow the on-screen prompts to play each step.",
          }),
        ],
    screenReader: instructions?.screenReader,
  };
}
