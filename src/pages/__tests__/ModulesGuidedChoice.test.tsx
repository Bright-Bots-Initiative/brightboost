/**
 * #842 — guided choice on the real Modules page.
 *
 * The panel's own behavior is covered in `GuidedChoice.test.tsx`. These cases
 * exercise the wiring that only exists on the page:
 *
 * - Continue points at the target the **canonical scan** produced from real
 *   catalog structures, i.e. the student dashboard's target, asserted through
 *   the router mock rather than a prop;
 * - "Surprise me" reaches no router call until Accept;
 * - the set sections (#697's locked/greyed cards) are untouched by the layer
 *   added above them;
 * - a gated Set 3 module can never appear as an alternative even when the
 *   catalog still lists it.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Modules from "../Modules";
import { api } from "../../services/api";
import { HIDDEN_MODULE_SLUGS, STEM_SET_1_IDS } from "@/constants/stemSets";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../services/api", () => ({
  api: {
    getModules: vi.fn(),
    getAvatar: vi.fn().mockResolvedValue(null),
    getProgress: vi.fn().mockResolvedValue({ progress: [] }),
    getModule: vi.fn(),
    getStudentAssignments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

const BOUNCE = "k2-stem-bounce-buds";
const GOTCHA = "k2-stem-gotcha-gears";
const RHYME = "k2-stem-rhyme-ride";
const TRACK = "k2-stem-track-maker";
const MAZE = "k2-stem-maze-maps";

function catalogRecord(slug: string, title: string) {
  return {
    id: slug,
    slug,
    title,
    description: `${title} objective`,
    level: "K-2",
    published: true,
  };
}

function structure(slug: string, activityIds: string[]) {
  return {
    slug,
    title: `${slug} title`,
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
            activities: activityIds.map((id, i) => ({
              id,
              title: `${id} title`,
              kind: "INTERACT",
              order: i + 1,
            })),
          },
        ],
      },
    ],
  };
}

const STRUCTURES: Record<string, unknown> = {
  [BOUNCE]: structure(BOUNCE, ["bounce-buds", "bounce-buds-2"]),
  [GOTCHA]: structure(GOTCHA, ["gotcha-gears"]),
  [RHYME]: structure(RHYME, ["rhyme-ride"]),
};

beforeEach(() => {
  navigate.mockClear();
  HIDDEN_MODULE_SLUGS.add(TRACK);
  localStorage.setItem("user", JSON.stringify({ id: "student-7" }));
  (api.getModules as any).mockResolvedValue([
    catalogRecord(BOUNCE, "Bounce Buds"),
    catalogRecord(GOTCHA, "Gotcha Gears"),
    catalogRecord(RHYME, "Rhyme Ride"),
  ]);
  (api.getAvatar as any).mockResolvedValue(null);
  (api.getProgress as any).mockResolvedValue({ progress: [] });
  (api.getStudentAssignments as any).mockResolvedValue([]);
  (api.getModule as any).mockImplementation(async (slug: string) => {
    const found = STRUCTURES[slug];
    if (!found) throw new Error(`no structure for ${slug}`);
    return found;
  });
});

afterEach(() => {
  HIDDEN_MODULE_SLUGS.add(TRACK);
  localStorage.clear();
});

async function renderPage() {
  render(<Modules />);
  await screen.findByTestId("guided-choice");
}

describe("Modules page — guided choice wiring", () => {
  it("sends Continue to the activity the canonical scan found", async () => {
    const user = userEvent.setup();
    (api.getProgress as any).mockResolvedValue({
      progress: [
        {
          moduleSlug: BOUNCE,
          activityId: "bounce-buds",
          status: "COMPLETED",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    });
    await renderPage();

    await user.click(screen.getByTestId("guided-continue"));
    // The scan resumed the most recently progressed module at its first
    // incomplete activity — the same route StudentDashboard's goToNext builds.
    expect(navigate).toHaveBeenCalledWith(
      `/student/modules/${BOUNCE}/lessons/${BOUNCE}-l1/activities/bounce-buds-2`,
    );
  });

  it("falls back to the first module in canonical order with no progress", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByTestId("guided-continue"));
    // MODULE_ORDER puts Bounce Buds first, ahead of Gotcha and Rhyme.
    expect(navigate).toHaveBeenCalledWith(
      `/student/modules/${BOUNCE}/lessons/${BOUNCE}-l1/activities/bounce-buds`,
    );
  });

  it("never routes anywhere until the surprise is accepted", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByTestId("guided-surprise"));
    expect(
      screen.getByTestId("guided-surprise-disclosure"),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("guided-surprise-reroll"));
    expect(navigate).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("guided-surprise-cancel"));
    expect(navigate).not.toHaveBeenCalled();

    // …and accepting does route, so the flow is not simply inert.
    await user.click(screen.getByTestId("guided-surprise"));
    await user.click(screen.getByTestId("guided-surprise-accept"));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toMatch(/^\/student\/modules\/k2-stem-/);
  });

  it("offers only the modules Continue is not already using", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByTestId("guided-try-another"));
    const items = within(
      screen.getByTestId("guided-alternatives"),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Gotcha Gears"),
      expect.stringContaining("Rhyme Ride"),
    ]);
  });

  it("shows the catalog's own objective text, not invented copy", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByTestId("guided-try-another"));
    expect(
      within(screen.getByTestId("guided-alternatives")).getByText(
        "Gotcha Gears objective",
      ),
    ).toBeInTheDocument();
  });

  it("can never offer a gated Set 3 module the catalog still lists", async () => {
    const user = userEvent.setup();
    (api.getModules as any).mockResolvedValue([
      catalogRecord(BOUNCE, "Bounce Buds"),
      catalogRecord(GOTCHA, "Gotcha Gears"),
      catalogRecord(TRACK, "Boost Track Builder"),
    ]);
    // Even with every prerequisite finished, the release flag still holds it.
    (api.getProgress as any).mockResolvedValue({
      progress: STEM_SET_1_IDS.map((activityId) => ({
        activityId,
        status: "COMPLETED",
      })),
    });
    await renderPage();

    await user.click(screen.getByTestId("guided-try-another"));
    const list = screen.getByTestId("guided-alternatives");
    expect(within(list).queryByText("Boost Track Builder")).toBeNull();

    // Nor can the surprise reach it, however many times it is rerolled.
    await user.click(screen.getByTestId("guided-surprise"));
    for (let i = 0; i < 8; i++) {
      expect(
        screen.getByTestId("guided-surprise-name").textContent,
      ).not.toContain("Boost Track Builder");
      await user.click(screen.getByTestId("guided-surprise-reroll"));
    }
  });

  it("leaves the set sections and their locked cards alone", async () => {
    const user = userEvent.setup();
    (api.getModules as any).mockResolvedValue([
      catalogRecord(BOUNCE, "Bounce Buds"),
      catalogRecord(GOTCHA, "Gotcha Gears"),
      catalogRecord(MAZE, "Maze Maps"),
    ]);
    await renderPage();

    // The Set 2 section still renders, still locked, with its greyed card and
    // its own explanation — untouched by the choice layer above it (#697).
    await waitFor(() => {
      expect(
        screen.getAllByText(
          "Complete Set 1 STEM Games to unlock the next challenge set.",
        ).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getByText("Maze Maps")).toBeInTheDocument();
    expect(screen.queryByLabelText("Start Learning Maze Maps")).toBeNull();
    expect(
      screen.getByLabelText("Start Learning Bounce Buds"),
    ).toBeInTheDocument();

    // …and the locked module is refused as an alternative, with Set 2's own
    // reason, rather than being quietly offered by the new layer.
    await user.click(screen.getByTestId("guided-try-another"));
    expect(
      within(screen.getByTestId("guided-alternatives")).queryByText(
        "Maze Maps",
      ),
    ).toBeNull();
  });

  it("keeps the page usable when the Continue scan cannot load anything", async () => {
    const user = userEvent.setup();
    (api.getModule as any).mockRejectedValue(new Error("offline"));
    await renderPage();

    // A scan failure is an infrastructure problem, not a learner outcome: the
    // page still offers a next step rather than an error where Continue goes.
    await user.click(screen.getByTestId("guided-continue"));
    expect(navigate).toHaveBeenCalledWith(`/student/modules/${BOUNCE}`);
  });
});
