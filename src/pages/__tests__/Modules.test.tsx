// src/pages/__tests__/Modules.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Modules from "../Modules";
import { BrowserRouter } from "react-router-dom";
import { api } from "../../services/api";
import { HIDDEN_MODULE_SLUGS, STEM_SET_2_IDS } from "@/constants/stemSets";

// Mock the API
vi.mock("../../services/api", () => ({
  api: {
    getModules: vi.fn(),
    getAvatar: vi.fn().mockResolvedValue(null),
    getProgress: vi.fn().mockResolvedValue({ progress: [] }),
  },
}));

// Mock components that use other contexts or are complex
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, "aria-label": ariaLabel }: any) => (
    <button onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ModulesSkeleton", () => ({
  ModulesSkeleton: () => <div data-testid="modules-skeleton">Loading...</div>,
}));

describe("Modules Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HIDDEN_MODULE_SLUGS.add("k2-stem-track-maker");
  });

  afterEach(() => {
    HIDDEN_MODULE_SLUGS.add("k2-stem-track-maker");
  });

  it("shows loading skeleton initially", async () => {
    (api.getModules as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>,
    );
    expect(screen.getByTestId("modules-skeleton")).toBeDefined();
  });

  it("renders modules after loading and hides hidden slugs", async () => {
    const mockModules = [
      {
        id: 1,
        title: "Module 1",
        subtitle: "Subtitle 1",
        slug: "module-1",
        level: "K-2",
      },
      {
        id: 2,
        title: "Module 2",
        subtitle: "Subtitle 2",
        slug: "module-2",
        level: "K-2",
      },
      {
        id: 4,
        title: "STEM Intro",
        subtitle: "Hidden Intro",
        slug: "stem-1-intro",
        level: "K-2",
      },
    ];
    (api.getModules as any).mockResolvedValue(mockModules);

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("Module 1")).toBeDefined();
    expect(screen.getByText("Module 2")).toBeDefined();
    expect(screen.queryByText("STEM Intro")).toBeNull(); // Should be filtered out (excluded slug)
    expect(screen.getByLabelText("Start Learning Module 1")).toBeDefined();
  });

  it("shows empty state when no modules found", async () => {
    (api.getModules as any).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("No Modules Found")).toBeDefined();
    expect(
      screen.getByText(/We couldn't find any learning modules/),
    ).toBeDefined();
  });

  it("shows error message when API fails", async () => {
    (api.getModules as any).mockRejectedValue(new Error("API Error"));

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("modules-skeleton")).toBeNull();
    });

    expect(screen.getByText("Error")).toBeDefined();
    expect(
      screen.getByText("Failed to load modules. Please try again later."),
    ).toBeDefined();
  });

  it("places Track Builder in unlocked Set 3 after the hidden release flag is removed", async () => {
    HIDDEN_MODULE_SLUGS.delete("k2-stem-track-maker");
    (api.getModules as any).mockResolvedValue([
      {
        id: "track-module",
        title: "Boost Track Builder",
        description: "Build and ride a track",
        slug: "k2-stem-track-maker",
        level: "K-2",
      },
    ]);
    (api.getProgress as any).mockResolvedValue({
      progress: STEM_SET_2_IDS.map((activityId) => ({
        activityId,
        status: "COMPLETED",
      })),
    });

    render(
      <BrowserRouter>
        <Modules />
      </BrowserRouter>,
    );

    expect(await screen.findByText("Boost Track Builder")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Start Learning Boost Track Builder"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Set 3: Mastery — Coming Soon")).toBeNull();
  });
});
