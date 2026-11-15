/**
 * #832 item 4 — the completion latch (`completingRef`, added by #827/#809)
 * had no automated coverage. These pin the three behaviors the latch owns:
 * a double submit sends ONE POST, a failed save releases the latch so the
 * student can retry, and a successful save replaces the game with the
 * results screen (which is why staying latched on success is safe).
 *
 * The latch is client-side dedupe only — the server's atomic claim (#821)
 * is what actually guarantees single-award. LATCH-1 therefore asserts the
 * POST count, not any reward semantics.
 */
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { Profiler } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { STEM_SET_1_IDS, STEM_SET_2_MODULE_SLUGS } from "@/constants/stemSets";
import { track } from "@/lib/analytics";
vi.mock("@/lib/analytics", async (original) => ({
  ...(await original<typeof import("@/lib/analytics")>()),
  track: vi.fn(),
}));
import ActivityPlayer from "@/pages/ActivityPlayer";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import { __resetPersonalBestCache } from "@/hooks/usePersonalBest";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import viLocale from "@/locales/vi/common.json";
import zhCN from "@/locales/zh-CN/common.json";

vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
    getProgress: vi.fn(),
    getStudentAssignments: vi.fn(),
    completeActivity: vi.fn(),
    getGamePersonalBests: vi.fn(),
    getStudentCourses: vi.fn().mockResolvedValue([]),
    getAvatar: vi.fn().mockResolvedValue({ archetype: null, stage: "GENERAL" }),
  },
}));

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

// Hoisted so the #791 tests can read the toast copy; cleared in beforeEach.
const toastSpy = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

const mockTextActivity = {
  id: "a-1",
  title: "Text Activity",
  kind: "INFO",
  content: JSON.stringify({ type: "text", text: "A short story." }),
};

const mockModule = {
  slug: "test-module",
  units: [{ lessons: [{ id: "l-1", activities: [mockTextActivity] }] }],
};

const COMPLETION_RESPONSE = {
  progress: { id: "prog-1", status: "COMPLETED" },
  reward: {
    xpDelta: 50,
    levelDelta: 0,
    energyDelta: 0,
    hpDelta: 0,
    newAbilitiesDelta: 0,
  },
  avatar: { level: 1, xp: 100 },
  personalBest: null,
  isNewHighScore: false,
  isNewBestStreak: false,
};

function renderPlayer() {
  return render(
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
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetGradeBandCache();
  __resetPersonalBestCache();
  sessionStorage.clear();
  vi.mocked(api.getModule).mockResolvedValue(mockModule);
  vi.mocked(api.getGamePersonalBests).mockResolvedValue([]);
});

describe("completion latch (#832 item 4)", () => {
  it("LATCH-1: a double submit sends exactly one POST", async () => {
    // Keep the first POST pending so the second click lands mid-flight.
    let resolveFirst: (v: typeof COMPLETION_RESPONSE) => void = () => {};
    vi.mocked(api.completeActivity).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );

    renderPlayer();
    const button = await screen.findByRole("button", {
      name: "Mark Complete",
    });
    fireEvent.click(button);
    fireEvent.click(button); // the double-tap

    expect(api.completeActivity).toHaveBeenCalledTimes(1);

    resolveFirst(COMPLETION_RESPONSE);
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mark Complete" }),
      ).toBeNull(),
    );
    expect(api.completeActivity).toHaveBeenCalledTimes(1);
  });

  it("LATCH-2: a failed save releases the latch so the student can retry", async () => {
    vi.mocked(api.completeActivity)
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(COMPLETION_RESPONSE);

    renderPlayer();
    const button = await screen.findByRole("button", {
      name: "Mark Complete",
    });

    fireEvent.click(button);
    await waitFor(() => expect(api.completeActivity).toHaveBeenCalledTimes(1));

    // The failure released the latch: the retry must POST again.
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark Complete" }),
    );
    await waitFor(() => expect(api.completeActivity).toHaveBeenCalledTimes(2));
    const [first, retry] = vi.mocked(api.completeActivity).mock.calls;
    expect(first[0].attemptId).toMatch(/^[a-f0-9-]{36}$/);
    expect(retry[0].attemptId).toBe(first[0].attemptId);
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "game_started",
        attempt_id: first[0].attemptId,
      }),
    );
    expect(track).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "game_completed" }),
    );
  });

  it("closing an unfinished tab only starts a play; reopening starts a distinct play", async () => {
    const first = renderPlayer();
    await screen.findByRole("button", { name: "Mark Complete" });
    first.unmount();
    renderPlayer();
    await screen.findByRole("button", { name: "Mark Complete" });
    const starts = vi
      .mocked(track)
      .mock.calls.map(([action]) => action)
      .filter((action) => action.kind === "game_started");
    expect(starts).toHaveLength(2);
    expect(new Set(starts.map((action) => action.attempt_id)).size).toBe(2);
    expect(api.completeActivity).not.toHaveBeenCalled();
  });

  it("LATCH-3: a successful save replaces the flow with the results screen", async () => {
    vi.mocked(api.completeActivity).mockResolvedValue(COMPLETION_RESPONSE);

    renderPlayer();
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark Complete" }),
    );

    // The results screen replaces the activity — there is nothing left to
    // double-submit, which is why the latch may stay latched on success.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Mark Complete" }),
      ).toBeNull(),
    );
    expect(api.completeActivity).toHaveBeenCalledTimes(1);
  });

  it("LATCH-4: a click in the first commit that shows Mark Complete posts one completion", async () => {
    // A Set 2 module's access waits on progress, which this test holds. Once
    // it is released, the activity and its Mark Complete button first render
    // in the same commit — the window in which a tap used to be dropped.
    const slug = STEM_SET_2_MODULE_SLUGS[0];
    vi.mocked(api.getModule).mockResolvedValue({
      ...mockModule,
      slug,
      level: "K-2",
      published: true,
    });
    let releaseProgress: (v: unknown) => void = () => {};
    vi.mocked(api.getProgress).mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseProgress = resolve;
        }),
    );
    vi.mocked(api.completeActivity).mockResolvedValue(COMPLETION_RESPONSE);

    // Profiler's onRender runs inside the commit, before passive effects, so
    // this clicks the button in the very commit that first paints it.
    let clicked = false;
    const clickOnFirstSight = () => {
      if (clicked) return;
      const button = screen.queryByRole("button", { name: "Mark Complete" });
      if (!button) return;
      clicked = true;
      button.click();
    };

    render(
      <Profiler id="first-commit" onRender={clickOnFirstSight}>
        <TooltipProvider>
          <MemoryRouter
            initialEntries={[
              `/student/modules/${slug}/lessons/l-1/activities/a-1`,
            ]}
          >
            <Routes>
              <Route
                path="/student/modules/:slug/lessons/:lessonId/activities/:activityId"
                element={<ActivityPlayer />}
              />
            </Routes>
          </MemoryRouter>
        </TooltipProvider>
      </Profiler>,
    );

    // The async act flushes in a macrotask, after getModule's settle chain
    // has drained, so only the held progress request stands between the
    // page and the activity.
    await act(async () => {});
    expect(api.getProgress).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Mark Complete" })).toBeNull();

    await act(async () => {
      releaseProgress({
        progress: STEM_SET_1_IDS.map((activityId) => ({
          activityId,
          status: "COMPLETED",
        })),
      });
    });

    expect(clicked).toBe(true);
    await waitFor(() => expect(api.completeActivity).toHaveBeenCalledTimes(1));
    const starts = vi
      .mocked(track)
      .mock.calls.map(([action]) => action)
      .filter((action) => action.kind === "game_started");
    expect(starts).toHaveLength(1);
    expect(vi.mocked(api.completeActivity).mock.calls[0][0].attemptId).toBe(
      starts[0].attempt_id,
    );
  });
});

/**
 * #791 — a replay is reward-free on purpose; the results screen and toast
 * must say so instead of "You earned +0 points" / "Awesome, saved!". The
 * i18n mock does not interpolate, so these check which copy is shown, not
 * a rendered count.
 */
describe("replay results copy (#791)", () => {
  const ALREADY_COUNTED = "Already counted — nice replay!";

  function reply(message: string | undefined, xpDelta: number) {
    return {
      ...COMPLETION_RESPONSE,
      ...(message === undefined ? {} : { message }),
      reward: { ...COMPLETION_RESPONSE.reward, xpDelta },
    };
  }

  async function completeWith(response: unknown) {
    vi.mocked(api.completeActivity).mockResolvedValue(response);
    renderPlayer();
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark Complete" }),
    );
    await screen.findByRole("heading", { name: "Activity Complete!" });
  }

  function completionToastDescription() {
    const call = toastSpy.mock.calls.find(
      ([arg]) => arg?.title === "Activity Completed!",
    );
    return call?.[0].description;
  }

  function expectReplayCopy() {
    expect(screen.getByText(ALREADY_COUNTED)).toBeInTheDocument();
    expect(screen.queryByText("You earned")).toBeNull();
    expect(screen.queryByText(/points/)).toBeNull();
    expect(completionToastDescription()).toBe(ALREADY_COUNTED);
  }

  function expectEarnedCopy() {
    expect(screen.getByText("You earned")).toBeInTheDocument();
    expect(screen.getByText(/points/)).toBeInTheDocument();
    expect(screen.queryByText(ALREADY_COUNTED)).toBeNull();
  }

  it("REPLAY-1: an already-completed reply shows already-counted copy, not +0 points", async () => {
    await completeWith(reply("Already completed", 0));
    expectReplayCopy();
  });

  it("REPLAY-2: a first completion that earned XP still shows the points", async () => {
    await completeWith(COMPLETION_RESPONSE);
    expectEarnedCopy();
    expect(completionToastDescription()).toEqual(
      expect.stringContaining("points"),
    );
  });

  it("REPLAY-3: a backfilled replay that added XP still shows the points", async () => {
    await completeWith(reply("Already completed (avatar backfilled)", 50));
    expectEarnedCopy();
    expect(completionToastDescription()).toEqual(
      expect.stringContaining("points"),
    );
  });

  it("REPLAY-4: a backfilled replay that added no XP gets the replay copy", async () => {
    await completeWith(reply("Already completed (avatar backfilled)", 0));
    expectReplayCopy();
  });

  it("REPLAY-5: a 0-XP first completion (no message) keeps today's copy", async () => {
    await completeWith(reply(undefined, 0));
    expectEarnedCopy();
    expect(completionToastDescription()).toBe("Awesome, saved!");
  });

  it("REPLAY-6: es, vi and zh-CN carry their own already-counted string", () => {
    expect(en.activityPlayer.alreadyCounted).toBe(ALREADY_COUNTED);
    for (const locale of [es, viLocale, zhCN]) {
      expect(locale.activityPlayer.alreadyCounted).toBeTruthy();
      expect(locale.activityPlayer.alreadyCounted).not.toBe(ALREADY_COUNTED);
    }
  });
});
