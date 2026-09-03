import type { Meta, StoryObj } from "@storybook/react";
import EnvironmentBanner from "./EnvironmentBanner";
import "../i18n";

const meta: Meta<typeof EnvironmentBanner> = {
  title: "Components/EnvironmentBanner",
  component: EnvironmentBanner,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnvironmentBanner>;

export const Staging: Story = {
  args: {
    env: {
      name: "staging",
      declared: true,
      isProduction: false,
      gitSha: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
      showBanner: true,
    },
  },
};

export const PreviewWithoutSha: Story = {
  args: {
    env: {
      name: "preview",
      declared: true,
      isProduction: false,
      gitSha: null,
      showBanner: true,
    },
  },
};

/** Production renders nothing — the story exists so the negative case is visible. */
export const ProductionRendersNothing: Story = {
  args: {
    env: {
      name: "production",
      declared: true,
      isProduction: true,
      gitSha: "91e4071f0017fa508bb9cf385abc066ede6b07e1",
      showBanner: false,
    },
  },
};
