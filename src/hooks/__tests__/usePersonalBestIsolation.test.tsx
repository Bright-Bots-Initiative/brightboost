import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/services/api";
import {
  usePersonalBest,
  updatePersonalBestCache,
  __resetPersonalBestCache,
} from "../usePersonalBest";

vi.mock("@/services/api", () => ({ api: { getGamePersonalBests: vi.fn() } }));
const GAME = "tank_trek";
const best = (score: number) => ({
  gameKey: GAME,
  bestScore: score,
  bestStreak: 2,
  playCount: 1,
});
function signIn(id: string) {
  localStorage.setItem("user", JSON.stringify({ id }));
  localStorage.setItem("bb_access_token", `token-${id}`);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  __resetPersonalBestCache();
});

describe("personal-best identity boundary (#902)", () => {
  it("keeps same-user replay results in the cache", async () => {
    signIn("a");
    vi.mocked(api.getGamePersonalBests).mockResolvedValue([best(10)]);
    const first = renderHook(() => usePersonalBest(GAME));
    await waitFor(() => expect(first.result.current?.bestScore).toBe(10));
    updatePersonalBestCache(GAME, best(20));
    first.unmount();
    const next = renderHook(() => usePersonalBest(GAME));
    expect(next.result.current?.bestScore).toBe(20);
    expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1);
  });

  it("clears visible records on a mounted account switch, without resetting the cache", async () => {
    signIn("a");
    vi.mocked(api.getGamePersonalBests).mockResolvedValue([best(95)]);
    const hook = renderHook(() => usePersonalBest(GAME));
    await waitFor(() => expect(hook.result.current?.bestScore).toBe(95));
    const b = deferred<ReturnType<typeof best>[]>();
    vi.mocked(api.getGamePersonalBests).mockReturnValue(b.promise);
    signIn("b");
    hook.rerender();
    expect(hook.result.current).toBeNull();
    await act(async () => b.resolve([best(12)]));
    await waitFor(() => expect(hook.result.current?.bestScore).toBe(12));
    expect(api.getGamePersonalBests).toHaveBeenCalledTimes(2);
  });

  it("never returns an authenticated record to a logged-out demo visitor", async () => {
    signIn("a");
    vi.mocked(api.getGamePersonalBests).mockResolvedValue([best(95)]);
    const hook = renderHook(() => usePersonalBest(GAME));
    await waitFor(() => expect(hook.result.current?.bestScore).toBe(95));
    localStorage.clear();
    hook.rerender();
    expect(hook.result.current).toBeNull();
    hook.unmount();
    expect(renderHook(() => usePersonalBest(GAME)).result.current).toBeNull();
    expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1);
  });

  it("rejects a delayed response for A after B has signed in", async () => {
    signIn("a");
    const a = deferred<ReturnType<typeof best>[]>();
    vi.mocked(api.getGamePersonalBests)
      .mockReturnValueOnce(a.promise)
      .mockResolvedValue([best(12)]);
    const hook = renderHook(() => usePersonalBest(GAME));
    await waitFor(() =>
      expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1),
    );
    signIn("b");
    hook.rerender();
    await act(async () => a.resolve([best(95)]));
    await waitFor(() => expect(hook.result.current?.bestScore).toBe(12));
    hook.unmount();
    expect(
      renderHook(() => usePersonalBest(GAME)).result.current?.bestScore,
    ).toBe(12);
  });

  it("does not let an older GET overwrite a newly persisted completion", async () => {
    signIn("a");
    const old = deferred<ReturnType<typeof best>[]>();
    vi.mocked(api.getGamePersonalBests).mockReturnValue(old.promise);
    const hook = renderHook(() => usePersonalBest(GAME));
    updatePersonalBestCache(GAME, best(30));
    await act(async () => old.resolve([best(10)]));
    await waitFor(() => expect(hook.result.current?.bestScore).toBe(30));
  });
});
