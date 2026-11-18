import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import ActivityPlayer from "../ActivityPlayer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock API. ActivityPlayer also calls api.getStudentCourses via
// useGradeBand() to inject the grade band into the game config — stub
// it as an empty list so the call resolves without surfacing a real DB.
// api.getAvatar is used by the specialization-deeplink guard.
vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    completeActivity: vi.fn(),
    getStudentCourses: vi.fn().mockResolvedValue([]),
    getAvatar: vi.fn().mockResolvedValue({ archetype: null, stage: "GENERAL" }),
  },
}));

// Resolve i18n keys against en/common.json.
vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

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
      },
    ],
  }),
};

const mockModule = {
  slug: "test-module",
  units: [
    {
      lessons: [
        {
          id: "l-1",
          activities: [mockQuizActivity],
        },
      ],
    },
  ],
};

// The band is pinned to g3_5: these assertions are the legacy list quiz's
// contract (labelled group, aria-pressed choices), which only g3_5 mounts.
describe("ActivityPlayer Accessibility", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetGradeBandCache();
    localStorage.clear();
    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "g3_5" }]);
  });

  it("renders quiz choices with accessible attributes", async () => {
    (api.getModule as any).mockResolvedValue(mockModule);

    render(
      <TooltipProvider>
        <MemoryRouter
          initialEntries={[
            "/student/modules/test-module/lessons/l-1/activities/a-1",
          ]}
        >
          <Routes>
            <Route
              path="/student/modules/:slug/lessons/:lessonId/activities/:activityId"
              element={<ActivityPlayer />}
            />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
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

// Two questions, so the first feedback button reads "Next" rather than the
// last-question "See how I did!".
const k2FirstPrompt = "Which shape has three sides?";
const k2FirstChoices = ["Square", "Triangle", "Circle"];

const mockK2QuizActivity = {
  id: "a-1",
  title: "Quiz Activity",
  kind: "INFO",
  content: JSON.stringify({
    type: "story_quiz",
    slides: [{ id: "s1", text: "Intro slide" }],
    questions: [
      {
        id: "q1",
        prompt: k2FirstPrompt,
        choices: k2FirstChoices,
        answerIndex: 1,
      },
      {
        id: "q2",
        prompt: "Which one can fly?",
        choices: ["Bird", "Fish"],
        answerIndex: 0,
      },
    ],
  }),
};

const mockK2Module = {
  slug: "test-module",
  units: [
    {
      lessons: [
        {
          id: "l-1",
          activities: [mockK2QuizActivity],
        },
      ],
    },
  ],
};

// The band is pinned to k2: these assertions are the instant-feedback quiz's
// contract (labelled group, choices without aria-pressed, a polite status
// region, focus on Next), which only k2 mounts.
describe("ActivityPlayer Accessibility — K-2 instant quiz", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetGradeBandCache();
    localStorage.clear();
    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "k2" }]);
    (api.getModule as any).mockResolvedValue(mockK2Module);
  });

  it("labels the choices, announces feedback and focuses Next", async () => {
    render(
      <TooltipProvider>
        <MemoryRouter
          initialEntries={[
            "/student/modules/test-module/lessons/l-1/activities/a-1",
          ]}
        >
          <Routes>
            <Route
              path="/student/modules/:slug/lessons/:lessonId/activities/:activityId"
              element={<ActivityPlayer />}
            />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Intro slide")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Start Quiz" }));

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });

    const group = screen.getByRole("group", { name: k2FirstPrompt });

    // AC-3.3: choices are plain buttons named by their text, never toggles.
    for (const choice of k2FirstChoices) {
      const button = within(group).getByRole("button", { name: choice });
      expect(button).not.toHaveAttribute("aria-pressed");
    }

    fireEvent.click(within(group).getByRole("button", { name: "Triangle" }));

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("button", { name: "Next" })).toHaveFocus();

    for (const choice of k2FirstChoices) {
      const button = within(group).getByRole("button", { name: choice });
      expect(button).not.toHaveAttribute("aria-pressed");
    }
  });
});
