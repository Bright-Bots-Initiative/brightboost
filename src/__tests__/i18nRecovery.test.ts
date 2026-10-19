import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});
describe("#905 — localization without browser storage", () => {
  it("boots with a readable fallback when storage access is denied", async () => {
    vi.resetModules();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Blocked", "SecurityError");
    });
    const { default: i18n } = await import("../i18n");
    expect(i18n.t("nav.classes")).toBe("Classes");
  });
  it("still changes language if saving the preference fails", async () => {
    const { default: i18n, changeLanguage } = await import("../i18n");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Full", "QuotaExceededError");
    });
    await expect(changeLanguage("es")).resolves.toBeUndefined();
    expect(i18n.language).toBe("es");
    expect(i18n.t("nav.classes")).toBe("Clases");
    await changeLanguage("en");
  });
});
