/**
 * The route the student dashboard's Continue actually navigates to (#842).
 *
 * This exists because "the Modules page's Continue matches the dashboard's"
 * was previously asserted by a test that held its *own* copy of the
 * dashboard's route template. Review rewrote the real `goToNext()` and the
 * parity suite stayed green — the test was comparing against itself.
 *
 * Both surfaces now build the route with the shared builders in
 * `src/lib/continueScan.ts`. The literal below is the falsification anchor for
 * this side: mutate `activityHref` or `MODULES_INDEX_PATH` and this case fails
 * alongside the Modules-page one, which is the property "structural parity"
 * has to mean.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudentDashboard from "@/pages/StudentDashboard";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";

const OPEN_SLUG = "k2-stem-bounce-buds";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

const authApi = { get: vi.fn() };
vi.mock("@/services/api", () => ({
  api: {
    getAvatar: vi.fn(),
    getModules: vi.fn(),
    getModule: vi.fn(),
    getProgress: vi.fn(),
    getStudentCourses: vi.fn(),
    getStudentAssignments: vi.fn(),
  },
  useApi: () => authApi,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "s-1", name: "Ada Explorer" } }),
}));

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

const toastResult = { toast: vi.fn() };
vi.mock("@/hooks/use-toast", () => ({ useToast: () => toastResult }));

vi.mock("@/components/student/PulseSurveyDialog", () => ({
  default: () => null,
}));

function structureFor(slug: string, title: string) {
  return {
    slug,
    title,
    units: [
      {
        id: `${slug}-u1`,
        title: "Unit 1",
        order: 1,
        lessons: [
          {
            id: `${slug}-l1`,
            title: "Lesson 1",
            order: 1,
            activities: [
              {
                id: `${slug}-a1`,
                title: `${title} Quest`,
                kind: "INTERACT",
                order: 1,
              },
            ],
          },
        ],
      },
    ],
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  __resetGradeBandCache();
  localStorage.clear();
  navigate.mockClear();
  vi.mocked(api.getAvatar).mockResolvedValue({ level: 1, xp: 0 });
  vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  vi.mocked(api.getStudentAssignments).mockResolvedValue([]);
  vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
  vi.mocked(api.getModules).mockResolvedValue([
    {
      id: `${OPEN_SLUG}-id`,
      slug: OPEN_SLUG,
      title: "Bounce and Buds",
      level: "K-2",
      published: true,
    },
  ]);
  vi.mocked(api.getModule).mockImplementation(async (slug: string) =>
    structureFor(slug, "Bounce and Buds"),
  );
  authApi.get.mockResolvedValue([]);
});

describe("StudentDashboard — the Continue route", () => {
  it("navigates to the scan target's activity route", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider>
        <StudentDashboard />
      </TooltipProvider>,
    );

    await screen.findByText("Bounce and Buds Quest");
    await user.click(screen.getByText("Play Next!"));

    expect(navigate).toHaveBeenCalledWith(
      `/student/modules/${OPEN_SLUG}/lessons/${OPEN_SLUG}-l1/activities/${OPEN_SLUG}-a1`,
    );
  });

  it("navigates to the modules index when the scan found nothing", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getModules).mockResolvedValue([]);
    render(
      <TooltipProvider>
        <StudentDashboard />
      </TooltipProvider>,
    );

    await screen.findByText("Start Playing!");
    await user.click(screen.getByText("Start Playing!"));
    expect(navigate).toHaveBeenCalledWith("/student/modules");
  });
});
