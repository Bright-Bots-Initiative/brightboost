import { StrictMode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../AuthContext";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});
vi.mock("@/lib/analytics", () => ({
  identifyUser: vi.fn(),
  resetAnalytics: vi.fn(),
  track: vi.fn(),
}));
const first = { id: "child-a", name: "Child A", role: "student" };
const second = { id: "child-b", name: "Child B", role: "student" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function Probe() {
  const auth = useAuth();
  return (
    <>
      <output data-testid="session">
        {JSON.stringify({
          user: auth.user,
          token: auth.token,
          loading: auth.isLoading,
          authenticated: auth.isAuthenticated,
        })}
      </output>
      <button onClick={() => auth.login("token-b", second)}>Sign in B</button>
      <button onClick={() => auth.login("token-a", second)}>
        Replace same token
      </button>
      <button onClick={auth.logout}>Sign out</button>
    </>
  );
}
function mount(strict = false) {
  const tree = (
    <MemoryRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}
function expectSession(
  user: NonNullable<ReturnType<typeof useAuth>["user"]> = first,
  token = "token-a",
) {
  expect(JSON.parse(screen.getByTestId("session").textContent!)).toMatchObject({
    user,
    token,
    authenticated: true,
    loading: false,
  });
  expect(localStorage.getItem("bb_access_token")).toBe(token);
  expect(JSON.parse(localStorage.getItem("user")!)).toEqual(user);
}
async function settle(work: () => void) {
  await act(async () => {
    work();
  });
}
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bb_access_token", "token-a");
  localStorage.setItem("user", JSON.stringify(first));
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("session validation resilience (#904)", () => {
  it("refreshes the current session on success", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    mount();
    const fresh = { ...first, xp: 100 };
    await settle(() => pending.resolve(response(200, { user: fresh })));
    expectSession(fresh);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/get-progress?excludeProgress=true"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-a" }),
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it.each([429, 500, 503, 403])(
    "preserves credentials after %s and allows one retry at a time",
    async (status) => {
      const initial = deferred<Response>();
      const retry = deferred<Response>();
      fetchMock
        .mockReturnValueOnce(initial.promise)
        .mockReturnValueOnce(retry.promise);
      mount();
      await settle(() =>
        initial.resolve(response(status, { error: "forbidden" })),
      );
      expectSession();
      const button = screen.getByRole("button", { name: "Retry" });
      fireEvent.click(button);
      fireEvent.click(button);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(button).toBeDisabled();
      expectSession();
      await settle(() => retry.resolve(response(200, { user: first })));
      expectSession();
      expect(
        screen.queryByRole("button", { name: "Retry" }),
      ).not.toBeInTheDocument();
    },
  );

  it("preserves credentials on network rejection and on repeated retry failures", async () => {
    const initial = deferred<Response>();
    const retry = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(retry.promise);
    mount();
    await settle(() => initial.reject(new TypeError("offline")));
    expectSession();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settle(() => retry.reject(new TypeError("offline")));
    expectSession();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden_invalid_token"],
  ] as const)(
    "clears storage AND React credentials after definitive %s rejection",
    async (status, error) => {
      const pending = deferred<Response>();
      fetchMock.mockReturnValue(pending.promise);
      mount();
      await settle(() => pending.resolve(response(status, { error })));
      expect(localStorage.getItem("bb_access_token")).toBeNull();
      expect(localStorage.getItem("user")).toBeNull();
      expect(JSON.parse(screen.getByTestId("session").textContent!)).toEqual({
        user: null,
        token: null,
        authenticated: false,
        loading: false,
      });
    },
  );

  it.each([200, 401, 403, 503])(
    "ignores a late %s response after another child signs in",
    async (status) => {
      const old = deferred<Response>();
      fetchMock.mockReturnValue(old.promise);
      mount();
      fireEvent.click(screen.getByRole("button", { name: "Sign in B" }));
      await settle(() =>
        old.resolve(
          response(status, { user: first, error: "forbidden_invalid_token" }),
        ),
      );
      expectSession(second, "token-b");
      expect(
        screen.queryByRole("button", { name: "Retry" }),
      ).not.toBeInTheDocument();
    },
  );

  it("ignores a body that arrives after a new login, even when the token string is reused", async () => {
    const body = deferred<unknown>();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => body.promise,
    } as Response);
    mount();
    await act(async () => {});
    fireEvent.click(screen.getByRole("button", { name: "Replace same token" }));
    await settle(() => body.resolve({ user: first }));
    expectSession(second, "token-a");
  });

  it("does not restore a session after logout", async () => {
    const old = deferred<Response>();
    fetchMock.mockReturnValue(old.promise);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await settle(() => old.resolve(response(200, { user: first })));
    expect(localStorage.getItem("user")).toBeNull();
    expect(JSON.parse(screen.getByTestId("session").textContent!)).toEqual({
      user: null,
      token: null,
      authenticated: false,
      loading: false,
    });
  });

  it("ignores unmounted and StrictMode rehearsal requests", async () => {
    const old = deferred<Response>();
    const current = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(current.promise);
    const view = mount(true);
    await settle(() =>
      current.resolve(response(200, { user: { ...first, xp: 50 } })),
    );
    await settle(() =>
      old.resolve(response(403, { error: "forbidden_invalid_token" })),
    );
    expectSession({ ...first, xp: 50 });
    view.unmount();
    const unmounted = deferred<Response>();
    fetchMock.mockReturnValue(unmounted.promise);
    const next = mount();
    next.unmount();
    localStorage.setItem("bb_access_token", "token-b");
    localStorage.setItem("user", JSON.stringify(second));
    await settle(() => unmounted.resolve(response(200, { user: first })));
    expect(JSON.parse(localStorage.getItem("user")!)).toEqual(second);
  });

  it("bounds a hung request, aborts it, and ignores its result after retry", async () => {
    vi.useFakeTimers();
    const hung = deferred<Response>();
    const retry = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(hung.promise)
      .mockReturnValueOnce(retry.promise);
    mount();
    act(() => vi.advanceTimersByTime(10_000));
    expectSession();
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await settle(() => hung.resolve(response(401, { error: "unauthorized" })));
    expectSession();
    await settle(() => retry.resolve(response(200, { user: first })));
    expectSession();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("offers retry for a malformed successful response without destroying the cached session", async () => {
    const pending = deferred<Response>();
    fetchMock.mockReturnValue(pending.promise);
    mount();
    await settle(() =>
      pending.resolve(new Response("bad json", { status: 200 })),
    );
    expectSession();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });
});
