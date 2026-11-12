/**
 * Temporary diagnostic for harness item #161, not for merge: replays the
 * PersonalBestSync click-on-appear pattern and logs, per round, whether
 * game_started had fired when the button was found, whether that element is
 * still attached when clicked, and whether the click reached the API.
 */
import { Profiler } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { track } from "@/lib/analytics";
vi.mock("@/lib/analytics", async (original) => ({
  ...(await original<typeof import("@/lib/analytics")>()),
  track: vi.fn(),
}));
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

const mockModule = {
  slug: "test-module",
  units: [
    {
      lessons: [
        {
          id: "l-1",
          activities: [
            {
              id: "a-1",
              title: "Text Activity",
              kind: "INFO",
              content: JSON.stringify({ type: "text", text: "A short story." }),
            },
          ],
        },
      ],
    },
  ],
};

function starts() {
  return vi
    .mocked(track)
    .mock.calls.filter(([action]) => action.kind === "game_started").length;
}

describe("diag #161", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    __resetGradeBandCache();
    __resetPersonalBestCache();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bb_access_token", "test-token");
    localStorage.setItem("user", JSON.stringify({ id: "student-123" }));
    vi.mocked(api.getModule).mockResolvedValue(mockModule);
    vi.mocked(api.getStudentCourses).mockResolvedValue([]);
    vi.mocked(api.getGamePersonalBests).mockResolvedValue([]);
    vi.mocked(api.completeActivity).mockResolvedValue({
      reward: { xpDelta: 0 },
    });
  });

  it.each(Array.from({ length: 150 }, (_, i) => i))(
    "round %i",
    async (round) => {
      let commits = 0;
      let firstButtonCommit = -1;
      let startsAtFirstButtonCommit = -1;
      const buttons = new Set<Element>();
      const onRender = () => {
        commits += 1;
        const button = screen.queryByRole("button", { name: "Mark Complete" });
        if (button) {
          buttons.add(button);
          if (firstButtonCommit < 0) {
            firstButtonCommit = commits;
            startsAtFirstButtonCommit = starts();
          }
        }
      };
      render(
        <Profiler id="diag" onRender={onRender}>
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
          </TooltipProvider>
        </Profiler>,
      );
      const found = await screen.findByRole("button", {
        name: "Mark Complete",
      });
      const startsAtFind = starts();
      const connected = found.isConnected;
      fireEvent.click(found);
      const called = vi.mocked(api.completeActivity).mock.calls.length;
      console.log(
        "DIAG161 " +
          JSON.stringify({
            round,
            called,
            startsAtFind,
            connected,
            firstButtonCommit,
            startsAtFirstButtonCommit,
            buttonNodes: buttons.size,
            commits,
          }),
      );
      cleanup();
    },
  );
});
