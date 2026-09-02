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
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import ActivityPlayer from "@/pages/ActivityPlayer";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import { __resetPersonalBestCache } from "@/hooks/usePersonalBest";

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
});
