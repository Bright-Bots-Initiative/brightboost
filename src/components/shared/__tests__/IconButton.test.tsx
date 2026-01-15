/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import IconButton, { EditIcon } from "../IconButton";

describe("IconButton", () => {
  it("renders with correct title attribute", () => {
    render(
      <IconButton onClick={() => {}} title="Edit item">
        <EditIcon />
      </IconButton>,
    );

    const buttons = screen.getAllByTitle("Edit item");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toBeDefined();
  });

  it("fires onClick handler when clicked", () => {
    const handleClick = vi.fn();

    const { container } = render(
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
    render(
      <IconButton onClick={() => {}} title="Edit item">
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Edit item" });
    expect(button).toBeDefined();
  });

  it("uses provided ariaLabel as aria-label", () => {
    render(
      <IconButton onClick={() => {}} title="Edit" ariaLabel="Edit item specific">
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "Edit item specific" });
    expect(button).toBeDefined();
  });

  it("spreads additional props to the button", () => {
    render(
      <IconButton onClick={() => {}} title="Edit" data-testid="custom-button">
        <EditIcon />
      </IconButton>,
    );
    const button = screen.getByTestId("custom-button");
    expect(button).toBeDefined();
  });
});
