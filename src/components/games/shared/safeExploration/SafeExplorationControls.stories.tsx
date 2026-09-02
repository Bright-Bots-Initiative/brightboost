/**
 * Storybook coverage for the Safe Exploration controls (#838).
 *
 * These are the automated stories the accessibility contract's §9 checklist
 * asks of this surface: idle, running, completed (observing), restored,
 * unavailable and unexpected-error — in both band variants — plus reduced
 * motion, keyboard-only operation, and the unavailable-with-reason rule.
 *
 * Every handler here is synchronous or an explicitly-pending promise, so the
 * stories are deterministic when they run as tests in the Storybook browser
 * project. Nothing random, nothing timed.
 */
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import esCommon from "@/locales/es/common.json";

import { SafeExplorationControls } from "./SafeExplorationControls";

function makeI18n(lng: "en" | "es") {
  const instance = createInstance();
  void instance.init({
    resources: {
      en: { translation: enCommon },
      es: { translation: esCommon },
    },
    lng,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
  return instance;
}

const englishI18n = makeI18n("en");
const spanishI18n = makeI18n("es");

/** A run that never settles — the deterministic way to hold `running`. */
const pendingRun = () => new Promise<void>(() => {});

const meta: Meta<typeof SafeExplorationControls> = {
  title: "Games/Shared/SafeExplorationControls",
  component: SafeExplorationControls,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <I18nextProvider i18n={englishI18n}>
        <div style={{ maxWidth: 520 }}>
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
  args: {
    surfaceId: "demo",
    band: "k2",
    baseline: { id: "b-1", label: "your saved track" },
    reducedEffects: false,
    onRun: () => ({
      status: "ok" as const,
      summary: "The bike spun out on the turn.",
    }),
    onKeep: () => {},
    onRestore: () => {},
    onExit: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ── K–2: Try it → What happened? → Keep it / Go back ───────────────────────

export const K2Idle: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Try it" }),
    ).toBeVisible();
    // Idle is silent and never steals focus.
    await expect(
      canvas.getByTestId("demo-safe-exploration-announcement"),
    ).toHaveTextContent("");
  },
};

export const K2Running: Story = {
  args: { onRun: pendingRun },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    const region = canvas.getByTestId("demo-safe-exploration");
    await expect(region).toHaveAttribute("data-state", "running");
    // The busy control keeps focus: aria-disabled, never `disabled`.
    const tryIt = canvas.getByRole("button", { name: "Try it" });
    await expect(tryIt).toHaveAttribute("aria-busy", "true");
    await expect(tryIt).not.toBeDisabled();
  },
};

export const K2Observing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    // The status region carries an entrance transition; wait it out rather
    // than asserting mid-animation.
    await waitFor(() =>
      expect(
        canvas.getByRole("heading", { name: "What happened?" }),
      ).toBeVisible(),
    );
    await expect(
      canvas.getByRole("button", { name: "Keep it" }),
    ).toHaveAccessibleDescription(/takes the place of your saved track/);
  },
};

export const K2Kept: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Keep it" }),
    );
    await expect(canvas.getByTestId("demo-safe-exploration")).toHaveAttribute(
      "data-state",
      "kept",
    );
    // The way back stays visible after a consequential change.
    await expect(canvas.getByRole("button", { name: "Go back" })).toBeVisible();
  },
};

export const K2Restored: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Go back" }),
    );
    await expect(canvas.getByTestId("demo-safe-exploration")).toHaveAttribute(
      "data-state",
      "restored",
    );
    await expect(
      canvas.getByTestId("demo-safe-exploration-announcement"),
    ).toHaveTextContent(
      "You went back. your saved track is the way it was before.",
    );
    // Keep is gone, so nothing can overwrite the baseline from here.
    await expect(canvas.queryByRole("button", { name: "Keep it" })).toBeNull();
  },
};

export const K2Unavailable: Story = {
  args: { unavailable: { reason: "Your teacher paused experiments for now." } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(
        canvas.getByText("Your teacher paused experiments for now."),
      ).toBeVisible(),
    );
    await expect(canvas.queryAllByRole("button")).toHaveLength(0);
  },
};

export const K2UnexpectedError: Story = {
  args: {
    onKeep: () => {
      throw new Error("save endpoint 500");
    },
    onUnexpectedError: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Keep it" }),
    );
    const status = canvas.getByTestId("demo-safe-exploration-status");
    await expect(status).toHaveAttribute("data-error-kind", "unexpected");
    await expect(status).toHaveTextContent(
      "Something broke on our side, not in your try.",
    );
    await expect(status).toHaveTextContent("your saved track is still safe.");
    await expect(
      canvas.getByRole("button", { name: "Back to my lesson" }),
    ).toBeVisible();
  },
};

export const K2RecoverableError: Story = {
  args: {
    onKeep: () => ({
      status: "recoverableError" as const,
      summary: "We could not save just now.",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Keep it" }),
    );
    await expect(
      canvas.getByTestId("demo-safe-exploration-status"),
    ).toHaveAttribute("data-error-kind", "recoverable");
    await expect(
      canvas.getByRole("button", { name: "Try that again" }),
    ).toBeVisible();
  },
};

export const K2ReducedMotion: Story = {
  args: { reducedEffects: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    const status = canvas.getByTestId("demo-safe-exploration-status");
    // No entrance transition, but every piece of feedback survives.
    await expect(status.className).not.toContain("slide-up-fade");
    await expect(status).toHaveTextContent("The bike spun out on the turn.");
    await expect(
      canvas.getByTestId("demo-safe-exploration-announcement"),
    ).toHaveTextContent("You tried it.");
  },
};

export const K2KeyboardOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tryIt = await canvas.findByRole("button", { name: "Try it" });
    tryIt.focus();
    await expect(tryIt).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    // Focus lands on the result region, per the contract's focus matrix.
    await expect(
      canvas.getByTestId("demo-safe-exploration-status"),
    ).toHaveFocus();

    // …and the tab order that follows puts the primary action first (§2).
    await userEvent.tab();
    const keep = canvas.getByRole("button", { name: "Keep it" });
    await expect(keep).toHaveFocus();
    await expect(keep).toHaveAttribute("data-emphasis", "primary");
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Go back" })).toHaveFocus();
    await userEvent.tab();
    await expect(
      canvas.getByRole("button", { name: "Try another way" }),
    ).toHaveFocus();
  },
};

/**
 * Two identical failures in a row: same state, same summary, byte-identical
 * announcement. The live region's text node is keyed on the transition count,
 * so the second one still replaces the node and is still spoken.
 */
export const K2RepeatedFailure: Story = {
  args: {
    onKeep: () => ({
      status: "recoverableError" as const,
      summary: "The save did not go through.",
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Try it" }),
    );
    await userEvent.click(
      await canvas.findByRole("button", { name: "Keep it" }),
    );

    const live = canvas.getByTestId("demo-safe-exploration-announcement");
    const firstTransition = live.getAttribute("data-transition");
    const firstNode = canvas.getByTestId(
      "demo-safe-exploration-announcement-text",
    );

    await userEvent.click(
      await canvas.findByRole("button", { name: "Try that again" }),
    );

    await expect(live.getAttribute("data-transition")).not.toBe(
      firstTransition,
    );
    await expect(
      canvas.getByTestId("demo-safe-exploration-announcement-text"),
    ).not.toBe(firstNode);
    await expect(live).toHaveTextContent("The save did not go through.");
  },
};

export const K2Spanish: Story = {
  decorators: [
    (Story) => (
      <I18nextProvider i18n={spanishI18n}>
        <div style={{ maxWidth: 520 }}>
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Pruébalo" }),
    );
    await waitFor(() =>
      expect(canvas.getByRole("heading", { name: "¿Qué pasó?" })).toBeVisible(),
    );
    await expect(
      canvas.getByRole("button", { name: "Guárdalo" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Volver atrás" }),
    ).toBeVisible();
  },
};

// ── Older learners: Preview → Run → Compare → Keep / Restore / Branch ──────

const olderArgs = {
  band: "older" as const,
  baseline: { id: "b-2", label: "your saved run" },
  onPreview: () => {},
  onCancel: () => {},
  onBranch: () => {},
  onRun: () => ({
    status: "ok" as const,
    summary: "Lap time went from 42s to 39s.",
  }),
};

export const OlderIdle: Story = {
  args: olderArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("button", { name: "Preview" }),
    ).toBeVisible();
    // One dominant action: Preview does not compete with Run in the baseline.
    await expect(canvas.queryByRole("button", { name: "Run" })).toBeNull();
  },
};

export const OlderPreview: Story = {
  args: olderArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await expect(canvas.getByTestId("demo-safe-exploration")).toHaveAttribute(
      "data-state",
      "preview",
    );
    // What will be replaced is stated before anything runs, and cancel exists.
    await expect(
      canvas.getByTestId("demo-safe-exploration-status"),
    ).toHaveTextContent("Running this will replace your saved run.");
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeVisible();
  },
};

export const OlderRunning: Story = {
  args: { ...olderArgs, onRun: pendingRun },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await expect(canvas.getByTestId("demo-safe-exploration")).toHaveAttribute(
      "data-state",
      "running",
    );
    // A stuck run still exposes a visible way out.
    await expect(canvas.getByRole("button", { name: "Cancel" })).toBeEnabled();
  },
};

export const OlderObserving: Story = {
  args: olderArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await waitFor(() =>
      expect(canvas.getByRole("heading", { name: "Compare" })).toBeVisible(),
    );
    await expect(
      canvas.getByRole("button", { name: "Keep this version" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: "Save as a new version" }),
    ).toBeVisible();
  },
};

export const OlderBranched: Story = {
  args: olderArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Save as a new version" }),
    );
    await expect(
      canvas.getByTestId("demo-safe-exploration-announcement"),
    ).toHaveTextContent("Saved as a new version. your saved run is unchanged.");
  },
};

export const OlderRestored: Story = {
  args: olderArgs,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Restore" }),
    );
    await expect(canvas.getByTestId("demo-safe-exploration")).toHaveAttribute(
      "data-state",
      "restored",
    );
    await expect(
      canvas.getByRole("button", { name: "Try again" }),
    ).toHaveFocus();
  },
};

export const OlderBlockedAction: Story = {
  args: {
    ...olderArgs,
    availability: {
      restore: {
        kind: "blocked" as const,
        reason: "Your facilitator locked the saved run during the demo.",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    const restore = canvas.getByRole("button", { name: "Restore" });
    // Present with a reason — never a mystery disabled control.
    await expect(restore).toHaveAttribute("aria-disabled", "true");
    await expect(restore).toHaveAccessibleDescription(/locked the saved run/);
    await expect(
      canvas.getByTestId("demo-safe-exploration-reason-restore"),
    ).toBeVisible();
  },
};

export const OlderUnexpectedError: Story = {
  args: {
    ...olderArgs,
    onKeep: () => {
      throw new Error("save endpoint 500");
    },
    onUnexpectedError: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Preview" }),
    );
    await userEvent.click(await canvas.findByRole("button", { name: "Run" }));
    await userEvent.click(
      await canvas.findByRole("button", { name: "Keep this version" }),
    );
    const status = canvas.getByTestId("demo-safe-exploration-status");
    await expect(status).toHaveAttribute("data-error-kind", "unexpected");
    await expect(status).toHaveTextContent("not in your experiment");
  },
};
