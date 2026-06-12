import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGradeBand, __resetGradeBandCache } from "@/hooks/useGradeBand";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: { getStudentCourses: vi.fn() },
}));

describe("useGradeBand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetGradeBandCache();
  });

  it("resolves g3_5 when any enrolled course is g3_5", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "jordan-g35" }));
    (api.getStudentCourses as ReturnType<typeof vi.fn>).mockResolvedValue([
      { gradeBand: "k2" },
      { gradeBand: "g3_5" },
    ]);
    const { result } = renderHook(() => useGradeBand());
    expect(result.current).toBe("k2"); // default until the fetch resolves
    await waitFor(() => expect(result.current).toBe("g3_5"));
  });

  it("does not leak the previous student's band after a user switch", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "jordan-g35" }));
    (api.getStudentCourses as ReturnType<typeof vi.fn>).mockResolvedValue([
      { gradeBand: "g3_5" },
    ]);
    const first = renderHook(() => useGradeBand());
    await waitFor(() => expect(first.result.current).toBe("g3_5"));
    first.unmount();

    // A different student logs in on the same tab (no page reload)
    localStorage.setItem("user", JSON.stringify({ id: "student-k2" }));
    (api.getStudentCourses as ReturnType<typeof vi.fn>).mockResolvedValue([
      { gradeBand: "k2" },
    ]);
    const second = renderHook(() => useGradeBand());
    // Must NOT serve the cached g3_5 from the previous student
    expect(second.result.current).toBe("k2");
    await waitFor(() => expect(api.getStudentCourses).toHaveBeenCalledTimes(2));
    expect(second.result.current).toBe("k2");
  });

  it("falls back to k2 when the courses API fails", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "x" }));
    (api.getStudentCourses as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("down"),
    );
    const { result } = renderHook(() => useGradeBand());
    await waitFor(() => expect(api.getStudentCourses).toHaveBeenCalled());
    expect(result.current).toBe("k2");
  });
});
