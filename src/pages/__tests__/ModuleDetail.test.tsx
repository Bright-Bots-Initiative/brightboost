import { render, screen, waitFor } from "@testing-library/react";
import ModuleDetail from "../ModuleDetail";
import { api } from "@/services/api";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock API
vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    getProgress: vi.fn(),
  },
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockModule = {
  id: "mod-1",
  slug: "test-module",
  title: "Test Module",
  description: "A test module description",
  units: [
    {
      id: "u-1",
      title: "Unit 1",
      lessons: [
        {
          id: "l-1",
          title: "Lesson 1",
          activities: [
            {
              id: "a-1",
              title: "Activity 1",
              kind: "INFO",
            },
            {
              id: "a-2",
              title: "Activity 2",
              kind: "INTERACT",
            },
          ],
        },
      ],
    },
  ],
};

describe("ModuleDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders module content correctly", async () => {
    (api.getModule as any).mockResolvedValue(mockModule);
    (api.getProgress as any).mockResolvedValue({ progress: [] });

    render(
      <MemoryRouter initialEntries={["/student/modules/test-module"]}>
        <Routes>
          <Route path="/student/modules/:slug" element={<ModuleDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial loading state (should be skeleton eventually)
    // Initially we check if "Loading..." text is present or not,
    // but the goal is to REPLACE it with skeleton.
    // So if this test passes with "Loading..." present, it confirms current state.

    await waitFor(() => {
      expect(screen.getByText("Test Module")).toBeInTheDocument();
    });

    expect(screen.getByText("A test module description")).toBeInTheDocument();
    expect(screen.getByText("Unit 1")).toBeInTheDocument();
    expect(screen.getByText("Lesson 1")).toBeInTheDocument();
    expect(screen.getByText("Activity 1")).toBeInTheDocument();
  });

  it("renders accessible replay buttons for completed activities", async () => {
    (api.getModule as any).mockResolvedValue(mockModule);
    // Mock activity 1 as completed
    (api.getProgress as any).mockResolvedValue({
      progress: [{ activityId: "a-1", status: "COMPLETED" }],
    });

    render(
      <MemoryRouter initialEntries={["/student/modules/test-module"]}>
        <Routes>
          <Route path="/student/modules/:slug" element={<ModuleDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Test Module")).toBeInTheDocument();
    });

    // Check for "Done" badge
    expect(screen.getByText("Done")).toBeInTheDocument();

    // Check for Replay button
    const replayButtons = screen.getAllByText("Replay");
    expect(replayButtons.length).toBeGreaterThan(0);

    // We want to verify accessibility - this will fail before our changes if we check specific aria-label
    // or pass if we just check for existence.
    // To TDD this, we should look for the button by label
    expect(screen.getByLabelText("Replay Activity 1")).toBeInTheDocument();
  });
});
