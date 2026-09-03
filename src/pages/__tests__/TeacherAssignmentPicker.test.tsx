/**
 * #856 — the teacher's assignment picker.
 *
 * It listed every module `GET /modules` returned, unfiltered, so a teacher
 * could assign removed content, a Set 3 placeholder, or a module outside their
 * class's band. Locked-set content stays assignable on purpose: the assignment
 * is that lock's override (policy E). This mounts the real page and reads the
 * rendered `<option>`s, so the filter cannot be satisfied by a helper nobody
 * calls.
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TeacherClassDetail from "@/pages/TeacherClassDetail";
import { api as directApi } from "@/services/api";
import {
  HIDDEN_MODULE_SLUGS,
  STEM_SET_2_MODULE_SLUGS,
} from "@/constants/stemSets";

const LOCKED_SET2_SLUG = STEM_SET_2_MODULE_SLUGS[0];
const HIDDEN_SLUG = "k2-stem-sequencing";
const OPEN_SLUG = "k2-stem-bounce-buds";
const G35_SLUG = "g35-data-dash-sort-discover";

// Stable across renders — the page's load effect depends on the api object.
const authApi = { get: vi.fn(), post: vi.fn(), patch: vi.fn() };

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ApiError: actual.ApiError,
    useApi: () => authApi,
    api: {
      getModules: vi.fn(),
      getModule: vi.fn(),
    },
  };
});

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

const COURSE = {
  id: "c-1",
  name: "Room 3",
  joinCode: "ABC123",
  gradeBand: "k2",
  kind: "class" as const,
  enrollmentCount: 0,
  students: [],
  createdAt: "2026-01-01T00:00:00Z",
};

/**
 * Minimal but SHAPE-CORRECT responses for the page's eight mount requests.
 * `/attention` and `/benchmarks/growth` are objects-or-null, not arrays — the
 * page reads `attention.students` directly.
 */
function courseResponder(course: typeof COURSE) {
  return async (endpoint: string) => {
    if (endpoint === `/teacher/courses/${course.id}`) return course;
    if (
      endpoint.endsWith("/pulse/summary") ||
      endpoint.endsWith("/benchmarks/growth") ||
      endpoint.endsWith("/attention")
    ) {
      return null;
    }
    return [];
  };
}

function catalogEntry(slug: string, title: string, level = "K-2") {
  return { id: `${slug}-id`, slug, title, level, published: true };
}

function structureFor(slug: string) {
  return {
    slug,
    title: slug,
    units: [
      {
        id: `${slug}-u1`,
        title: "Unit 1",
        lessons: [
          {
            id: `${slug}-l1`,
            title: "Lesson 1",
            activities: [{ id: `${slug}-a1`, title: `${slug} activity` }],
          },
        ],
      },
    ],
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/teacher/classes/c-1"]}>
      <Routes>
        <Route path="/teacher/classes/:id" element={<TeacherClassDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Renders the page, opens the launch wizard, returns the offered slugs. */
async function pickerOptions(): Promise<string[]> {
  renderPage();
  fireEvent.click(
    await screen.findByRole("button", { name: "Launch Weekly Session" }),
  );
  const select = await screen.findByRole("combobox");
  return Array.from(select.querySelectorAll("option"))
    .map((o) => o.value)
    .filter(Boolean);
}

beforeEach(() => {
  vi.clearAllMocks();
  authApi.get.mockImplementation(courseResponder(COURSE));
  vi.mocked(directApi.getModule).mockImplementation(async (slug: string) =>
    structureFor(slug),
  );
});

describe("TeacherClassDetail — the assignment picker offers only assignable targets", () => {
  it("hides removed, placeholder and out-of-band modules, keeps locked-set ones", async () => {
    expect(HIDDEN_MODULE_SLUGS.has(HIDDEN_SLUG)).toBe(true);
    vi.mocked(directApi.getModules).mockResolvedValue([
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
      catalogEntry(LOCKED_SET2_SLUG, "Maze Maps"),
      catalogEntry(HIDDEN_SLUG, "Lost Steps"),
      catalogEntry(G35_SLUG, "Data Dash", "G3-5"),
      {
        id: "ph",
        slug: "k2-stem-set3-slot-2",
        title: "Slot 2",
        published: false,
      },
    ]);

    const options = await pickerOptions();

    // A locked set is still assignable — the assignment overrides that lock.
    expect(options).toContain(LOCKED_SET2_SLUG);
    expect(options).toContain(OPEN_SLUG);
    // Never selectable, and never even fetched for detail.
    expect(options).not.toContain(HIDDEN_SLUG);
    expect(options).not.toContain(G35_SLUG);
    expect(options).not.toContain("k2-stem-set3-slot-2");

    const detailed = vi.mocked(directApi.getModule).mock.calls.map(([s]) => s);
    expect(detailed).not.toContain(HIDDEN_SLUG);
    expect(detailed).not.toContain(G35_SLUG);
  });

  it("offers G3-5 content to a 3-5 class", async () => {
    authApi.get.mockImplementation(
      courseResponder({ ...COURSE, gradeBand: "g3_5" }),
    );
    vi.mocked(directApi.getModules).mockResolvedValue([
      catalogEntry(G35_SLUG, "Data Dash", "G3-5"),
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);

    const options = await pickerOptions();

    // K-2 content stays available to a 3-5 class — banding is intra-activity.
    expect(options).toEqual(expect.arrayContaining([G35_SLUG, OPEN_SLUG]));
  });

  it("never offers specialization-gated content to a whole class", async () => {
    vi.mocked(directApi.getModules).mockResolvedValue([
      catalogEntry("stem-1-intro", "Quantum Explorers"),
      catalogEntry(OPEN_SLUG, "Bounce and Buds"),
    ]);

    const options = await pickerOptions();

    expect(options).toContain(OPEN_SLUG);
    expect(options).not.toContain("stem-1-intro");
  });
});
