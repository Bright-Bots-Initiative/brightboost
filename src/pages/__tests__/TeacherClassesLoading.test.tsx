import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TeacherClasses from "@/pages/TeacherClasses";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/services/api", async (original) => ({
  ...(await original<typeof import("@/services/api")>()),
  useApi: () => api,
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
const course = (kind = "class") => ({
  id: "c1",
  name: kind === "home" ? "Our home group" : "Room 3",
  kind,
  joinCode: "ABC123",
  enrollmentCount: 2,
  createdAt: "2026-01-01",
});
function mount() {
  return render(
    <MemoryRouter>
      <TeacherClasses />
    </MemoryRouter>,
  );
}
beforeEach(() => vi.resetAllMocks());

describe("truthful class-list loading (#899)", () => {
  it("shows the create-first state only after a successful empty response", async () => {
    api.get.mockResolvedValue([]);
    mount();
    expect(await screen.findByText("No classes yet")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it.each([new Error("offline"), { error: "bad response" }])(
    "shows an initial error and recovers on retry (%j)",
    async (failure) => {
      if (failure instanceof Error) api.get.mockRejectedValueOnce(failure);
      else api.get.mockResolvedValueOnce(failure);
      api.get.mockResolvedValueOnce([course()]);
      mount();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Couldn't load",
      );
      expect(screen.queryByText("No classes yet")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("Room 3")).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );
  it.each(["class", "home"])(
    "retains confirmed %s rows during refresh and after failure",
    async (kind) => {
      let rejectRefresh!: (error: Error) => void;
      api.get
        .mockResolvedValueOnce([course(kind)])
        .mockImplementationOnce(
          () =>
            new Promise((_resolve, reject) => {
              rejectRefresh = reject;
            }),
        )
        .mockResolvedValueOnce([course(kind)]);
      mount();
      const name = course(kind).name;
      expect(await screen.findByText(name)).toBeVisible();
      fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
      expect(screen.getByText(name)).toBeVisible();
      await act(async () => rejectRefresh(new Error("temporary outage")));
      expect(screen.getByRole("alert")).toHaveTextContent("Couldn't refresh");
      expect(screen.getByText(name)).toBeVisible();
      expect(screen.queryByText("No classes yet")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() =>
        expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
      );
      expect(screen.getByText(name)).toBeVisible();
    },
  );
});
