/**
 * #838 — the Safe Exploration controls (presentational half).
 *
 * The automated proof the accessibility contract (§9) asks of this surface:
 * accessible names and state, the focus matrix, one polite announcement per
 * change, reduced motion, the unavailable-with-reason rule, and the §6
 * learner-outcome / system-failure distinction.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SafeExplorationControls } from "../SafeExplorationControls";
import type { SafeExplorationControlsProps } from "../SafeExplorationControls";

// The shared `enMock` helper resolves real English copy but ignores
// interpolation; these announcements are built from `{{baseline}}`, so the
// mock here fills values too. The assertions stay on what a learner reads.
vi.mock("react-i18next", async () => {
  const { enTranslate } = await import("@/test/i18nMock");
  const t = (key: string, values?: Record<string, string>) => {
    let out = enTranslate(key);
    if (values) {
      for (const [name, value] of Object.entries(values)) {
        out = out.split(`{{${name}}}`).join(String(value));
      }
    }
    return out;
  };
  return {
    initReactI18next: { type: "3rdParty" as const, init: () => {} },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    Trans: ({ children }: { children: React.ReactNode }) => children,
    useTranslation: () => ({
      t,
      i18n: {
        language: "en",
        changeLanguage: () => Promise.resolve(),
        on: () => {},
        off: () => {},
      },
    }),
  };
});

const trackMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track: trackMock }));

const BASE: SafeExplorationControlsProps = {
  surfaceId: "demo",
  band: "k2",
  baseline: { id: "b-1", label: "your saved track" },
  onRun: () => ({ status: "ok", summary: "The bike spun out on the turn." }),
};

function renderControls(overrides: Partial<SafeExplorationControlsProps> = {}) {
  return render(<SafeExplorationControls {...BASE} {...overrides} />);
}

const region = () => screen.getByTestId("demo-safe-exploration");
const statusRegion = () => screen.getByTestId("demo-safe-exploration-status");
const liveRegion = () =>
  screen.getByTestId("demo-safe-exploration-announcement");

function stubMatchMedia(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: reduce,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("SEA-1 — states and exits are visible and programmatically named", () => {
  it("names the baseline in ordinary page structure and offers one exit", () => {
    renderControls();

    expect(region()).toHaveAttribute("data-state", "baseline");
    expect(
      screen.getByRole("region", { name: "Try things out" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("demo-safe-exploration-baseline"),
    ).toHaveTextContent("Right now you have: your saved track");
    expect(
      screen.getByRole("heading", { name: "Ready to try" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try it" })).toBeInTheDocument();
  });

  it("labels actions by purpose in each band", async () => {
    const user = userEvent.setup();
    renderControls({
      band: "older",
      onPreview: () => {},
      onKeep: () => {},
      onRestore: () => {},
      onBranch: () => {},
    });

    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await user.click(screen.getByRole("button", { name: "Run" }));

    expect(
      screen.getByRole("button", { name: "Keep this version" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save as a new version" }),
    ).toBeInTheDocument();
  });

  it("never renders a branch control for K–2, even with a branch handler", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onBranch: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(screen.queryByText(/branch/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new one/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps exactly one visually dominant action in every state it reaches", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });

    const primaries = () =>
      Array.from(region().querySelectorAll('[data-emphasis="primary"]'));

    expect(primaries()).toHaveLength(1); // baseline
    await user.click(screen.getByRole("button", { name: "Try it" }));
    expect(primaries()).toHaveLength(1); // observing
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(primaries()).toHaveLength(1); // kept
    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(primaries()).toHaveLength(1); // restored
  });

  it("keeps the way back visible after the consequential action", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    expect(region()).toHaveAttribute("data-state", "kept");
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });
});

describe("SEA-2 — restore cannot overwrite the preserved baseline", () => {
  it("explains what keeping replaces, as the Keep control's description", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(
      screen.getByRole("button", { name: "Keep it" }),
    ).toHaveAccessibleDescription(
      /If you keep this, it takes the place of your saved track\./,
    );
  });

  it("removes Keep entirely once the learner has gone back", async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    renderControls({ onKeep, onRestore: () => {} });

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(region()).toHaveAttribute("data-state", "restored");
    expect(screen.queryByRole("button", { name: "Keep it" })).toBeNull();
    expect(onKeep).not.toHaveBeenCalled();
  });
});

describe("SEA-3 — the focus matrix", () => {
  it("never steals focus when the surface mounts", () => {
    renderControls();
    expect(document.activeElement).toBe(document.body);
  });

  it("moves focus to the result region after a run", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    expect(document.activeElement).toBe(statusRegion());
  });

  it("holds focus on the invoking control while the run is in flight", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    renderControls({
      onRun: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const tryIt = screen.getByRole("button", { name: "Try it" });
    await user.click(tryIt);

    expect(region()).toHaveAttribute("data-state", "running");
    expect(document.activeElement).toBe(tryIt);
    // Busy, but still focusable — `aria-disabled`, never `disabled`.
    expect(tryIt).toHaveAttribute("aria-disabled", "true");
    expect(tryIt).toHaveAttribute("aria-busy", "true");
    expect(tryIt).not.toBeDisabled();

    release();
    await waitFor(() =>
      expect(region()).toHaveAttribute("data-state", "observing"),
    );
  });

  it("moves focus to the confirmation after keep and to the next action after restore", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(document.activeElement).toBe(statusRegion());

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(region()).toHaveAttribute("data-state", "restored");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Try another way" }),
    );
  });

  it("moves focus to the preview's primary action and back on cancel", async () => {
    const user = userEvent.setup();
    renderControls({ band: "older", onPreview: () => {}, onCancel: () => {} });

    await user.click(screen.getByRole("button", { name: "Preview" }));
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Run" }),
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(region()).toHaveAttribute("data-state", "baseline");
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Preview" }),
    );
  });

  it("moves focus to the error region", async () => {
    const user = userEvent.setup();
    renderControls({
      onKeep: () => ({
        status: "recoverableError",
        summary: "The save did not go through.",
      }),
    });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    expect(region()).toHaveAttribute("data-state", "recoverableError");
    expect(document.activeElement).toBe(statusRegion());
  });
});

describe("SEA-4 — announcements without animation or sound", () => {
  it("is silent while idle and announces each change once", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });

    expect(liveRegion()).toHaveAttribute("aria-live", "polite");
    expect(liveRegion()).toHaveTextContent("");

    await user.click(screen.getByRole("button", { name: "Try it" }));
    expect(liveRegion()).toHaveTextContent(
      "You tried it. Here is what happened. The bike spun out on the turn.",
    );

    await user.click(screen.getByRole("button", { name: "Keep it" }));
    expect(liveRegion()).toHaveTextContent(
      "You kept it. your saved track is this now.",
    );
  });

  it("says what was restored, never a bare done", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(liveRegion()).toHaveTextContent(
      "You went back. your saved track is the way it was before.",
    );
  });

  it("shows everything it announces, so nothing is audio-only", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(statusRegion()).toHaveTextContent(
      "You tried it. Here is what happened. The bike spun out on the turn.",
    );
  });
});

describe("SEA-5 — reduced motion keeps the feedback", () => {
  it("uses the entrance transition when motion is allowed", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(region()).toHaveAttribute("data-reduced-motion", "false");
    expect(statusRegion().className).toContain("slide-up-fade");
    expect(statusRegion()).toHaveTextContent("The bike spun out on the turn.");
  });

  it("drops the transition but keeps every piece of feedback", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(region()).toHaveAttribute("data-reduced-motion", "true");
    expect(statusRegion().className).not.toContain("slide-up-fade");
    // The consequence is still perceivable: state, heading, body, announcement.
    expect(region()).toHaveAttribute("data-state", "observing");
    expect(
      screen.getByRole("heading", { name: "What happened?" }),
    ).toBeInTheDocument();
    expect(statusRegion()).toHaveTextContent("The bike spun out on the turn.");
    expect(liveRegion()).toHaveTextContent("The bike spun out on the turn.");
  });

  it("honours an explicit reducedEffects prop from GameShell", () => {
    stubMatchMedia(false);
    renderControls({ reducedEffects: true });
    expect(region()).toHaveAttribute("data-reduced-motion", "true");
  });
});

describe("SEA-6 — no mystery disabled control", () => {
  it("gives every non-ready control an accessible description", async () => {
    const user = userEvent.setup();
    renderControls({
      onKeep: () => {},
      onRestore: () => {},
      availability: {
        restore: {
          kind: "blocked",
          reason: "Ask your teacher to unlock this.",
        },
      },
    });
    await user.click(screen.getByRole("button", { name: "Try it" }));

    const blocked = screen.getByRole("button", { name: "Go back" });
    expect(blocked).toHaveAttribute("aria-disabled", "true");
    expect(blocked).toHaveAccessibleDescription(
      /Ask your teacher to unlock this\./,
    );
    // The reason is text on the page, not just a dimmed look.
    expect(
      screen.getByTestId("demo-safe-exploration-reason-restore"),
    ).toBeVisible();

    for (const button of screen.getAllByRole("button")) {
      if (button.getAttribute("aria-disabled") === "true") {
        expect(button).toHaveAccessibleDescription(/\S/);
      }
    }
  });

  it("omits a hidden action rather than dimming it", async () => {
    const user = userEvent.setup();
    renderControls({
      onKeep: () => {},
      onRestore: () => {},
      availability: { restore: { kind: "hidden" } },
    });
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(screen.queryByRole("button", { name: "Go back" })).toBeNull();
    expect(screen.getByRole("button", { name: "Keep it" })).toBeInTheDocument();
  });

  it("states the reason as text when the whole surface is unavailable", () => {
    renderControls({
      unavailable: { reason: "Your teacher paused experiments for now." },
    });

    expect(region()).toHaveAttribute("data-state", "unavailable");
    expect(statusRegion()).toHaveTextContent(
      "Your teacher paused experiments for now.",
    );
    expect(liveRegion()).toHaveTextContent(""); // never announced unprompted
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
  });
});

describe("SEA-7 — system failures stay distinct from learner outcomes", () => {
  it("keeps a disappointing result a learner outcome", async () => {
    const user = userEvent.setup();
    renderControls();
    await user.click(screen.getByRole("button", { name: "Try it" }));

    expect(region()).toHaveAttribute("data-state", "observing");
    expect(statusRegion()).not.toHaveAttribute("data-error-kind");
    expect(statusRegion()).toHaveTextContent("The bike spun out on the turn.");
  });

  it("marks an unexpected failure as ours, not the learner's", async () => {
    const user = userEvent.setup();
    const onUnexpectedError = vi.fn();
    renderControls({
      onKeep: () => {
        throw new Error("save endpoint 500");
      },
      onExit: () => {},
      onUnexpectedError,
    });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    expect(region()).toHaveAttribute("data-state", "unexpectedError");
    expect(statusRegion()).toHaveAttribute("data-error-kind", "unexpected");
    expect(statusRegion()).toHaveTextContent(
      "Something broke on our side, not in your try.",
    );
    expect(statusRegion()).toHaveTextContent("your saved track is still safe.");
    expect(onUnexpectedError).toHaveBeenCalledTimes(1);
    // Retry and leave are both reachable.
    expect(
      screen.getByRole("button", { name: "Try that again" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to my lesson" }),
    ).toBeInTheDocument();
  });

  it("distinguishes a recoverable failure from an unexpected one", async () => {
    const user = userEvent.setup();
    renderControls({
      onKeep: () => ({
        status: "recoverableError",
        summary: "We could not save just now.",
      }),
    });
    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));

    expect(statusRegion()).toHaveAttribute("data-error-kind", "recoverable");
    expect(statusRegion()).toHaveTextContent("We could not save just now.");
  });
});

describe("SEA-8 — K–2 bar and process analytics", () => {
  it("uses 56px K–2 tap targets and 44px for older bands", async () => {
    const { unmount } = renderControls();
    expect(screen.getByRole("button", { name: "Try it" })).toHaveAttribute(
      "data-tap-target",
      "56",
    );
    unmount();

    renderControls({ band: "older" });
    expect(screen.getByRole("button", { name: "Run" })).toHaveAttribute(
      "data-tap-target",
      "44",
    );
  });

  it("tracks process, not correctness", async () => {
    const user = userEvent.setup();
    renderControls({ onKeep: () => {}, onRestore: () => {} });

    await user.click(screen.getByRole("button", { name: "Try it" }));
    await user.click(screen.getByRole("button", { name: "Keep it" }));
    await user.click(screen.getByRole("button", { name: "Go back" }));

    expect(trackMock.mock.calls.map(([e]) => e.kind)).toEqual([
      "experiment_tried",
      "experiment_kept",
      "experiment_restored",
    ]);
    for (const [event] of trackMock.mock.calls) {
      expect(Object.keys(event).sort()).toEqual([
        "attempt",
        "band",
        "kind",
        "surface_id",
      ]);
    }
  });
});
