import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import JoinClass from "../JoinClass";
import ModuleDetail from "../ModuleDetail";
import { useGradeBandState, __resetGradeBandCache } from "@/hooks/useGradeBand";
import { api } from "@/services/api";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/services/api", async (original) => {
  const actual = await original<typeof import("@/services/api")>();
  return {
    ApiError: actual.ApiError,
    useApi: () => ({ post }),
    api: {
      getStudentCourses: vi.fn(),
      getModule: vi.fn(),
      getProgress: vi.fn(),
      getAvatar: vi.fn(),
      getStudentAssignments: vi.fn(),
    },
  };
});
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
vi.mock("@/components/student/PulseSurveyDialog", () => ({
  default: ({ onSubmitted }: { onSubmitted: () => void }) => (
    <button onClick={onSubmitted}>Finish survey</button>
  ),
}));
const COURSE = {
  courseId: "new-class",
  courseName: "New Class",
  gradeBand: "g3_5",
};
function Dashboard() {
  const state = useGradeBandState();
  return (
    <>
      <output>
        {state.status}:{state.band}
      </output>
      <Link to="/student/join">Join another class</Link>
      <Link to="/student/modules/g35-test">Open grade 3–5 module</Link>
    </>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  __resetGradeBandCache();
  localStorage.setItem("user", JSON.stringify({ id: "learner" }));
  vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  post.mockResolvedValue(COURSE);
  vi.mocked(api.getProgress).mockResolvedValue({ progress: [] });
  vi.mocked(api.getAvatar).mockResolvedValue(null);
  vi.mocked(api.getStudentAssignments).mockResolvedValue([]);
  vi.mocked(api.getModule).mockResolvedValue({
    id: "module",
    slug: "g35-test",
    title: "Upper elementary",
    level: "G3-5",
    published: true,
    units: [
      {
        id: "unit",
        title: "Unit",
        lessons: [
          {
            id: "lesson",
            title: "Grade 3–5 lesson",
            activities: [
              { id: "activity", title: "Grade 3–5 activity", kind: "INFO" },
            ],
          },
        ],
      },
    ],
  });
});
afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("#898 — enrollment and course freshness", () => {
  it("refreshes after joining, then opens grade-appropriate content without a reload", async () => {
    render(
      <MemoryRouter initialEntries={["/student/dashboard"]}>
        <Routes>
          <Route path="/student/dashboard" element={<Dashboard />} />
          <Route path="/student/join" element={<JoinClass />} />
          <Route path="/student/modules/:slug" element={<ModuleDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("resolved:k2");
    fireEvent.click(screen.getByText("Join another class"));
    vi.mocked(api.getStudentCourses).mockResolvedValue([COURSE]);
    fireEvent.change(screen.getByLabelText("Join Code"), {
      target: { value: "NEW123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Join Class" }).closest("form")!,
    );
    fireEvent.click(await screen.findByText("Finish survey"));
    await screen.findByText("resolved:g3_5");
    expect(api.getStudentCourses).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByText("Open grade 3–5 module"));
    expect(await screen.findByText("Grade 3–5 activity")).toBeInTheDocument();
    expect(screen.queryByTestId("module-unavailable")).toBeNull();
  });

  it("refreshes a mounted view when the teacher changes the band; failures remain explicit", async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText("resolved:k2")).toBeInTheDocument();
    vi.mocked(api.getStudentCourses).mockResolvedValue([COURSE]);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByText("resolved:g3_5")).toBeInTheDocument();
    vi.mocked(api.getStudentCourses).mockRejectedValue(new Error("offline"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByText("failed:k2")).toBeInTheDocument();
  });

  it("keeps a healthy cached membership after a rejected join", async () => {
    const view = render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await screen.findByText("resolved:k2");
    view.unmount();
    post.mockRejectedValue(new Error("Invalid class"));
    const join = render(
      <MemoryRouter>
        <JoinClass />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Join Code"), {
      target: { value: "BAD123" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Join Class" }).closest("form")!,
    );
    await screen.findByText("Invalid class");
    join.unmount();
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByText("resolved:k2")).toBeInTheDocument(),
    );
    expect(api.getStudentCourses).toHaveBeenCalledTimes(1);
  });
});
