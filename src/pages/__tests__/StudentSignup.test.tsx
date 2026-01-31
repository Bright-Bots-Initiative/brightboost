import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BrowserRouter } from "react-router-dom";
import StudentSignup from "../StudentSignup";

// Mocks - Correct paths relative to src/pages/__tests__/
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    login: vi.fn(),
  }),
}));

vi.mock("../../services/api", () => ({
  signupStudent: vi.fn(),
}));

// Mock components that might cause issues or are heavy
vi.mock("../../components/GameBackground", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../../components/BrightBoostRobot", () => ({
  default: () => <div data-testid="robot">Robot</div>,
}));

describe("StudentSignup UX", () => {
  it("shows password requirements on focus and links them via aria-describedby", async () => {
    render(
      <BrowserRouter>
        <StudentSignup />
      </BrowserRouter>,
    );

    // Use queryByLabelText to find the first input labeled "Password"
    // The second one is "Confirm Password"
    const passwordInput = screen.getByLabelText(/^Password$/i);

    // Initially, requirements should NOT be visible (password length is 0 and not focused)
    const requirementsListQuery = screen.queryByRole("list", {
      name: /password requirements/i,
    });
    expect(requirementsListQuery).not.toBeInTheDocument();

    // Focus the input
    fireEvent.focus(passwordInput);

    // Now requirements SHOULD be visible
    // Note: This expectation will likely fail before implementation
    const visibleList = await screen.findByRole("list", {
      name: /password requirements/i,
    });
    expect(visibleList).toBeVisible();

    // Check aria-describedby
    const listId = visibleList.getAttribute("id");
    expect(listId).toBe("password-requirements");
    expect(passwordInput).toHaveAttribute(
      "aria-describedby",
      "password-requirements",
    );

    // Blur
    fireEvent.blur(passwordInput);

    // Should be hidden again (if password is empty)
    await waitFor(() => {
      expect(
        screen.queryByRole("list", { name: /password requirements/i }),
      ).not.toBeInTheDocument();
    });
  });
});
