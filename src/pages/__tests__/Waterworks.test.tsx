/**
 * /waterworks cold-render contract: the page must fully render for a
 * logged-out visitor — no auth provider, no router context, no API — and
 * must mirror the language into document.documentElement.lang while open
 * (zh-CN glyph correctness), restoring it on leave.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, cleanup } from "@testing-library/react";
import Waterworks from "../Waterworks";

const listeners: Record<string, Array<() => void>> = {};
const fakeI18n = {
  language: "en",
  resolvedLanguage: "en",
  on: (event: string, fn: () => void) => {
    (listeners[event] ??= []).push(fn);
  },
  off: (event: string, fn: () => void) => {
    listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
  },
  changeLanguage: vi.fn(),
};

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty" as const, init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
    i18n: fakeI18n,
  }),
}));

vi.mock("@/i18n", () => ({
  changeLanguage: vi.fn(),
  SUPPORTED_LANGUAGES: [
    { code: "en", label: "English" },
    { code: "zh-CN", label: "简体中文" },
  ],
}));

describe("/waterworks — logged-out cold render", () => {
  beforeEach(() => {
    localStorage.clear();
    fakeI18n.language = "en";
    fakeI18n.resolvedLanguage = "en";
    document.documentElement.lang = "";
  });

  it("renders the full page with NO auth provider and NO router", () => {
    render(<Waterworks />);
    expect(screen.getByText("石犀工坊 · Waterworks")).toBeTruthy(); // lockup
    expect(
      screen.getByText("Inspired by the 2,300-year-old Dujiangyan waterworks of Chengdu"),
    ).toBeTruthy(); // credit line
    expect(screen.getByText("What will you build?")).toBeTruthy(); // Imagine
    expect(screen.getByText(/K–2 · Guided/)).toBeTruthy(); // band picker
  });

  it("mirrors the language into document.documentElement.lang and restores it on leave", () => {
    document.documentElement.lang = "en-US";
    const { unmount } = render(<Waterworks />);
    expect(document.documentElement.lang).toBe("en");

    fakeI18n.resolvedLanguage = "zh-CN";
    act(() => {
      (listeners["languageChanged"] ?? []).forEach((fn) => fn());
    });
    expect(document.documentElement.lang).toBe("zh-CN"); // zh glyph correctness

    unmount();
    expect(document.documentElement.lang).toBe("en-US"); // restored on leave
    cleanup();
  });

  it("makes zero network requests on mount (isolation contract)", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    render(<Waterworks />);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
