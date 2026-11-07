import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { I18nextProvider } from "react-i18next";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import i18n from "@/i18n";
import {
  bondedThree,
  collide,
  transfer,
} from "@shared/greatwork-engine/__tests__/fixtures";
import { GreatWorkBuilder } from "./GreatWorkBuilder";
import { starterMachine } from "./greatWorkModel";
import { resolveBandConfig } from "./greatWorkBandConfig";
const meta = {
  title: "Games/The Great Work/Builder",
  component: GreatWorkBuilder,
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
  parameters: { layout: "fullscreen" },
  beforeEach: async () => {
    await i18n.changeLanguage("en");
  },
} satisfies Meta<typeof GreatWorkBuilder>;
export default meta;
type Story = StoryObj<typeof meta>;
export const FirstMachine: Story = {
  args: {
    band: "k2",
    bandConfig: resolveBandConfig("k2"),
    program: starterMachine(),
    onProgramChange: () => {},
    target: null,
    onRunResult: () => {},
  },
  render: function ControlledStory(args) {
    const [program, setProgram] = useState(args.program);
    return (
      <GreatWorkBuilder
        {...args}
        program={program}
        onProgramChange={setProgram}
      />
    );
  },
};
export const StepAndReset: Story = {
  ...FirstMachine,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (let i = 0; i < 4; i++)
      await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    await waitFor(() =>
      expect(canvas.getByText("Your machine makes Fire!")).toBeInTheDocument(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Reset run" }));
    await waitFor(() =>
      expect(
        canvas.getByText(
          "What will your machine make? Try a step and watch the arm.",
        ),
      ).toBeInTheDocument(),
    );
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 1: Grab" }),
    ).toBeEnabled();
  },
};
export const ReplayOnly: Story = {
  args: { ...FirstMachine.args, readOnly: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.queryByRole("complementary", { name: "Choose a part" }),
    ).not.toBeInTheDocument();
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 1: Grab" }),
    ).toBeDisabled();
    expect(canvas.getByRole("button", { name: "Run" })).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    expect(canvas.getByText("One step at a time.")).toBeInTheDocument();
  },
};
export const KeyboardConstruction: Story = {
  ...FirstMachine,
  args: {
    ...FirstMachine.args,
    program: { parts: [], tapes: [] },
    target: {
      molecule: { atoms: [{ element: "fire", at: { q: 0, r: 0 } }], bonds: [] },
      count: 1,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      board = canvasElement.querySelector("canvas")!;
    // A real focused canvas and keyboard cursor; no DnD sensor or canvas mock.
    await userEvent.click(canvas.getByRole("button", { name: "Arm" }));
    board.focus();
    await userEvent.keyboard("[Enter]");
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 1: Next step" }),
    ).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Source" }));
    board.focus();
    await userEvent.keyboard("[ArrowRight][Enter]");
    await userEvent.click(canvas.getByRole("button", { name: "Output" }));
    board.focus();
    await userEvent.keyboard("[ArrowLeft][ArrowDown][Enter]");
    for (const [index, instruction] of [
      "Grab",
      "Turn right",
      "Drop",
    ].entries()) {
      const choice = canvas.getByRole("button", {
        name: instruction,
      });
      choice.focus();
      await userEvent.keyboard("[Enter]");
      const slot = canvas.getByRole("button", {
        name: `Arm 1, step ${index + 1}: Next step`,
      });
      slot.focus();
      await userEvent.keyboard("[Enter]");
    }
    await userEvent.click(canvas.getByRole("button", { name: "Run" }));
    await waitFor(
      () =>
        expect(
          canvas.getByText("Your machine made the blocks you were going for!"),
        ).toBeInTheDocument(),
      { timeout: 4000 },
    );
  },
};
export const EditPausedPlan: Story = {
  ...FirstMachine,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Run" }));
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 1: Grab" }),
    ).toBeDisabled();
    await userEvent.click(canvas.getByRole("button", { name: "Pause" }));
    await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    await userEvent.click(
      canvas.getByRole("button", { name: "Arm 1, step 2: Turn right" }),
    );
    await userEvent.click(
      canvas.getByRole("button", { name: "Remove this step" }),
    );
    await waitFor(() =>
      expect(canvas.getByText("Ready to try your plan.")).toBeInTheDocument(),
    );
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 2: Drop" }),
    ).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Undo edit" }));
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 2: Turn right" }),
    ).toBeEnabled();
  },
};
export const ChangingBand: Story = {
  ...FirstMachine,
  render: function ControlledBandStory(args) {
    const [band, setBand] = useState<"k2" | "g3_5">("k2");
    const [program, setProgram] = useState(args.program);
    return (
      <>
        <button onClick={() => setBand("g3_5")}>
          {i18n.t("games.greatWork.preview.expanded")}
        </button>
        <button onClick={() => setBand("k2")}>
          {i18n.t("games.greatWork.preview.basic")}
        </button>
        <GreatWorkBuilder
          {...args}
          band={band}
          bandConfig={resolveBandConfig(band)}
          program={program}
          onProgramChange={setProgram}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(
      canvas.queryByRole("button", { name: "Repeat" }),
    ).not.toBeInTheDocument();
    expect(
      canvas.queryByRole("button", { name: "Arm 1, step 4: Next step" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Expanded tools" }),
    );
    expect(canvas.getByRole("button", { name: "Repeat" })).toBeEnabled();
    expect(
      canvas.getByRole("button", { name: "Arm 1, step 4: Next step" }),
    ).toBeEnabled();
    await userEvent.click(
      canvas.getByRole("button", { name: "Beginner tools" }),
    );
    expect(
      canvas.queryByRole("button", { name: "Repeat" }),
    ).not.toBeInTheDocument();
  },
};
const loop = transfer(3);
export const LoopingMachine: Story = {
  ...FirstMachine,
  args: {
    ...FirstMachine.args,
    band: "g3_5",
    bandConfig: resolveBandConfig("g3_5"),
    program: loop.program,
    target: { molecule: loop.level.targetProduct!, count: 3 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (let i = 0; i < 12; i++)
      await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    await waitFor(() => expect(canvas.getByText("Made 3")).toBeInTheDocument());
  },
};
const reflected = bondedThree(true);
export const MirrorComparison: Story = {
  ...FirstMachine,
  args: {
    ...FirstMachine.args,
    band: "g3_5",
    bandConfig: resolveBandConfig("g3_5"),
    program: reflected.program,
    target: { molecule: reflected.level.targetProduct!, count: 1 },
    levelOptions: { fixedParts: [], maxTicks: 24 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement),
      stepButton = canvas.getByRole("button", { name: "Step" });
    for (let i = 0; i < 24 && !stepButton.hasAttribute("disabled"); i++)
      await userEvent.click(stepButton);
    await waitFor(() =>
      expect(canvas.getByText("What you were making")).toBeInTheDocument(),
    );
    expect(canvas.getByText("What your machine made")).toBeInTheDocument();
    expect(canvasElement.querySelectorAll(".gw-mirror canvas")).toHaveLength(2);
  },
};
const collision = collide();
export const CollisionFeedback: Story = {
  ...FirstMachine,
  args: {
    ...FirstMachine.args,
    band: "g3_5",
    bandConfig: resolveBandConfig("g3_5"),
    program: collision.program,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    await userEvent.click(canvas.getByRole("button", { name: "Step" }));
    await waitFor(() =>
      expect(
        canvas.getByText("Two pieces bumped into each other here."),
      ).toBeInTheDocument(),
    );
  },
};
export const SpanishControls: Story = {
  ...FirstMachine,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await i18n.changeLanguage("es");
    await canvas.findByRole("button", {
      name: i18n.t("games.greatWork.transport.step"),
    });
    try {
      expect(
        canvas.getByRole("button", {
          name: i18n.t("games.greatWork.transport.step"),
        }),
      ).toBeEnabled();
      await userEvent.click(
        canvas.getByRole("button", {
          name: i18n.t("games.greatWork.transport.step"),
        }),
      );
      expect(
        canvas.getByText(i18n.t("games.greatWork.state.stepping")),
      ).toBeInTheDocument();
      expect(canvasElement.textContent).not.toContain("games.greatWork.");
      expect(canvasElement.textContent).not.toContain("Your machine workshop");
    } finally {
      await i18n.changeLanguage("en");
    }
  },
};
