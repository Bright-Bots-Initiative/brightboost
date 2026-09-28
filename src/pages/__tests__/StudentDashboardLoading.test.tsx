import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import StudentDashboard from "@/pages/StudentDashboard";
import { api } from "@/services/api";
import { __resetGradeBandCache } from "@/hooks/useGradeBand";

const authApi = { get: vi.fn() };
const auth = { user: { id: "student-a", name: "Ada" } };
vi.mock("@/services/api", () => ({
  api: {
    getAvatar: vi.fn(),
    getModules: vi.fn(),
    getModule: vi.fn(),
    getProgress: vi.fn(),
    getStudentCourses: vi.fn(),
    getStudentAssignments: vi.fn(),
    getStudentBenchmarks: vi.fn(),
  },
  useApi: () => authApi,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
const toastResult = { toast: vi.fn() };
vi.mock("@/hooks/use-toast", () => ({ useToast: () => toastResult }));
vi.mock("@/components/student/PulseSurveyDialog", () => ({
  default: () => null,
}));

const slug = "k2-stem-bounce-buds";
const courses = [
  { courseId: "course-a", courseName: "Ada's class", gradeBand: "k2" },
];
const structure = {
  slug,
  title: "Bounce and Buds",
  units: [
    {
      id: "u",
      lessons: [
        {
          id: "l",
          activities: [
            { id: "a", title: "First Quest", kind: "INTERACT", order: 1 },
          ],
        },
      ],
    },
  ],
};
const delay = <T,>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));
const advance = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};
function tree() {
  return (
    <TooltipProvider>
      <MemoryRouter>
        <StudentDashboard />
      </MemoryRouter>
    </TooltipProvider>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  __resetGradeBandCache();
  localStorage.clear();
  auth.user = { id: "student-a", name: "Ada" };
  localStorage.setItem("user", JSON.stringify(auth.user));
  localStorage.setItem("bb_access_token", "token-a");
  vi.useFakeTimers();
  vi.mocked(api.getStudentCourses).mockImplementation(() =>
    delay(100, courses),
  );
  vi.mocked(api.getAvatar).mockImplementation(() =>
    delay(50, { level: 1, xp: 0 }),
  );
  vi.mocked(api.getModules).mockImplementation(() =>
    delay(50, [
      { slug, title: "Bounce and Buds", published: true, level: "K-2" },
    ]),
  );
  vi.mocked(api.getProgress).mockImplementation(() =>
    delay(50, { progress: [] }),
  );
  vi.mocked(api.getStudentAssignments).mockImplementation(() => delay(50, []));
  vi.mocked(api.getModule).mockImplementation(() => delay(100, structure));
  vi.mocked(api.getStudentBenchmarks).mockImplementation(() => delay(5000, []));
  // The baseline uses this duplicate path. Keep it in the fixture so the same
  // connection profile measures the real page before and after #907.
  authApi.get.mockImplementation((url: string) =>
    url.endsWith("benchmarks") ? delay(5000, []) : delay(100, courses),
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("dashboard request scheduling (#907)", () => {
  it("renders Play Next without waiting for benchmarks; requests courses once", async () => {
    render(tree());
    let elapsed = 0;
    while (
      !screen.queryByRole("button", { name: /Play Next!/ }) &&
      elapsed < 6000
    ) {
      await advance(50);
      elapsed += 50;
    }
    const courseRequests =
      vi.mocked(api.getStudentCourses).mock.calls.length +
      authApi.get.mock.calls.filter(([url]) => url === "/student/courses")
        .length;
    console.info(
      `dashboard fixed-latency fixture: primary=${elapsed}ms courses=${courseRequests}`,
    );
    expect(screen.getByRole("button", { name: /Play Next!/ })).toBeEnabled();
    expect(elapsed).toBeLessThanOrEqual(350);
    expect(courseRequests).toBe(1);
  });

  it("keeps Play Next available when a benchmark fails", async () => {
    vi.mocked(api.getStudentBenchmarks).mockRejectedValue(
      new Error("benchmark down"),
    );
    authApi.get.mockImplementation((url: string) =>
      url.endsWith("benchmarks")
        ? Promise.reject(new Error("benchmark down"))
        : delay(100, courses),
    );
    render(tree());
    for (let i = 0; i < 8; i++) await advance(50);
    expect(screen.getByRole("button", { name: /Play Next!/ })).toBeEnabled();
  });

  it("bounds a stalled required request and lets the student retry", async () => {
    vi.mocked(api.getModules).mockImplementationOnce(
      () => new Promise(() => {}),
    );
    const view = render(tree());
    await advance(100);
    await advance(10100);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Dashboard unavailable",
    );
    const signal = vi.mocked(api.getModules).mock.calls[0][0]?.signal;
    expect(signal?.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    for (let i = 0; i < 6; i++) await advance(50);
    expect(screen.getByRole("button", { name: /Play Next!/ })).toBeEnabled();
    view.unmount();
  });

  it("cancels old-session requests and cannot display a late old benchmark", async () => {
    let finishOld!: (value: any[]) => void;
    vi.mocked(api.getStudentBenchmarks).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    const view = render(tree());
    for (let i = 0; i < 8; i++) await advance(50);
    const signal = vi.mocked(api.getStudentBenchmarks).mock.calls[0][1]?.signal;
    auth.user = { id: "student-b", name: "Bea" };
    localStorage.setItem("user", JSON.stringify(auth.user));
    localStorage.setItem("bb_access_token", "token-b");
    vi.mocked(api.getStudentCourses).mockResolvedValue([]);
    view.rerender(tree());
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      finishOld([
        {
          id: "old-benchmark",
          kind: "PRE",
          template: { title: "Ada's benchmark" },
        },
      ]);
    });
    for (let i = 0; i < 8; i++) await advance(50);
    expect(screen.queryByText("Ada's benchmark")).not.toBeInTheDocument();
    expect(screen.queryByText("Ada's class")).not.toBeInTheDocument();
    expect(api.getStudentCourses).toHaveBeenCalledTimes(2);
    view.unmount();
  });
});
