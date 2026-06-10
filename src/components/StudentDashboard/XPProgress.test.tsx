import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import XPProgressWidget from "./XPProgress";

// XPProgressWidget was internationalized after these tests were written.
// Provide just the keys the tests assert on so they continue to verify
// user-visible English text rather than implementation-detail keys.
const enXp: Record<string, string> = {
  "xp.label": "XP:",
  "xp.level": "Level",
  "xp.progressLabel": "XP Progress",
  "xp.leveledUp": "Leveled Up!",
};

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
  Trans: ({ children }: { children: React.ReactNode }) => children,
  useTranslation: () => ({ t: (key: string) => enXp[key] ?? key }),
}));

describe("XPProgressWidget", () => {
  const defaultProps = {
    currentXp: 1200,
    nextLevelXp: 2000,
    level: 5,
  };

  it("renders with basic props", () => {
    render(<XPProgressWidget {...defaultProps} />);
    // Widget shows the level word, the level number, and the XP fraction.
    // The old "XP:" prefix in front of "Level" was removed when the
    // widget was simplified — the XP fraction itself carries that info.
    expect(screen.getByText("Level")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("1200/2000")).toBeDefined();
  });

  it("should have accessibility attributes for the progress bar", () => {
    render(<XPProgressWidget {...defaultProps} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "1200");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "2000");
    // Aria-label was made more descriptive — includes the current level
    // so screen readers announce e.g. "XP Progress: Level 5, 60% complete"
    // when navigating to the bar.
    expect(progressbar).toHaveAttribute("aria-label", "XP Progress: Level 5");
  });

  it("should show level up message with alert role", () => {
    render(
      <XPProgressWidget
        {...defaultProps}
        currentXp={2500}
        nextLevelXp={2000}
      />,
    );
    const alert = screen.getByRole("status");
    expect(alert).toHaveTextContent("🎉 Leveled Up!");
  });
});
