/**
 * #856 — the headline defect, at the surface the child actually touches.
 *
 * The dashboard's Continue scan filtered only by `canAccessModule`, so the
 * hero "Play Next" button could point straight at a module the Modules page
 * shows as Locked, or at a hidden slug that then dead-end bounced. These are
 * component-level, not unit-level, on purpose: the unit tests pin the scan
 * helper, but only a render proves the page wires the policy into it.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudentDashboard from "@/pages/StudentDashboard";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";
import {
  HIDDEN_MODULE_SLUGS,
  STEM_SET_2_MODULE_SLUGS,
} from "@/constants/stemSets";

const LOCKED_SET2_SLUG = STEM_SET_2_MODULE_SLUGS[0];
const HIDDEN_SLUG = "k2-stem-sequencing";
const OPEN_SLUG = "k2-stem-bounce-buds";
const G35_SLUG = "g35-data-dash-sort-discover";

// `useApi()` must return a STABLE object: the dashboard's load effect depends
// on it, so a fresh one per render would re-trigger the load forever.
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

// Stable for the same reason as `authApi`: the load effect depends on `toast`.
const toastResult = { toast: vi.fn() };
vi.mock("@/hooks/use-toast", () => ({ useToast: () => toastResult }));

vi.mock("@/components/student/PulseSurveyDialog", () => ({
  default: () => null,
}));

/** slug → human title, so module structures match their catalog entries. */
const TITLES: Record<string, string> = {};

function catalogEntry(slug: string, title: string, level = "K-2") {
  TITLES[slug] = title;
  return { id: `${slug}-id`, slug, title, level, published: true };
}

/**
 * Every place the scan's target is rendered (the hero subtitle and the
 * "Keep Playing" list). Asserting the whole set — not just that the allowed
 * module is present — is what makes these tests discriminating: a scan that
 * still reached refused content would show it here.
 */
function scanTargetNames() {
  return screen.queryAllByText(/ Quest$/).map((el) => el.textContent ?? "");
}

function expectScanTargetsOnlyFrom(moduleTitle: string) {
  const names = scanTargetNames();
  expect(names.length).toBeGreaterThan(0);
  for (const name of names) expect(name).toContain(moduleTitle);
}

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

function renderDashboard() {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </TooltipProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  __resetGradeBandCache();
  localStorage.clear();
  vi.mocked(api.getAvatar).mockResolvedValue({ level: 1, xp: 0 });
  vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  vi.mocked(api.getStudentAssignments).mockResolvedValue([]);
  authApi.get.mockResolvedValue([]);
  for (const key of Object.keys(TITLES)) delete TITLES[key];
  vi.mocked(api.getModule).mockImplementation(async (slug: string) =>
    structureFor(slug, TITLES[slug] ?? slug),
  );
});

describe("StudentDashboard — Continue can never target refused content", () => {
  it("skips a locked Set 2 module that has the most recent progress", async () => {
    // The locked module is first in priority order (most recent progress), so
    // before #856 the hero pointed at it.
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(LOCKED_SET2_SLUG, "Maze Maps"),
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({
      progress: [
        {
          moduleSlug: LOCKED_SET2_SLUG,
          activityId: "irrelevant",
          status: "IN_PROGRESS",
          updatedAt: "2026-08-01T00:00:00Z",
        },
      ],
    });

    renderDashboard();

    // The hero names the first ALLOWED target instead.
    await screen.findByText("Bounce and Buds Quest");
    expectScanTargetsOnlyFrom("Bounce and Buds");
    expect(screen.queryByText(/Maze Maps/)).toBeNull();

    // Refused content is not merely hidden from the result — never fetched.
    const fetched = vi.mocked(api.getModule).mock.calls.map(([s]) => s);
    expect(fetched).not.toContain(LOCKED_SET2_SLUG);
    expect(fetched).toContain(OPEN_SLUG);
  });

  it("skips a hidden module so Play Next cannot dead-end bounce", async () => {
    expect(HIDDEN_MODULE_SLUGS.has(HIDDEN_SLUG)).toBe(true);
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(HIDDEN_SLUG, "Lost Steps"),
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });

    renderDashboard();

    await screen.findByText("Bounce and Buds Quest");
    const fetched = vi.mocked(api.getModule).mock.calls.map(([s]) => s);
    expect(fetched).not.toContain(HIDDEN_SLUG);
  });

  it("skips G3-5 content for a K-2 student", async () => {
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(G35_SLUG, "Data Dash", "G3-5"),
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });

    renderDashboard();

    await screen.findByText("Bounce and Buds Quest");
    const fetched = vi.mocked(api.getModule).mock.calls.map(([s]) => s);
    expect(fetched).not.toContain(G35_SLUG);
  });

  it("offers that same G3-5 module to a 3-5 student", async () => {
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(G35_SLUG, "Data Dash", "G3-5"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
    vi.mocked(api.getStudentCourses).mockResolvedValue([{ gradeBand: "g3_5" }]);

    renderDashboard();

    await screen.findByText("Data Dash Quest");
    expectScanTargetsOnlyFrom("Data Dash");
  });

  it("lets a teacher assignment put a locked module back in the scan", async () => {
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(LOCKED_SET2_SLUG, "Maze Maps"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      {
        id: "as-1",
        title: "Do Maze Maps",
        activityId: `${LOCKED_SET2_SLUG}-a1`,
        activityTitle: "Maze Maps Quest",
        moduleSlug: LOCKED_SET2_SLUG,
        lessonId: `${LOCKED_SET2_SLUG}-l1`,
        dueDate: "2026-09-10",
        courseName: "Class A",
        completed: false,
      },
    ]);

    renderDashboard();

    await screen.findByText("Maze Maps Quest");
    expectScanTargetsOnlyFrom("Maze Maps");
  });
});

describe("StudentDashboard — refused assignments stay visible", () => {
  it("renders a refused assignment with its reason and a disabled action", async () => {
    // Hidden target: the assignment must not silently disappear (a11y §7),
    // and must not be startable either.
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      {
        id: "as-1",
        title: "Retired homework",
        activityId: "x",
        activityTitle: "Lost Steps",
        moduleSlug: HIDDEN_SLUG,
        lessonId: "l",
        dueDate: "2026-09-10",
        courseName: "Class A",
        completed: false,
      },
    ]);

    renderDashboard();

    expect(await screen.findByText("Retired homework")).toBeInTheDocument();
    expect(
      screen.getByTestId("assignment-unavailable-reason"),
    ).toHaveTextContent(
      "This one is not here right now. Pick a new game from your modules!",
    );
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
  });

  it("leaves an allowed assignment startable and reason-free", async () => {
    vi.mocked(api.getModules).mockResolvedValue([
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);
    vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
    vi.mocked(api.getStudentAssignments).mockResolvedValue([
      {
        id: "as-1",
        title: "Tonight's homework",
        activityId: `${OPEN_SLUG}-a1`,
        activityTitle: "Bounce and Buds Quest",
        moduleSlug: OPEN_SLUG,
        lessonId: `${OPEN_SLUG}-l1`,
        dueDate: "2026-09-10",
        courseName: "Class A",
        completed: false,
      },
    ]);

    renderDashboard();

    expect(await screen.findByText("Tonight's homework")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start" })).toBeEnabled();
    });
    expect(screen.queryByTestId("assignment-unavailable-reason")).toBeNull();
  });
});
