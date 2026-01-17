import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import XPProgressRing from "./XPProgressRing";

// Mock the API hook
const mockGet = vi.fn();

vi.mock("../../services/api", () => ({
  useApi: () => ({
    get: mockGet,
  }),
}));

describe("XPProgressRing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with correct accessibility attributes", async () => {
    // Mock API response with some XP
    mockGet.mockResolvedValue({ currentXp: 40 });

    await act(async () => {
      render(<XPProgressRing />);
    });

    // It should be a progressbar
    const progressbar = screen.getByRole("progressbar");

    // Check attributes
    expect(progressbar).toHaveAttribute("aria-valuenow", "40");
    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-label", "Current XP Progress");

    // The inner text should be present but maybe hidden from screen reader if we rely on valuenow
    // But in this implementation we might want to check it exists visually
    expect(screen.getByText("40 XP")).toBeInTheDocument();
  });

  it("handles zero XP correctly", async () => {
    mockGet.mockResolvedValue({ currentXp: 0 });

    await act(async () => {
      render(<XPProgressRing />);
    });

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "0");
  });

  it("handles max XP correctly", async () => {
    mockGet.mockResolvedValue({ currentXp: 100 });

    await act(async () => {
      render(<XPProgressRing />);
    });

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
  });
});
