/**
 * #856 — direct-URL entry into refused content.
 *
 * Before this, `ModuleDetail` and `ActivityPlayer` enforced only
 * HIDDEN_MODULE_SLUGS + specialization, so pasting the URL of a locked Set 2
 * module played it end to end and `POST /progress/complete-activity` recorded
 * it. These pin the shared policy on both deep-link surfaces: a refused target
 * renders the supported "unavailable" state (reason as text, no focus steal, a
 * visible focusable route back — docs/safe-exploration-accessibility.md §1/§7)
 * and never initializes the activity.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActivityPlayer from "@/pages/ActivityPlayer";
import ModuleDetail from "@/pages/ModuleDetail";
import { api } from "@/services/api";
import { track } from "@/lib/analytics";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import {
  HIDDEN_MODULE_SLUGS,
  STEM_SET_1_IDS,
  STEM_SET_2_MODULE_SLUGS,
} from "@/constants/stemSets";

vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    getProgress: vi.fn(),
    getAvatar: vi.fn(),
    getStudentCourses: vi.fn(),
    getStudentAssignments: vi.fn(),
    completeActivity: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const LOCKED_SET2_SLUG = STEM_SET_2_MODULE_SLUGS[0];
const HIDDEN_SLUG = "k2-stem-sequencing";
const G35_SLUG = "g35-data-dash-sort-discover";

const STORY_ACTIVITY = {
  id: "a-1",
  title: "Maze Story",
  kind: "INFO",
  content: JSON.stringify({
    type: "story_quiz",
    slides: [{ id: "s1", text: "Intro slide" }],
    questions: [
      { id: "q1", prompt: "2+2?", choices: ["3", "4"], answerIndex: 1 },
    ],
  }),
};

function moduleFor(slug: string, level = "K-2") {
  return {
    id: `${slug}-id`,
    slug,
    level,
    published: true,
    title: "Maze Maps & Smart Paths",
    description: "Find the smart path.",
    units: [
      {
        id: "u-1",
        title: "Unit 1",
        lessons: [
          { id: "l-1", title: "Lesson 1", activities: [STORY_ACTIVITY] },
        ],
      },
    ],
  };
}

function renderPlayer(slug: string) {
  return render(
    <TooltipProvider>
      <MemoryRouter
        initialEntries={[`/student/modules/${slug}/lessons/l-1/activities/a-1`]}
      >
        <Routes>
          <Route
            path="/student/modules/:slug/lessons/:lessonId/activities/:activityId"
            element={<ActivityPlayer />}
          />
          <Route path="/student/modules" element={<div>MODULES LIST</div>} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

function renderDetail(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/student/modules/${slug}`]}>
      <Routes>
        <Route path="/student/modules/:slug" element={<ModuleDetail />} />
        <Route path="/student/modules" element={<div>MODULES LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const LOCKED_COPY =
  "Finish the games before this one to open it. You are so close!";
const GENERIC_COPY =
  "This one is not here right now. Pick a new game from your modules!";
const WRONG_GRADE_COPY =
  "This one is made for bigger kids. Your modules have games that are just right for you!";

beforeEach(() => {
  vi.resetAllMocks();
  __resetGradeBandCache();
  localStorage.clear();
  vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  vi.mocked(api.getAvatar).mockResolvedValue({});
  vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
  vi.mocked(api.getStudentAssignments).mockResolvedValue([]);
  vi.mocked(api.getModule).mockResolvedValue(moduleFor(LOCKED_SET2_SLUG));
});

describe("ActivityPlayer — direct URL into a locked Set 2 module", () => {
  it("renders the unavailable state, never starts the activity", async () => {
    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByTestId("module-unavailable")).toBeInTheDocument();
    expect(screen.getByText(LOCKED_COPY)).toBeInTheDocument();

    // No initialization: no story, no quiz, no game_started, no completion.
    expect(screen.queryByText("Intro slide")).toBeNull();
    expect(screen.queryByText("Start Quiz")).toBeNull();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
    expect(api.completeActivity).not.toHaveBeenCalled();
  });

  it("offers a visible, focusable route back without stealing focus", async () => {
    renderPlayer(LOCKED_SET2_SLUG);
    await screen.findByTestId("module-unavailable");

    // Entering the unavailable state never moves focus (a11y contract §1).
    expect(document.activeElement).toBe(document.body);

    const back = screen.getByRole("button", { name: "Go to My Modules" });
    back.focus();
    expect(document.activeElement).toBe(back);
  });

  it("opens normally once Set 1 is complete", async () => {
    vi.mocked(api.getProgress).mockResolvedValue({
      progress: STEM_SET_1_IDS.map((activityId) => ({
        activityId,
        status: "COMPLETED",
      })),
    });

    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByText("Intro slide")).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
  });

  it("opens when a teacher assigned it, and says the assignment is why", async () => {
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      { id: "as-1", moduleSlug: LOCKED_SET2_SLUG, activityId: "a-1" },
    ]);

    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByText("Intro slide")).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });

  it("stays refused when the assignment names a different module", async () => {
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      { id: "as-1", moduleSlug: STEM_SET_2_MODULE_SLUGS[1], activityId: "x" },
    ]);

    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByText(LOCKED_COPY)).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
  });
});

describe("ActivityPlayer — other refusals", () => {
  it("refuses a hidden slug before any content request goes out", async () => {
    expect(HIDDEN_MODULE_SLUGS.has(HIDDEN_SLUG)).toBe(true);
    renderPlayer(HIDDEN_SLUG);

    expect(await screen.findByText(GENERIC_COPY)).toBeInTheDocument();
    expect(api.getModule).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
  });

  it("refuses G3-5 content for a k2 student with a specific, child-safe reason", async () => {
    vi.mocked(api.getModule).mockResolvedValue(moduleFor(G35_SLUG, "G3-5"));
    renderPlayer(G35_SLUG);

    expect(await screen.findByText(WRONG_GRADE_COPY)).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
  });

  it("lets a 3-5 student into the same G3-5 module", async () => {
    vi.mocked(api.getModule).mockResolvedValue(moduleFor(G35_SLUG, "G3-5"));
    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "g3_5" }]);

    renderPlayer(G35_SLUG);

    expect(await screen.findByText("Intro slide")).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });
});

describe("ModuleDetail — direct URL into a locked Set 2 module", () => {
  it("renders the unavailable state instead of the activity list", async () => {
    renderDetail(LOCKED_SET2_SLUG);

    expect(await screen.findByText(LOCKED_COPY)).toBeInTheDocument();
    expect(screen.queryByText("Maze Story")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Go to My Modules" }),
    ).toBeInTheDocument();
  });

  it("renders the module once a teacher assignment covers it", async () => {
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      { id: "as-1", moduleSlug: LOCKED_SET2_SLUG, activityId: "a-1" },
    ]);

    renderDetail(LOCKED_SET2_SLUG);

    await waitFor(() => {
      expect(screen.getByText("Maze Story")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });
});
