/**
 * @vitest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import QuestPlaceholder from "../QuestPlaceholder";

vi.mock("../../../lib/analytics", () => ({
  track: vi.fn(),
}));

vi.mock("../../../hooks/useLocalStorage", () => ({
  default: vi.fn(() => [null, vi.fn()]),
}));

describe("QuestPlaceholder", () => {
  it("renders quest placeholder correctly", () => {
    render(<QuestPlaceholder id={1} />);
    expect(screen.getByText("Quest 1")).toBeInTheDocument();
    expect(
      screen.getByText("This is a placeholder for Quest 1"),
    ).toBeInTheDocument();
  });

  it("shows locked overlay when previous quest incomplete", () => {
    render(<QuestPlaceholder id={1} />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});
