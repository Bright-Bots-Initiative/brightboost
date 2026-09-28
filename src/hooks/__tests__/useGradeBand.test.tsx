import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGradeBand,
  useGradeBandState,
  __resetGradeBandCache,
} from "@/hooks/useGradeBand";
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

  // #866: a synchronous throw used to escape the effect and unmount the tree
  // instead of settling to `failed` like an async rejection does.
  describe("when the courses call throws synchronously", () => {
    const throwSync = () => {
      throw new Error("sync");
    };

    it("settles to failed with the k2 fallback instead of throwing", async () => {
      localStorage.setItem("user", JSON.stringify({ id: "x" }));
      (api.getStudentCourses as ReturnType<typeof vi.fn>).mockImplementation(
        throwSync,
      );
      const { result } = renderHook(() => useGradeBandState());
      await waitFor(() => expect(result.current.status).toBe("failed"));
      expect(result.current.band).toBe("k2");
    });

    it("keeps useGradeBand on k2", async () => {
      localStorage.setItem("user", JSON.stringify({ id: "x" }));
      (api.getStudentCourses as ReturnType<typeof vi.fn>).mockImplementation(
        throwSync,
      );
      const { result } = renderHook(() => ({
        band: useGradeBand(),
        state: useGradeBandState(),
      }));
      await waitFor(() => expect(result.current.state.status).toBe("failed"));
      expect(result.current.band).toBe("k2");
    });

    it("settles to failed when getStudentCourses is missing from the api", async () => {
      localStorage.setItem("user", JSON.stringify({ id: "x" }));
      const original = api.getStudentCourses;
      Reflect.deleteProperty(api, "getStudentCourses");
      try {
        const { result } = renderHook(() => useGradeBandState());
        await waitFor(() => expect(result.current.status).toBe("failed"));
        expect(result.current.band).toBe("k2");
      } finally {
        api.getStudentCourses = original;
      }
    });

    it("shares one request between consumers mounted in the same commit", async () => {
      localStorage.setItem("user", JSON.stringify({ id: "x" }));
      (api.getStudentCourses as ReturnType<typeof vi.fn>).mockImplementation(
        throwSync,
      );
      const { result } = renderHook(() => [
        useGradeBandState(),
        useGradeBandState(),
      ]);
      await waitFor(() => {
        expect(result.current[0].status).toBe("failed");
        expect(result.current[1].status).toBe("failed");
      });
      expect(api.getStudentCourses).toHaveBeenCalledTimes(1);
    });

    it("re-requests on a reloadKey bump and resolves once the call succeeds", async () => {
      localStorage.setItem("user", JSON.stringify({ id: "x" }));
      (api.getStudentCourses as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(throwSync)
        .mockResolvedValue([{ gradeBand: "g3_5" }]);
      const { result, rerender } = renderHook(
        ({ reloadKey }) => useGradeBandState(reloadKey),
        { initialProps: { reloadKey: 0 } },
      );
      await waitFor(() => expect(result.current.status).toBe("failed"));

      rerender({ reloadKey: 1 });
      await waitFor(() => expect(result.current.status).toBe("resolved"));
      expect(result.current.band).toBe("g3_5");
      expect(api.getStudentCourses).toHaveBeenCalledTimes(2);
    });
  });
});
