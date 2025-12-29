import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import XPProgressWidget from "./XPProgress";

describe("XPProgressWidget", () => {
  const defaultProps = {
    currentXp: 1200,
    nextLevelXp: 2000,
    level: 5,
  };

  it("renders with basic props", () => {
    render(<XPProgressWidget {...defaultProps} />);
    expect(screen.getByText("XP: Level")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
    expect(screen.getByText("1200/2000")).toBeDefined();
  });

  it("should have accessibility attributes for the progress bar", () => {
    render(<XPProgressWidget {...defaultProps} />);

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "1200");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "2000");
    expect(progressbar).toHaveAttribute("aria-label", "XP Progress");
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
