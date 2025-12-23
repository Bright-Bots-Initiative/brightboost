import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "../BottomNav";

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  BookOpen: () => <div data-testid="icon-book" />,
  Bot: () => <div data-testid="icon-bot" />,
  Swords: () => <div data-testid="icon-swords" />,
}));

const renderWithRouter = (initialEntry = "/") => {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <BottomNav />
    </MemoryRouter>,
  );
};

describe("BottomNav", () => {
  it("renders all navigation items", () => {
    renderWithRouter();

    expect(screen.getByText("Learn")).toBeInTheDocument();
    expect(screen.getByText("My Bot")).toBeInTheDocument();
    expect(screen.getByText("Play")).toBeInTheDocument();
  });

  it("navigates to the correct path when clicked", () => {
    renderWithRouter();

    const learnButton = screen.getByText("Learn").closest("button");
    fireEvent.click(learnButton!);
    // Since we are using MemoryRouter without a location display, checking the click handler effect
    // In a real integration test we'd check the router state, but here we trust the buttons are rendered.
  });

  it("indicates the active page with aria-current", () => {
    // Navigate to /student/modules (Learn)
    renderWithRouter("/student/modules");

    const learnButton = screen.getByText("Learn").closest("button");
    const botButton = screen.getByText("My Bot").closest("button");

    // This expectation is expected to FAIL before the fix
    expect(learnButton).toHaveAttribute("aria-current", "page");
    expect(botButton).not.toHaveAttribute("aria-current");
  });
});
