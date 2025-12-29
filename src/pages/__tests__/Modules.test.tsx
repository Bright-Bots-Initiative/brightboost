// src/pages/__tests__/Modules.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Modules from "../Modules";
import { BrowserRouter } from "react-router-dom";
import { api } from "../../services/api";

// Mock the API
vi.mock("../../services/api", () => ({
  api: {
    getModules: vi.fn(),
  },
}));

// Mock components that use other contexts or are complex
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, "aria-label": ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>{children}</button>
  ),
}));

vi.mock("@/components/ModulesSkeleton", () => ({
  ModulesSkeleton: () => <div data-testid="modules-skeleton">Loading...</div>,
}));

describe("Modules Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton initially", async () => {
    (api.getModules as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>
    );
    expect(screen.getByTestId("modules-skeleton")).toBeDefined();
  });

  it("renders modules after loading", async () => {
    const mockModules = [
      { id: 1, title: "Module 1", subtitle: "Subtitle 1", slug: "module-1" },
      { id: 2, title: "Module 2", subtitle: "Subtitle 2", slug: "module-2" },
    ];
    (api.getModules as any).mockResolvedValue(mockModules);

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("Module 1")).toBeDefined();
    expect(screen.getByText("Module 2")).toBeDefined();
    expect(screen.getByLabelText("Start learning Module 1")).toBeDefined();
  });

  it("shows empty state when no modules found", async () => {
    (api.getModules as any).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("No Modules Found")).toBeDefined();
    expect(screen.getByText(/We couldn't find any learning modules/)).toBeDefined();
  });

  it("shows error message when API fails", async () => {
    (api.getModules as any).mockRejectedValue(new Error("API Error"));

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("Error")).toBeDefined();
    expect(screen.getByText("Failed to load modules. Please try again later.")).toBeDefined();
  });
});
