import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ClassModulePlanner from "../ClassModulePlanner";
import ClassModules from "@/components/StudentDashboard/ClassModules";
import { api } from "@/services/api";
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
vi.mock("@/services/api", () => ({
  api: {
    getModuleVariants: vi.fn(),
    getCourseAssignments: vi.fn(),
    assignModuleToClass: vi.fn(),
    moveModuleAssignment: vi.fn(),
    removeModuleAssignment: vi.fn(),
    getStudentAssignedModules: vi.fn(),
  },
}));
it("assigns, reorders and removes the selected class’s playable modules", async () => {
  const user = userEvent.setup();
  const a = { id: "a", title: "First", moduleSlug: "first" },
    b = { id: "b", title: "Second", moduleSlug: "second" };
  let rows = [a];
  vi.mocked(api.getModuleVariants).mockResolvedValue([
    a,
    b,
    { id: "no", title: "Design only", moduleSlug: null },
  ]);
  vi.mocked(api.getCourseAssignments).mockImplementation(async () => ({
    assignments: rows.map((v) => ({ id: "assign-" + v.id, moduleVariant: v })),
  }));
  vi.mocked(api.assignModuleToClass).mockImplementation(async () => {
    rows = [a, b];
  });
  vi.mocked(api.moveModuleAssignment).mockImplementation(async () => {
    rows = [b, a];
  });
  vi.mocked(api.removeModuleAssignment).mockImplementation(async () => {
    rows = [b];
  });
  render(<ClassModulePlanner courseId="c1" band="g3_5" />);
  await user.click(
    screen.getByRole("button", { name: "Assign class modules" }),
  );
  expect(await screen.findByText("First")).toBeVisible();
  expect(screen.queryByText(/Design only/)).toBeNull();
  await user.click(screen.getByText("Assign Second"));
  await user.click(await screen.findByText("Move Second up"));
  await waitFor(() =>
    expect(
      within(screen.getAllByRole("list")[0]).getAllByRole("listitem")[0],
    ).toHaveTextContent("Second"),
  );
  await user.click(screen.getByText("Remove First"));
  await screen.findByText("Assign First");
  expect(api.assignModuleToClass).toHaveBeenCalledWith("c1", "b");
  expect(api.moveModuleAssignment).toHaveBeenCalledWith("c1", "assign-b", "up");
  expect(api.removeModuleAssignment).toHaveBeenCalledWith("c1", "assign-a");
});
it("distinguishes a failed learner request from an empty list and links only to allowed modules", async () => {
  vi.mocked(api.getStudentAssignedModules)
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce([
      {
        classId: "c1",
        className: "Room 3",
        modules: [
          { assignmentId: "b", moduleSlug: "second", title: "Second" },
          { assignmentId: "a", moduleSlug: "locked", title: "Later" },
        ],
      },
    ]);
  render(
    <MemoryRouter>
      <ClassModules allowed={new Set(["second"])} />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.queryByText("No modules assigned yet.")).toBeNull();
  await userEvent.click(screen.getByText("Try again"));
  expect(await screen.findByRole("link", { name: "Second" })).toHaveAttribute(
    "href",
    "/student/modules/second",
  );
  expect(screen.getByText(/Later.*Not available/)).toBeVisible();
  expect(screen.getAllByRole("link")).toHaveLength(1);
});
