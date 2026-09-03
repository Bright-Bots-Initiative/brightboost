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
import { api, ApiError } from "@/services/api";
import { track } from "@/lib/analytics";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import {
  HIDDEN_MODULE_SLUGS,
  STEM_SET_1_IDS,
  STEM_SET_2_MODULE_SLUGS,
} from "@/constants/stemSets";

// The real `ApiError` is kept: the 404-vs-outage distinction is the whole
// point of several cases below, so a stand-in class would test nothing.
vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ApiError: actual.ApiError,
    api: {
      getModule: vi.fn(),
      getProgress: vi.fn(),
      getAvatar: vi.fn(),
      getStudentCourses: vi.fn(),
      getStudentAssignments: vi.fn(),
      completeActivity: vi.fn(),
    },
  };
});

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

  // No surface discloses "your teacher picked this" yet — the result carries
  // `source: "teacher_assignment"` for #842 to consume. This asserts the
  // override opens the module, nothing about disclosure.
  it("opens when a teacher assigned it", async () => {
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

// ── An unresolved input is never a learner-facing denial ───────────────────
// Design principle 9 / accessibility contract §6: an infrastructure failure
// must be announced as a failure and must never masquerade as a learner
// outcome. These pin the three ways that used to leak.

describe("a failed grade band never becomes a wrong-grade denial", () => {
  it("shows a system problem, not 'made for bigger kids', for G3-5 content", async () => {
    vi.mocked(api.getModule).mockResolvedValue(moduleFor(G35_SLUG, "G3-5"));
    vi.mocked(api.getStudentCourses).mockRejectedValue(new Error("offline"));

    renderPlayer(G35_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByText(WRONG_GRADE_COPY)).toBeNull();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_started" }),
    );
  });

  it("focuses the message region and offers both retry and a way out", async () => {
    vi.mocked(api.getModule).mockResolvedValue(moduleFor(G35_SLUG, "G3-5"));
    vi.mocked(api.getStudentCourses).mockRejectedValue(new Error("offline"));

    renderPlayer(G35_SLUG);
    await screen.findByTestId("module-system-problem");

    // Contract §1 unexpected-error: focus lands on the message region — the
    // opposite of the denial state, which must never steal focus.
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Oops — that one is on us!" }),
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to My Modules" }),
    ).toBeInTheDocument();
  });

  it("recovers when the retry succeeds", async () => {
    vi.mocked(api.getModule).mockResolvedValue(moduleFor(G35_SLUG, "G3-5"));
    vi.mocked(api.getStudentCourses).mockRejectedValueOnce(
      new Error("offline"),
    );

    renderPlayer(G35_SLUG);
    const retry = await screen.findByRole("button", { name: "Try again" });

    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "g3_5" }]);
    retry.click();

    expect(await screen.findByText("Intro slide")).toBeInTheDocument();
  });

  it("does not block K-2 content on the band at all", async () => {
    // The band cannot change the answer for K-2 content, so a band outage
    // must not delay it, fail it, or make it wait on /student/courses.
    vi.mocked(api.getStudentCourses).mockRejectedValue(new Error("offline"));
    vi.mocked(api.getProgress).mockResolvedValue({
      progress: STEM_SET_1_IDS.map((activityId) => ({
        activityId,
        status: "COMPLETED",
      })),
    });

    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByText("Intro slide")).toBeInTheDocument();
    expect(screen.queryByTestId("module-system-problem")).toBeNull();
  });
});

describe("a failed progress load never becomes a set-lock denial", () => {
  it("shows a system problem, not 'Activity not found' or a lock", async () => {
    vi.mocked(api.getProgress).mockRejectedValue(new Error("offline"));

    renderPlayer(LOCKED_SET2_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Activity not found")).toBeNull();
    expect(screen.queryByText(LOCKED_COPY)).toBeNull();
  });

  it("ModuleDetail shows a system problem rather than a permanent skeleton", async () => {
    vi.mocked(api.getProgress).mockRejectedValue(new Error("offline"));

    renderDetail(LOCKED_SET2_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  // `api.getProgress` never checks `res.ok`, so a backend 500 RESOLVES with
  // the routes' error body. Read through `?? []` that says "completed
  // nothing", which refuses a Set 2 module the child has already earned.
  it.each([
    ["a server error body", { error: "Internal server error" }],
    ["a null body", null],
    ["a body with no progress array", { progress: "nope" }],
  ])(
    "ActivityPlayer treats %s as unknown progress, not empty progress",
    async (_label, body) => {
      vi.mocked(api.getProgress).mockResolvedValue(body as never);

      renderPlayer(LOCKED_SET2_SLUG);

      expect(
        await screen.findByTestId("module-system-problem"),
      ).toBeInTheDocument();
      expect(screen.queryByText(LOCKED_COPY)).toBeNull();
      expect(track).not.toHaveBeenCalledWith(
        expect.objectContaining({ kind: "game_started" }),
      );
    },
  );

  it("ModuleDetail treats a resolved error body as unknown progress", async () => {
    vi.mocked(api.getProgress).mockResolvedValue({
      error: "Internal server error",
    } as never);

    renderDetail(LOCKED_SET2_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByText(LOCKED_COPY)).toBeNull();
  });

  it("a 404 from the PROGRESS request never means the module is missing", async () => {
    // Unreachable while getProgress resolves everything, but it becomes
    // reachable the moment that helper is hardened — and mis-attributing it
    // would claim a module that exists does not.
    vi.mocked(api.getProgress).mockRejectedValue(
      new ApiError("Not found", 404),
    );

    renderDetail(LOCKED_SET2_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
    expect(screen.queryByText(GENERIC_COPY)).toBeNull();
  });
});

describe("an allowed deep link never flashes 'Activity not found'", () => {
  it("keeps the loading state while the decision is still pending", async () => {
    // Module resolved, progress still in flight: the page is mid-decision.
    vi.mocked(api.getProgress).mockImplementation(
      () => new Promise(() => {}) as any,
    );

    renderPlayer(LOCKED_SET2_SLUG);

    expect(await screen.findByText("Loading activity...")).toBeInTheDocument();
    expect(screen.queryByText("Activity not found")).toBeNull();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });

  it("ModuleDetail keeps its skeleton while the decision is still pending", async () => {
    let releaseProgress: ((v: unknown) => void) | undefined;
    vi.mocked(api.getProgress).mockImplementation(
      () => new Promise((resolve) => (releaseProgress = resolve)) as any,
    );

    renderDetail(LOCKED_SET2_SLUG);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    });
    // Module content is not painted before the gate answers.
    expect(screen.queryByText("Maze Story")).toBeNull();

    releaseProgress?.({ progress: [] });
    expect(await screen.findByText(LOCKED_COPY)).toBeInTheDocument();
  });
});

describe("a nonexistent module is indistinguishable from a hidden one", () => {
  async function visibleTextFor(
    surface: "player" | "detail",
    slug: string,
    ghost: boolean,
  ) {
    if (ghost) {
      vi.mocked(api.getModule).mockRejectedValue(
        new ApiError("Module not found", 404),
      );
    }
    const view = surface === "player" ? renderPlayer(slug) : renderDetail(slug);
    const card = await screen.findByTestId("module-unavailable");
    const text = card.textContent ?? "";
    view.unmount();
    return text;
  }

  it("renders identical output on ActivityPlayer", async () => {
    const hiddenText = await visibleTextFor("player", HIDDEN_SLUG, false);
    vi.mocked(api.getModule).mockReset();
    const ghostText = await visibleTextFor("player", "no-such-module", true);

    expect(ghostText).toBe(hiddenText);
    expect(hiddenText).toContain(GENERIC_COPY);
  });

  it("renders identical output on ModuleDetail", async () => {
    const hiddenText = await visibleTextFor("detail", HIDDEN_SLUG, false);
    vi.mocked(api.getModule).mockReset();
    const ghostText = await visibleTextFor("detail", "no-such-module", true);

    expect(ghostText).toBe(hiddenText);
    expect(hiddenText).toContain(GENERIC_COPY);
  });

  it("a ghost slug is a denial, not a system problem", async () => {
    vi.mocked(api.getModule).mockRejectedValue(
      new ApiError("Module not found", 404),
    );

    renderPlayer("no-such-module");

    expect(await screen.findByTestId("module-unavailable")).toBeInTheDocument();
    expect(screen.queryByTestId("module-system-problem")).toBeNull();
    expect(screen.queryByText("Activity not found")).toBeNull();
  });

  it("a server outage is a system problem, not a ghost", async () => {
    vi.mocked(api.getModule).mockRejectedValue(
      new ApiError("Internal Server Error", 500),
    );

    renderPlayer(LOCKED_SET2_SLUG);

    expect(
      await screen.findByTestId("module-system-problem"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });
});
