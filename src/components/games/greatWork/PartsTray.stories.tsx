import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DndContext } from "@dnd-kit/core";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";
import { PartsTray } from "./tray/PartsTray";
import type { PartChoice } from "./greatWorkModel";
import { resolveBandConfig } from "./greatWorkBandConfig";
import "./greatWork.css";
const meta = {
  title: "Games/The Great Work/Parts tray",
  component: PartsTray,
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <div className="gw-builder">
          <DndContext>
            <Story />
          </DndContext>
        </div>
      </I18nextProvider>
    ),
  ],
  parameters: { layout: "padded" },
} satisfies Meta<typeof PartsTray>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Beginner: Story = {
  args: { config: resolveBandConfig("k2"), selected: null, onChoose: () => {} },
  render: function ControlledStory(args) {
    const [selected, setSelected] = useState<PartChoice | null>(null);
    return <PartsTray {...args} selected={selected} onChoose={setSelected} />;
  },
};
export const LessonAllowList: Story = {
  ...Beginner,
  args: {
    ...Beginner.args,
    allowList: { parts: ["arm", "dispenser", "acceptor"] },
  },
};
export const DuringRun: Story = { args: { ...Beginner.args, disabled: true } };
