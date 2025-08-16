import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import QuantumDemo from "../QuantumDemo";

vi.mock("../../lib/xp", () => ({
  grantXp: vi.fn().mockResolvedValue(true),
  wasXpGrantedInSession: vi.fn().mockReturnValue(false),
  clearSessionXpGrants: vi.fn(),
}));

let mockOnError: (() => void) | null = null;

vi.mock("@iframe-resizer/react", () => ({
  default: ({ src, title, onLoad, onError, ...props }: any) => {
    mockOnError = onError;
    return React.createElement("iframe", {
      src,
      title,
      "data-testid": "quantum-iframe",
      onLoad: () => {
        if (onLoad) onLoad();
      },
      ...props,
    });
  },
}));

vi.mock("../../components/GameBackground", () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "div",
      {
        "data-testid": "game-background",
      },
      children,
    ),
}));

describe("Quantum Demo", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const xpModule = await import("../../lib/xp");
    vi.mocked(xpModule.wasXpGrantedInSession).mockReturnValue(false);
  });

  const renderComponent = () => {
    return render(
      React.createElement(
        BrowserRouter,
        null,
        React.createElement(QuantumDemo),
      ),
    );
  };

  it("should render quantum demo page", () => {
    renderComponent();

    expect(screen.getByText("The Qubit Game")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Explore quantum computing concepts through interactive gameplay!",
      ),
    ).toBeInTheDocument();
  });

  it("should render iframe with correct attributes", () => {
    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      "src",
      "https://quantumai.google/education/thequbitgame",
    );
    expect(iframe).toHaveAttribute("title", "Quantum computing mini-game");
  });

  it("should show loading state initially", () => {
    renderComponent();

    expect(screen.getByText("Loading Quantum Demo...")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should grant XP on iframe load", async () => {
    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");

    fireEvent.load(iframe);

    const xpModule = await import("../../lib/xp");
    await waitFor(() => {
      expect(vi.mocked(xpModule.grantXp)).toHaveBeenCalledWith(
        "quantum_demo_visit",
      );
    });
  });

  it("should not grant XP if already granted in session", async () => {
    const xpModule = await import("../../lib/xp");
    vi.mocked(xpModule.wasXpGrantedInSession).mockReturnValue(true);

    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");
    fireEvent.load(iframe);

    expect(vi.mocked(xpModule.grantXp)).not.toHaveBeenCalled();
  });

  it("should handle iframe error and show fallback", async () => {
    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");

    if (mockOnError) {
      mockOnError();
    }

    await waitFor(
      () => {
        expect(
          screen.getByText(
            /Running local version of the Qubit Game due to network restrictions/,
          ),
        ).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("should be accessible to screen readers", () => {
    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");
    expect(iframe).toHaveAttribute("title", "Quantum computing mini-game");

    expect(screen.getByText("The Qubit Game")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("should show XP awarded notification after successful grant", async () => {
    renderComponent();

    const iframe = screen.getByTestId("quantum-iframe");
    fireEvent.load(iframe);

    await waitFor(() => {
      expect(screen.getByText("✨ XP Awarded!")).toBeInTheDocument();
    });
  });
});
