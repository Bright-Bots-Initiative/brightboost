import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
const requests = [
  ["band change", () => api.updateCourseBand("c1", "g3_5")],
  ["assignment list", () => api.getCourseAssignments("c1")],
  ["assignment creation", () => api.assignModuleToClass("c1", "v1")],
  ["assignment deletion", () => api.removeModuleAssignment("c1", "a1")],
] as const;
describe("teacher course request boundaries (#903)", () => {
  it.each(requests)("%s rejects a JSON error response", async (_, request) => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "refused" }, { status: 403 }),
    );
    await expect(request()).rejects.toMatchObject({ status: 403 });
  });
  it("retains the HTTP status even when an error body is HTML", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>Unavailable</html>", { status: 503 }),
    );
    await expect(api.updateCourseBand("c1", "g3_5")).rejects.toMatchObject({
      status: 503,
    });
  });
  it.each([
    { error: "not saved" },
    { id: "other", gradeBand: "g3_5" },
    { id: "c1", gradeBand: "unknown" },
  ])("refuses a malformed success payload: %j", async (body) => {
    fetchMock.mockResolvedValue(Response.json(body));
    await expect(api.updateCourseBand("c1", "g3_5")).rejects.toThrow();
  });
  it("preserves successful assignment responses", async () => {
    for (const [_, request] of requests.slice(1)) {
      const body = { id: "a1", deleted: true };
      fetchMock.mockResolvedValueOnce(Response.json(body));
      await expect(request()).resolves.toEqual(body);
    }
  });
});
