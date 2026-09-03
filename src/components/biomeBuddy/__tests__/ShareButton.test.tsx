/**
 * ShareButton (Phase 9): Web Share API when present, clipboard fallback,
 * manual field on failure; every outcome is announced in a live region; the
 * link it hands out is the validated share URL for the current origin and
 * nothing else is ever sent anywhere.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareButton from "../ShareButton";
import { starterRecipe } from "../biomeBuddyModel";
import { buildShareUrl, decodeShare, readShareParam } from "../biomeBuddyShare";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { defaultValue?: string; [key: string]: unknown },
    ) => {
      let text = options?.defaultValue ?? key;
      for (const [name, value] of Object.entries(options ?? {}))
        if (name !== "defaultValue")
          text = text.replaceAll(`{{${name}}}`, String(value));
      return text;
    },
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

const recipe = (() => {
  const r = starterRecipe("water");
  r.traits.nose = "gills";
  r.name = { adjective: "swift", noun: "splasher" };
  return r;
})();

function setNavigator(patch: Record<string, unknown>) {
  const original: Record<string, PropertyDescriptor | undefined> = {};
  for (const key of Object.keys(patch)) {
    original[key] = Object.getOwnPropertyDescriptor(navigator, key);
    Object.defineProperty(navigator, key, {
      configurable: true,
      value: patch[key],
    });
  }
  return () => {
    for (const key of Object.keys(patch)) {
      const desc = original[key];
      if (desc) Object.defineProperty(navigator, key, desc);
      else delete (navigator as unknown as Record<string, unknown>)[key];
    }
  };
}

const flush = () => act(async () => {});

describe("ShareButton", () => {
  let restore: () => void = () => {};
  afterEach(() => restore());

  it("uses the Web Share API with the validated URL and announces success", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    restore = setNavigator({ share, clipboard: undefined });
    render(<ShareButton recipe={recipe} name="Swift Splasher" />);
    fireEvent.click(screen.getByRole("button", { name: /Share my Buddy/ }));
    await flush();
    expect(share).toHaveBeenCalledTimes(1);
    const { title, url } = share.mock.calls[0][0] as {
      title: string;
      url: string;
    };
    expect(url).toBe(buildShareUrl(window.location.origin, recipe));
    expect(title).toBe("Swift Splasher — Biome Buddy");
    const decoded = decodeShare(readShareParam(new URL(url).hash));
    expect(decoded.ok && decoded.recipe).toEqual(recipe);
    expect(screen.getByRole("status")).toHaveTextContent("Shared!");
  });

  it("falls back to the clipboard when there is no share sheet, and shows the link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    restore = setNavigator({ share: undefined, clipboard: { writeText } });
    render(<ShareButton recipe={recipe} name="Swift Splasher" />);
    fireEvent.click(screen.getByRole("button", { name: /Share my Buddy/ }));
    await flush();
    expect(writeText).toHaveBeenCalledWith(
      buildShareUrl(window.location.origin, recipe),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Link copied!");
    const field = screen.getByRole("textbox", {
      name: "Share link",
    }) as HTMLInputElement;
    expect(field.readOnly).toBe(true);
    expect(field.value).toBe(buildShareUrl(window.location.origin, recipe));
  });

  it("when the child dismisses the share sheet, nothing is announced and nothing is copied", async () => {
    const share = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("cancel"), { name: "AbortError" }),
      );
    const writeText = vi.fn();
    restore = setNavigator({ share, clipboard: { writeText } });
    render(<ShareButton recipe={recipe} name="Swift Splasher" />);
    fireEvent.click(screen.getByRole("button", { name: /Share my Buddy/ }));
    await flush();
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("when both share and clipboard fail, the link is shown to copy by hand", async () => {
    const share = vi.fn().mockRejectedValue(new Error("boom"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    restore = setNavigator({ share, clipboard: { writeText } });
    render(<ShareButton recipe={recipe} name="Swift Splasher" />);
    fireEvent.click(screen.getByRole("button", { name: /Share my Buddy/ }));
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent(/Couldn't copy/);
    expect(
      screen.getByRole("textbox", { name: "Share link" }),
    ).toBeInTheDocument();
  });

  it("never makes a network request", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    restore = setNavigator({
      share: undefined,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ShareButton recipe={recipe} name="Swift Splasher" />);
    fireEvent.click(screen.getByRole("button", { name: /Share my Buddy/ }));
    await flush();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
