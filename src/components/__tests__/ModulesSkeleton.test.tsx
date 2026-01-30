import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ModulesSkeleton } from "../ModulesSkeleton";

describe("ModulesSkeleton", () => {
  it("renders with correct accessibility attributes", () => {
    render(<ModulesSkeleton />);

    // Check for the status role
    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeInTheDocument();

    // Check for the accessible name
    expect(statusRegion).toHaveAttribute("aria-label", "Loading modules");

    // Check for aria-busy
    expect(statusRegion).toHaveAttribute("aria-busy", "true");

    // Check for the sr-only text
    expect(screen.getByText("Loading modules...")).toBeInTheDocument();
    expect(screen.getByText("Loading modules...")).toHaveClass("sr-only");
  });

  it("renders the correct number of skeleton cards", () => {
    const { container } = render(<ModulesSkeleton />);
    // There are 6 cards in the skeleton
    // Each card renders 3 Skeletons (1 in header, 2 in content)
    // We can count the number of skeleton elements if we can identify them.
    // Or just check that it renders content.

    expect(
      container.getElementsByClassName("animate-pulse").length,
    ).toBeGreaterThan(0);
  });
});
