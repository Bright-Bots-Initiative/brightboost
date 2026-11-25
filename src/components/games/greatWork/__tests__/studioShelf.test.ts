import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  starterStudioDraft,
  verifyStudioDraft,
  type StudioDraft,
} from "@shared/greatwork-engine";
import { createStudioShelf } from "../studioShelf";

const draft = () => starterStudioDraft("en");

function signIn(id: string) {
  localStorage.setItem("user", JSON.stringify({ id }));
  localStorage.setItem("bb_access_token", "synthetic-" + id);
}

const course = "example course";
const scope = { mode: "student" as const, studentId: "a", courseId: course };
const guest = () => createStudioShelf({ mode: "guest" });

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("My Shelf", () => {
  it("reopens a working design and an unfinished copy from the guest shelf without requesting a student account", async () => {
    signIn("a");
    const network = vi.fn();
    vi.stubGlobal("fetch", network);
    const design = draft();
    const original = await guest().create(design);
    const changed: StudioDraft = {
      ...design,
      program: { parts: [], tapes: [] },
      iterations: 2,
    };
    const copy = await guest().duplicate(original, changed);
    const saved = await guest().list();
    expect(saved).toHaveLength(2);
    expect(copy.id).not.toBe(original.id);
    const reopened = saved.find((row) => row.id === original.id)!;
    expect(reopened.content).toEqual(design);
    expect(verifyStudioDraft(reopened.content)).toEqual(
      verifyStudioDraft(design),
    );
    expect(reopened.lastRun.produced[0].count).toBeGreaterThan(0);
    expect(copy.lastRun.produced).toEqual([]);
    expect(network).not.toHaveBeenCalled();
  });

  it("keeps the newer revision when another tab tries to revise an outdated draft", async () => {
    const left = guest();
    const right = guest();
    const first = await left.create(draft());
    const edited = await right.revise(first, {
      ...first.content,
      iterations: 2,
    });
    await expect(left.revise(first, first.content)).rejects.toMatchObject({
      status: 409,
    });
    expect(await left.list()).toEqual([edited]);
  });

  it("does not report a save when this browser cannot store it", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("storage full", "QuotaExceededError");
    });
    await expect(guest().create(draft())).rejects.toThrow("storage full");
    expect(await guest().list()).toEqual([]);
  });

  it("retries an uncertain server create with the same ID and never writes signed-in work to the guest shelf", async () => {
    signIn("a");
    const shelf = createStudioShelf(scope);
    const machine = draft();
    const network = vi.fn().mockRejectedValueOnce(new TypeError("offline"));
    network.mockImplementation(async (url: string, options: RequestInit) => {
      const id = url.slice(url.lastIndexOf("/") + 1);
      expect((options.headers as Record<string, string>).Authorization).toBe(
        "Bearer synthetic-a",
      );
      expect(JSON.parse(options.body as string)).toEqual({
        courseId: course,
        content: machine,
        expectedRevision: null,
      });
      return new Response(
        JSON.stringify({
          id,
          courseId: course,
          revision: 1,
          updatedAt: new Date().toISOString(),
          content: machine,
          lastRun: verifyStudioDraft(machine),
        }),
      );
    });
    vi.stubGlobal("fetch", network);
    await expect(shelf.create(machine)).rejects.toThrow("offline");
    const created = await shelf.create(machine);
    expect(network.mock.calls[0][0]).toBe(network.mock.calls[1][0]);
    expect(created.content).toEqual(machine);
    expect(await guest().list()).toEqual([]);
  });

  it("rejects a server row from another course and leaves the public shelf empty", async () => {
    signIn("a");
    const machine = draft();
    const row = {
      id: crypto.randomUUID(),
      courseId: "different-course",
      revision: 1,
      updatedAt: new Date().toISOString(),
      content: machine,
      lastRun: verifyStudioDraft(machine),
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ machines: [row] }))),
    );
    await expect(createStudioShelf(scope).list()).rejects.toThrow(
      "invalid_saved_machine",
    );
    expect(await guest().list()).toEqual([]);
  });

  it("discards late student responses across account changes; a stale shelf cannot make a new request", async () => {
    signIn("a");
    const shelf = createStudioShelf(scope);
    let deliver!: (response: Response) => void;
    const network = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          deliver = resolve;
        }),
    );
    vi.stubGlobal("fetch", network);
    const loaded = shelf.list();
    await vi.waitFor(() => expect(network).toHaveBeenCalledTimes(1));
    expect(network.mock.calls[0][0]).toContain("courseId=example%20course");
    signIn("b");
    deliver(new Response(JSON.stringify({ machines: [] })));
    await expect(loaded).rejects.toMatchObject({ status: 401 });
    await expect(shelf.create(draft())).rejects.toMatchObject({ status: 401 });
    expect(network).toHaveBeenCalledTimes(1);
  });
});
