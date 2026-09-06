import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialtyProvider, useSpecialty } from "../SpecialtyContext";
import { SPECIALTY_UPDATED, type SpecialtyStatus } from "@/lib/specialty";
const mocks = vi.hoisted(() => ({
  userId: "a",
  getSpecialtyStatus: vi.fn(),
  selectArchetype: vi.fn(),
}));
vi.mock("../AuthContext", () => ({
  useAuth: () => ({ user: { id: mocks.userId } }),
}));
vi.mock("@/services/api", () => ({ api: mocks }));
const complete: SpecialtyStatus = {
  unlocked: true,
  completed: 5,
  required: 5,
  specialty: null,
};
function Probe() {
  const { status, data, choose } = useSpecialty();
  return (
    <>
      <output>
        {status}:{data?.specialty ?? "none"}:{data?.completed ?? "unknown"}
      </output>
      <button onClick={() => void choose("BIOTECH")}>Choose</button>
    </>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId = "a";
  mocks.selectArchetype.mockResolvedValue({});
});
describe("Saved specialty state", () => {
  it("refreshes after completion and rehydrates a confirmed choice on remount", async () => {
    mocks.getSpecialtyStatus.mockResolvedValueOnce({
      ...complete,
      unlocked: false,
      completed: 4,
    });
    const first = render(
      <SpecialtyProvider>
        <Probe />
      </SpecialtyProvider>,
    );
    await screen.findByText("ready:none:4");
    mocks.getSpecialtyStatus.mockResolvedValueOnce(complete);
    act(() => window.dispatchEvent(new Event(SPECIALTY_UPDATED)));
    await screen.findByText("ready:none:5");
    mocks.getSpecialtyStatus.mockResolvedValue({
      ...complete,
      specialty: "BIOTECH",
    });
    fireEvent.click(screen.getByRole("button", { name: "Choose" }));
    await screen.findByText("ready:BIOTECH:5");
    expect(mocks.selectArchetype).toHaveBeenCalledWith("BIOTECH");
    first.unmount();
    render(
      <SpecialtyProvider>
        <Probe />
      </SpecialtyProvider>,
    );
    await screen.findByText("ready:BIOTECH:5");
  });
  it("ignores a late response from the previous student", async () => {
    let resolveOld!: (value: SpecialtyStatus) => void;
    mocks.getSpecialtyStatus.mockReturnValueOnce(
      new Promise<SpecialtyStatus>((resolve) => {
        resolveOld = resolve;
      }),
    );
    const view = render(
      <SpecialtyProvider>
        <Probe />
      </SpecialtyProvider>,
    );
    mocks.userId = "b";
    mocks.getSpecialtyStatus.mockResolvedValueOnce({
      ...complete,
      unlocked: false,
      completed: 1,
    });
    view.rerender(
      <SpecialtyProvider>
        <Probe />
      </SpecialtyProvider>,
    );
    await screen.findByText("ready:none:1");
    await act(async () => resolveOld({ ...complete, specialty: "BIOTECH" }));
    await waitFor(() =>
      expect(screen.getByText("ready:none:1")).toBeInTheDocument(),
    );
    expect(screen.queryByText("ready:BIOTECH:5")).not.toBeInTheDocument();
  });
});
