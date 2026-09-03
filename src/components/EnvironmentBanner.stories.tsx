import type { Meta, StoryObj } from "@storybook/react";
import EnvironmentBanner from "./EnvironmentBanner";
import type { ClientDeployEnv } from "@/lib/deployEnv";
import "../i18n";

const meta: Meta<typeof EnvironmentBanner> = {
  title: "Components/EnvironmentBanner",
  component: EnvironmentBanner,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EnvironmentBanner>;

const SHA = "91e4071f0017fa508bb9cf385abc066ede6b07e1";

const staging: ClientDeployEnv = {
  name: "staging",
  isProduction: false,
  noindex: true,
  source: "railway",
  railwayEnv: "staging",
  railwayEnvironmentName: "staging",
  declaredEnv: "staging",
  declared: true,
  mismatch: "none",
  configError: null,
  gitSha: SHA,
  showBanner: true,
};

export const Staging: Story = { args: { env: staging } };

export const PreviewWithoutSha: Story = {
  args: {
    env: {
      ...staging,
      name: "preview",
      railwayEnv: "preview",
      railwayEnvironmentName: "pr-123",
      declaredEnv: "preview",
      gitSha: null,
    },
  },
};

/** A copied VITE_APP_ENV=production on a Railway staging build: the mismatch banner. */
export const ConfigurationMismatch: Story = {
  args: {
    env: {
      ...staging,
      name: "preview",
      declaredEnv: "production",
      mismatch: "declared-vs-railway",
      configError:
        "VITE_APP_ENV=production disagrees with VITE_RAILWAY_ENVIRONMENT_NAME (classified staging).",
    },
  },
};

/** Production renders nothing — the story exists so the negative case is visible. */
export const ProductionRendersNothing: Story = {
  args: {
    env: {
      ...staging,
      name: "production",
      isProduction: true,
      noindex: false,
      railwayEnv: "production",
      railwayEnvironmentName: "production",
      declaredEnv: "production",
      showBanner: false,
    },
  },
};
