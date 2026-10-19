import { lazy, Suspense } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecoveryScreen, { AppErrorBoundary } from "../RecoveryScreen";
import { bootstrap } from "@/bootstrap";
import i18n from "i18next";

let dispose: (() => void) | undefined;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  act(() => dispose?.());
  dispose = undefined;
  host.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("#905 — startup and render recovery", () => {
  it("boots a healthy application", async () => {
    await act(async () => {
      dispose = bootstrap(host, async () => () => <p>Ready to learn</p>);
    });
    expect(screen.getByText("Ready to learn")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows an accessible recovery screen after a rejected boot import", async () => {
    await act(async () => {
      dispose = bootstrap(host, async () => {
        throw new Error("Chunk unavailable");
      });
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Bright Boost couldn’t load this page",
    );
    expect(screen.getByRole("heading")).toHaveFocus();
    expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
  });
  it("bounds a stalled startup and offers recovery", async () => {
    vi.useFakeTimers();
    await act(async () => {
      dispose = bootstrap(host, () => new Promise(() => {}));
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading Bright Boost",
    );
    act(() => vi.advanceTimersByTime(20_000));
    expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
  });
  it("contains a rejected lazy route import", async () => {
    const Route = lazy(async () => {
      throw new Error("Old route chunk");
    });
    await act(async () => {
      render(
        <AppErrorBoundary>
          <Suspense fallback={<p>Loading route</p>}>
            <Route />
          </Suspense>
        </AppErrorBoundary>,
      );
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check your connection",
    );
  });
  it("contains rendering errors without showing internal error details", () => {
    function Broken(): never {
      throw new Error("private server detail");
    }
    render(
      <AppErrorBoundary>
        <Broken />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeEnabled();
    expect(screen.queryByText(/private server detail/)).toBeNull();
  });
  it("keeps a stale-asset recovery screen when an earlier boot later resolves", async () => {
    let resolve!: (component: () => React.JSX.Element) => void;
    await act(async () => {
      dispose = bootstrap(
        host,
        () =>
          new Promise((yes) => {
            resolve = yes;
          }),
      );
    });
    const event = new Event("vite:preloadError", { cancelable: true });
    act(() => {
      window.dispatchEvent(event);
      window.dispatchEvent(new Event("vite:preloadError"));
    });
    expect(event.defaultPrevented).toBe(true);
    await act(async () => resolve(() => <p>Obsolete app</p>));
    expect(screen.queryByText("Obsolete app")).toBeNull();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
  it("reloads only when the user activates recovery", () => {
    const reload = vi.fn();
    render(<RecoveryScreen onReload={reload} />);
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reload).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute(
      "href",
      "/",
    );
  });
  it("can show Spanish recovery without the configured localization module", async () => {
    const previous = i18n.language;
    i18n.language = "es";
    render(<RecoveryScreen />);
    expect(
      screen.getByRole("button", { name: "Volver a cargar" }),
    ).toBeEnabled();
    i18n.language = previous;
  });
});
