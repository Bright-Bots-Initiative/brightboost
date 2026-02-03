import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ActivityPlayer from "../ActivityPlayer";
import { api } from "@/services/api";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock API
vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    completeActivity: vi.fn(),
  },
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockQuizActivity = {
  id: "a-1",
  title: "Quiz Activity",
  kind: "INFO",
  content: JSON.stringify({
    type: "story_quiz",
    slides: [{ id: "s1", text: "Intro slide" }],
    questions: [
      {
        id: "q1",
        prompt: "What is 2+2?",
        choices: ["3", "4", "5"],
        answerIndex: 1,
      }
    ]
  })
};

const mockModule = {
  slug: "test-module",
  units: [{
    lessons: [{
      id: "l-1",
      activities: [mockQuizActivity]
    }]
  }]
};

describe("ActivityPlayer Accessibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders quiz choices with accessible attributes", async () => {
    (api.getModule as any).mockResolvedValue(mockModule);

    render(
      <MemoryRouter initialEntries={["/student/modules/test-module/lessons/l-1/activities/a-1"]}>
        <Routes>
          <Route path="/student/modules/:slug/lessons/:lessonId/activities/:activityId" element={<ActivityPlayer />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for activity to load
    await waitFor(() => {
      expect(screen.getByText("Intro slide")).toBeInTheDocument();
    });

    // Advance to quiz. With 1 slide (index 0), current index is 0.
    // slideIndex < slides.length - 1  => 0 < 0 => false.
    // So "Start Quiz" button is rendered.
    const startQuizBtn = screen.getByText("Start Quiz");
    fireEvent.click(startQuizBtn);

    // Now in Quiz mode
    await waitFor(() => {
      expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    });

    // Verify grouping
    // We expect the choices to be in a group labeled by the prompt
    const group = screen.getByRole("group", { name: "What is 2+2?" });
    expect(group).toBeInTheDocument();

    // Select an option
    const correctOption = screen.getByText("4");
    fireEvent.click(correctOption);

    // Verify pressed state
    expect(correctOption).toHaveAttribute("aria-pressed", "true");

    const incorrectOption = screen.getByText("3");
    expect(incorrectOption).toHaveAttribute("aria-pressed", "false");
  });
});
