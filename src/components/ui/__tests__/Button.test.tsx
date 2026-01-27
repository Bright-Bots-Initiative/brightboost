import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  it("renders loading text by default when loading", () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders spinner but NO text when loading and size='icon'", () => {
    render(<Button isLoading size="icon" aria-label="Save" />);
    // "Loading..." should NOT be visible for icon buttons to prevent layout breakage
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();

    // Should still have aria-label
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("sets aria-busy when loading", () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("sets aria-busy to false when not loading", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "false");
  });
});
