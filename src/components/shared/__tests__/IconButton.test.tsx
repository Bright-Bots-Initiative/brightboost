/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import IconButton, { EditIcon } from "../IconButton";
import { TooltipProvider } from "../../ui/tooltip";

// Helper to wrap component in TooltipProvider
const renderWithTooltip = (component: React.ReactNode) => {
  return render(<TooltipProvider>{component}</TooltipProvider>);
};

describe("IconButton", () => {
  it("renders with correct title attribute when showTooltip is false", () => {
    renderWithTooltip(
      <IconButton onClick={() => {}} title="Edit item" showTooltip={false}>
        <EditIcon />
      </IconButton>,
    );

    const buttons = screen.getAllByTitle("Edit item");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeDefined();
  });

  it("does not render title attribute on button when showTooltip is true", () => {
    renderWithTooltip(
      <IconButton onClick={() => {}} title="Edit item" showTooltip={true}>
        <EditIcon />
      </IconButton>,
    );

    // Should not find by title attribute on the button itself
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("title");
    expect(button).toHaveAttribute("aria-label", "Edit item");
  });

  it("fires onClick handler when clicked", () => {
    const handleClick = vi.fn();

    const { container } = renderWithTooltip(
      <IconButton onClick={handleClick} title="Edit item">
        <EditIcon />
      </IconButton>,
    );

    const button = container.querySelector("button");
    expect(button).toBeDefined();

    if (button) {
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it("uses title as aria-label by default", () => {
    renderWithTooltip(
      <IconButton onClick={() => {}} title="Edit item">
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Edit item" });
    expect(button).toBeDefined();
  });

  it("uses provided ariaLabel as aria-label", () => {
    renderWithTooltip(
      <IconButton
        onClick={() => {}}
        title="Edit"
        ariaLabel="Edit item specific"
      >
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Edit item specific" });
    expect(button).toBeDefined();
  });

  it("spreads additional props to the button", () => {
    renderWithTooltip(
      <IconButton onClick={() => {}} title="Edit" data-testid="custom-button">
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByTestId("custom-button");
    expect(button).toBeDefined();
  });
});
