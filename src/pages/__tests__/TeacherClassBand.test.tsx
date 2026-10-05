import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import TeacherClassDetail from "@/pages/TeacherClassDetail";

const authApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));
vi.mock("@/services/api", async (original) => ({
  ...(await original<typeof import("@/services/api")>()),
  useApi: () => authApi,
}));
vi.mock("react-i18next", async () =>
  (await import("@/test/i18nMock")).enMock(),
);
const fetchMock = vi.fn();
let storedBand = "k2";
function mount() {
  return render(
    <MemoryRouter initialEntries={["/teacher/classes/c1"]}>
      <Link to="/teacher/classes/c2">Other class</Link>
      <Routes>
        <Route path="/teacher/classes/:id" element={<TeacherClassDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}
async function selectBand() {
  const select = await screen.findByRole("combobox");
  fireEvent.change(select, { target: { value: "g3_5" } });
  return select;
}
beforeEach(() => {
  vi.clearAllMocks();
  storedBand = "k2";
  vi.stubGlobal("fetch", fetchMock);
  authApi.get.mockImplementation(async (url: string) => {
    if (/^\/teacher\/courses\/c[12]$/.test(url))
      return {
        id: url.endsWith("c1") ? "c1" : "c2",
        name: url.endsWith("c1") ? "Room 3" : "Room 4",
        gradeBand: url.endsWith("c1") ? storedBand : "k2",
        joinCode: "ABC123",
        enrollmentCount: 0,
        students: [],
        createdAt: "2026-01-01",
      };
    if (/summary|growth|attention/.test(url)) return null;
    return [];
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("confirmed grade-band changes (#903)", () => {
  it("saves the server-confirmed band and keeps it after remount", async () => {
    fetchMock.mockImplementation(async () => {
      storedBand = "g3_5";
      return Response.json({ id: "c1", gradeBand: storedBand });
    });
    const view = mount();
    const select = await selectBand();
    await waitFor(() => expect(select).toHaveValue("g3_5"));
    view.unmount();
    mount();
    expect(await screen.findByRole("combobox")).toHaveValue("g3_5");
  });
  it.each([401, 403, 500, "network"])(
    "preserves the confirmed band and offers retry after %s",
    async (status) => {
      if (status === "network")
        fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      else
        fetchMock.mockResolvedValueOnce(
          Response.json({ error: "refused" }, { status: Number(status) }),
        );
      fetchMock.mockResolvedValueOnce(
        Response.json({ id: "c1", gradeBand: "g3_5" }),
      );
      mount();
      const select = await selectBand();
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Couldn't confirm",
      );
      expect(select).toHaveValue("k2");
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(select).toHaveValue("g3_5"));
    },
  );
  it("serializes repeated input and uses the response band, not the requested band", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount();
    const select = await selectBand();
    expect(select).toBeDisabled();
    fireEvent.change(select, { target: { value: "k2" } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolve(Response.json({ id: "c1", gradeBand: "k2" })),
    );
    expect(select).toHaveValue("k2");
    expect(select).toBeEnabled();
  });
  it("ignores a late save response after navigating to another class", async () => {
    let resolve!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount();
    await selectBand();
    fireEvent.click(screen.getByText("Other class"));
    await screen.findByText("Room 4");
    await act(async () =>
      resolve(Response.json({ id: "c1", gradeBand: "g3_5" })),
    );
    expect(screen.getByRole("combobox")).toHaveValue("k2");
  });
});
