import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActivityPlayer from "@/pages/ActivityPlayer";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";

vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    completeActivity: vi.fn(),
    getStudentCourses: vi.fn().mockResolvedValue([]),
    getAvatar: vi.fn().mockResolvedValue({ archetype: null, stage: "GENERAL" }),
  },
}));

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

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

const mockQuizOnlyActivity = {
  id: "a-2",
  title: "Quiz Only",
  kind: "INFO",
  content: JSON.stringify({
    type: "story_quiz",
    slides: [],
    questions: [
      {
        id: "q1",
        prompt: "Quiz only question?",
        choices: ["A", "B"],
        answerIndex: 0,
      },
    ],
  }),
};

const mockNoQuestionsActivity = {
  id: "a-3",
  title: "Story Only",
  kind: "INFO",
  content: JSON.stringify({
    type: "story_quiz",
    slides: [{ id: "s1", text: "Only slide" }],
    questions: [],
  }),
};

function renderPlayer(activityId = "a-1") {
  return render(
    <TooltipProvider>
      <MemoryRouter
        initialEntries={[
          `/student/modules/test-module/lessons/l-1/activities/${activityId}`,
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
}

async function enterQuizFromStory() {
  await waitFor(() => {
    expect(screen.getByText("Intro slide")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText("Start Quiz"));
}

describe("ActivityPlayer quiz variant gate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetGradeBandCache();
    localStorage.clear();
    vi.mocked(api.getModule).mockResolvedValue(mockModule);
    vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  });

  it("k2 band mounts instant quiz stub", async () => {
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([{ gradeBand: "k2" }]);

    renderPlayer();
    await enterQuizFromStory();

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("g3_5 band mounts LegacyListQuiz with Submit", async () => {
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([{ gradeBand: "g3_5" }]);

    renderPlayer();
    await enterQuizFromStory();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });
    expect(screen.queryByTestId("instant-quiz")).not.toBeInTheDocument();
  });

  it("E-1: questions.length === 0 mounts neither quiz variant", async () => {
    vi.mocked(api.getModule).mockResolvedValue({
      ...mockModule,
      units: [
        {
          lessons: [
            {
              id: "l-1",
              activities: [mockNoQuestionsActivity],
            },
          ],
        },
      ],
    });
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([{ gradeBand: "k2" }]);

    renderPlayer("a-3");

    await waitFor(() => {
      expect(screen.getByText("Only slide")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Start Quiz"));

    expect(screen.queryByTestId("instant-quiz")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  it("quiz-only activity auto-enters with k2 instant variant", async () => {
    vi.mocked(api.getModule).mockResolvedValue({
      ...mockModule,
      units: [
        {
          lessons: [
            {
              id: "l-1",
              activities: [mockQuizOnlyActivity],
            },
          ],
        },
      ],
    });
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([{ gradeBand: "k2" }]);

    renderPlayer("a-2");

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });
    expect(screen.getByText("Quiz only question?")).toBeInTheDocument();
  });

  it("quiz-only activity auto-enters with g3_5 legacy variant", async () => {
    vi.mocked(api.getModule).mockResolvedValue({
      ...mockModule,
      units: [
        {
          lessons: [
            {
              id: "l-1",
              activities: [mockQuizOnlyActivity],
            },
          ],
        },
      ],
    });
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([
      { gradeBand: "g3_5" },
    ]);

    renderPlayer("a-2");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
    });
    expect(screen.getByText("Quiz only question?")).toBeInTheDocument();
    expect(screen.queryByTestId("instant-quiz")).not.toBeInTheDocument();
  });

  it("anonymous visitor with no enrolled courses mounts instant variant (default k2 band)", async () => {
    localStorage.clear();
    vi.mocked(api.getStudentCourses).mockResolvedValue([]);

    renderPlayer();
    await enterQuizFromStory();

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });

  // covered-by AC-5.2
  it("E-5: variant frozen when band flips k2 to g3_5 after quiz entry", async () => {
    vi.mocked(api.getStudentCourses).mockResolvedValueOnce([{ gradeBand: "k2" }]);

    renderPlayer();
    await enterQuizFromStory();

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });

    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "g3_5" }]);
    __resetGradeBandCache();
    localStorage.setItem("user", JSON.stringify({ id: "flip-user" }));

    await waitFor(() => {
      expect(screen.getByTestId("instant-quiz")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Submit" })).not.toBeInTheDocument();
  });
});
