import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const reads = [
  ["courses", (signal: AbortSignal) => api.getStudentCourses({ signal })],
  [
    "assignments",
    (signal: AbortSignal) => api.getStudentAssignments({ signal }),
  ],
  [
    "benchmarks",
    (signal: AbortSignal) => api.getStudentBenchmarks("course", { signal }),
  ],
  ["modules", (signal: AbortSignal) => api.getModules({ signal })],
  [
    "progress",
    (signal: AbortSignal) => api.getProgress({ signal, excludeUser: true }),
  ],
  ["avatar", (signal: AbortSignal) => api.getAvatar({ signal })],
] as const;

describe("dashboard transport (#907)", () => {
  it.each(reads)(
    "%s forwards cancellation and does not disguise an HTTP failure as empty data",
    async (_, read) => {
      const controller = new AbortController();
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ error: "unavailable" }), { status: 503 }),
      );
      await expect(read(controller.signal)).rejects.toMatchObject({
        status: 503,
      });
      expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
    },
  );

  it("does not reuse another caller's cached structure for a cancellable dashboard request", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ slug: "transport-fixture", title: "Cached" }),
      ),
    );
    await api.getModule("transport-fixture", { structureOnly: true });
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ slug: "transport-fixture", title: "Fresh" }),
      ),
    );
    await expect(
      api.getModule("transport-fixture", {
        structureOnly: true,
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ title: "Fresh" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].signal).toBe(controller.signal);
  });
});
