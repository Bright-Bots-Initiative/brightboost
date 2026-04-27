export type ControlInstructionsModel = {
  keyboard?: string[];
  touch?: string[];
  buttons?: string[];
  screenReader?: string[];
};

export const DEFAULT_CONTROL_INSTRUCTIONS: ControlInstructionsModel = {
  keyboard: [
    "Use Tab to move between controls and Enter or Space to choose.",
  ],
  touch: ["Tap buttons or cards to make your choice."],
  buttons: ["Follow the on-screen prompts to play each step."],
};

export function mergeControlInstructions(
  instructions?: ControlInstructionsModel,
): ControlInstructionsModel {
  if (!instructions) {
    return DEFAULT_CONTROL_INSTRUCTIONS;
  }

  return {
    keyboard:
      instructions.keyboard && instructions.keyboard.length > 0
        ? instructions.keyboard
        : DEFAULT_CONTROL_INSTRUCTIONS.keyboard,
    touch:
      instructions.touch && instructions.touch.length > 0
        ? instructions.touch
        : DEFAULT_CONTROL_INSTRUCTIONS.touch,
    buttons:
      instructions.buttons && instructions.buttons.length > 0
        ? instructions.buttons
        : DEFAULT_CONTROL_INSTRUCTIONS.buttons,
    screenReader: instructions.screenReader,
  };
}
