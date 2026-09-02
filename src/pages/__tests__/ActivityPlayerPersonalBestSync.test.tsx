import {
  render,
  renderHook,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActivityPlayer from "@/pages/ActivityPlayer";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import {
  usePersonalBest,
  __resetPersonalBestCache,
} from "@/hooks/usePersonalBest";

vi.mock("@/services/api", () => ({
  api: {
    getModule: vi.fn(),
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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const GAME_KEY = "tank_trek";

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

/** What the server persisted for this play-through. */
const PERSISTED_BEST = {
  id: "gpb-1",
  studentId: "student-123",
  gameKey: GAME_KEY,
  bestScore: 14,
  lastScore: 14,
  bestStreak: 5,
  bestRoundsCompleted: 6,
  playCount: 3,
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

/**
 * #640 — the personal-best cache is written once at first mount and, before this
 * fix, never again: `updatePersonalBestCache` was exported and never called, so
 * every screen after a completion still compared against the pre-play value.
 * This pins the seam — a completion adopts the record the server persisted.
 */
describe("ActivityPlayer personal-best cache sync (#640)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetGradeBandCache();
    __resetPersonalBestCache();
    localStorage.clear();
    localStorage.setItem("bb_access_token", "test-token");
    vi.mocked(api.getModule).mockResolvedValue(mockModule);
    vi.mocked(api.getStudentCourses).mockResolvedValue([]);
    // Nothing cached from the server on a cold read — only the completion
    // response can supply the record.
    vi.mocked(api.getGamePersonalBests).mockResolvedValue([]);
  });

  it("adopts the personalBest the completion response persisted", async () => {
    vi.mocked(api.completeActivity).mockResolvedValue({
      progress: { id: "prog-1", status: "COMPLETED" },
      reward: {
        xpDelta: 0,
        levelDelta: 0,
        energyDelta: 0,
        hpDelta: 0,
        newAbilitiesDelta: 0,
      },
      avatar: { level: 1, xp: 100 },
      personalBest: PERSISTED_BEST,
      isNewHighScore: true,
      isNewBestStreak: true,
    });

    renderPlayer();
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark Complete" }),
    );
    await waitFor(() => expect(api.completeActivity).toHaveBeenCalledTimes(1));

    // A screen mounted after the completion reads the persisted record straight
    // from the cache — no refetch, no stale first-mount value.
    const { result } = renderHook(() => usePersonalBest(GAME_KEY));
    expect(result.current).toEqual({
      bestScore: 14,
      bestStreak: 5,
      playCount: 3,
    });
    expect(api.getGamePersonalBests).not.toHaveBeenCalled();
  });

  it("leaves the cache untouched when the response carries no record", async () => {
    vi.mocked(api.completeActivity).mockResolvedValue({
      progress: { id: "prog-1", status: "COMPLETED" },
      reward: {
        xpDelta: 50,
        levelDelta: 0,
        energyDelta: 5,
        hpDelta: 2,
        newAbilitiesDelta: 0,
      },
      avatar: { level: 1, xp: 150 },
      personalBest: null,
      isNewHighScore: false,
      isNewBestStreak: false,
    });

    renderPlayer();
    fireEvent.click(
      await screen.findByRole("button", { name: "Mark Complete" }),
    );
    await waitFor(() => expect(api.completeActivity).toHaveBeenCalledTimes(1));

    const { result } = renderHook(() => usePersonalBest(GAME_KEY));
    await waitFor(() => expect(api.getGamePersonalBests).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
