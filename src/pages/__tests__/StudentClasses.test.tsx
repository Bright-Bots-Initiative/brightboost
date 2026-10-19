import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentClasses from "../StudentClasses";
import JoinClass from "../JoinClass";
import BottomNav from "@/components/BottomNav";
import { api } from "@/services/api";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  auth: { user: { id: "child-a" }, token: "token-a" },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/services/api", () => ({
  api: { getStudentCourses: vi.fn() },
  useApi: () => ({ post: mocks.post }),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
vi.mock("@/components/student/PulseSurveyDialog", () => ({
  default: ({ onSubmitted }: { onSubmitted: () => void }) => (
    <button onClick={onSubmitted}>Finish survey</button>
  ),
}));

const first = { courseId: "one", courseName: "Science explorers" };
const second = { courseId: "two", courseName: "Robot builders" };
function mount() {
  return render(
    <MemoryRouter initialEntries={["/student/modules"]}>
      <BottomNav />
      <Routes>
        <Route path="/student/modules" element={<p>Learning</p>} />
        <Route path="/student/classes" element={<StudentClasses />} />
        <Route path="/student/join" element={<JoinClass />} />
      </Routes>
    </MemoryRouter>,
  );
}
function openClasses() {
  fireEvent.click(screen.getByTestId("nav-classes"));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth = { user: { id: "child-a" }, token: "token-a" };
  vi.mocked(api.getStudentCourses).mockResolvedValue([]);
  mocks.post.mockResolvedValue(second);
});

describe("#744 — student class memberships", () => {
  it("navigates from Classes to an honest empty state and the join form", async () => {
    mount();
    openClasses();
    expect(
      await screen.findByText("You haven’t joined a class yet."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("nav-classes")).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("link", { name: "Join a class" }));
    expect(screen.getByLabelText("Join Code")).toBeInTheDocument();
    expect(screen.getByTestId("nav-classes")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
  it.each([[first], [first, second]])(
    "shows all current memberships: %j",
    async (...courses) => {
      vi.mocked(api.getStudentCourses).mockResolvedValue(courses);
      mount();
      openClasses();
      for (const course of courses)
        expect(
          await screen.findByRole("heading", { name: course.courseName }),
        ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Join another class" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("You haven’t joined a class yet.")).toBeNull();
    },
  );
  it("does not mistake loading or a failed response for zero memberships, and retries", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(api.getStudentCourses).mockReturnValueOnce(
      new Promise((_resolve, no) => {
        reject = no;
      }),
    );
    mount();
    openClasses();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your classes",
    );
    expect(screen.queryByText("You haven’t joined a class yet.")).toBeNull();
    await act(async () => reject(new Error("offline")));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn’t load your classes",
    );
    expect(screen.queryByText("You haven’t joined a class yet.")).toBeNull();
    vi.mocked(api.getStudentCourses).mockResolvedValue([first]);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(first.courseName)).toBeInTheDocument();
  });
  it("treats a malformed response as a failure", async () => {
    vi.mocked(api.getStudentCourses).mockResolvedValue({ error: "not a list" });
    mount();
    openClasses();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t load your classes",
    );
  });
  it("returns after the existing join survey and shows the newly joined class without reloading", async () => {
    vi.mocked(api.getStudentCourses)
      .mockResolvedValueOnce([first])
      .mockResolvedValue([first, second]);
    mount();
    openClasses();
    fireEvent.click(
      await screen.findByRole("link", { name: "Join another class" }),
    );
    fireEvent.change(screen.getByLabelText("Join Code"), {
      target: { value: "new123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Class" }));
    fireEvent.click(await screen.findByText("Finish survey"));
    expect(
      await screen.findByRole("heading", { name: second.courseName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: first.courseName }),
    ).toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith("/student/join-course", {
      joinCode: "NEW123",
    });
    expect(api.getStudentCourses).toHaveBeenCalledTimes(2);
  });
  it("does not leak old memberships or late responses when the account changes", async () => {
    let resolve!: (courses: unknown) => void;
    vi.mocked(api.getStudentCourses)
      .mockReturnValueOnce(
        new Promise((yes) => {
          resolve = yes;
        }),
      )
      .mockResolvedValue([second]);
    const tree = () => (
      <MemoryRouter>
        <StudentClasses />
      </MemoryRouter>
    );
    const view = render(tree());
    mocks.auth = { user: { id: "child-b" }, token: "token-b" };
    view.rerender(tree());
    expect(await screen.findByText(second.courseName)).toBeInTheDocument();
    await act(async () => resolve([first]));
    expect(screen.queryByText(first.courseName)).toBeNull();
    expect(api.getStudentCourses).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        signal: expect.objectContaining({ aborted: true }),
      }),
    );
  });
});
