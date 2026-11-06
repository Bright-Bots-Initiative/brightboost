import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { InstructionTimeline } from "./timeline/InstructionTimeline";
import { starterMachine, editTape } from "./greatWorkModel";
import { resolveBandConfig } from "./greatWorkBandConfig";
import "./greatWork.css";
const meta = {
  title: "Games/The Great Work/Instruction timeline",
  component: InstructionTimeline,
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <div className="gw-builder">
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
  parameters: { layout: "padded" },
} satisfies Meta<typeof InstructionTimeline>;
export default meta;
type Story = StoryObj<typeof meta>;
const basic = resolveBandConfig("k2");
export const ThreeSlots: Story = {
  args: { program: starterMachine(), config: basic, onEdit: () => {} },
  render: function ControlledStory(args) {
    const [program, setProgram] = useState(args.program);
    return (
      <InstructionTimeline
        {...args}
        program={program}
        onEdit={(arm, action) =>
          setProgram(
            (p) => editTape(p, arm, action, args.config, args.allowList) ?? p,
          )
        }
      />
    );
  },
};
// This story exercises the real KeyboardSensor and its real sortable coordinates.
// It is intentionally not a sensor mock; run in the repository's browser Storybook project.
export const KeyboardReorder: Story = {
  ...ThreeSlots,
  play: async ({ canvasElement }) => {
    await i18n.changeLanguage("en");
    const canvas = within(canvasElement);
    const first = canvas.getByRole("button", { name: "Arm 1, step 1: Grab" });
    first.focus();
    await userEvent.keyboard("[Space]");
    await userEvent.keyboard("[ArrowRight]");
    await userEvent.keyboard("[Space]");
    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: "Arm 1, step 2: Grab" }),
      ).toBeInTheDocument(),
    );
  },
};
export const ExpandedTape: Story = {
  ...ThreeSlots,
  args: {
    ...ThreeSlots.args,
    config: resolveBandConfig("g3_5"),
    program: {
      ...starterMachine(),
      tapes: [
        { armId: 1, chips: ["GRAB", "ROTATE_CW", "DROP", "RESET", "REPEAT"] },
      ],
    },
  },
};
export const Running: Story = {
  args: { ...ThreeSlots.args, disabled: true, pointers: new Map([[1, 1]]) },
};

export const SpanishKeyboardReorder: Story = {
  ...ThreeSlots,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await i18n.changeLanguage("es");
    const instruction = i18n.t("games.greatWork.instructions.GRAB");
    const label = i18n.t("games.greatWork.timeline.slotLabel", {
      arm: 1,
      number: 1,
      instruction,
    });
    try {
      const first = await canvas.findByRole("button", { name: label });
      expect(first).toHaveAttribute(
        "aria-roledescription",
        i18n.t("games.greatWork.drag.stepRole"),
      );
      first.focus();
      await userEvent.keyboard("[Space]");
      await waitFor(() =>
        expect(canvasElement.ownerDocument.body.textContent).toContain(
          i18n.t("games.greatWork.drag.over"),
        ),
      );
      await userEvent.keyboard("[ArrowRight]");
      await userEvent.keyboard("[Space]");
      await canvas.findByRole("button", {
        name: i18n.t("games.greatWork.timeline.slotLabel", {
          arm: 1,
          number: 2,
          instruction,
        }),
      });
      await waitFor(() =>
        expect(canvasElement.ownerDocument.body.textContent).toContain(
          i18n.t("games.greatWork.drag.released", { item: label }),
        ),
      );
    } finally {
      await userEvent.keyboard("[Escape]");
      await i18n.changeLanguage("en");
    }
  },
};
