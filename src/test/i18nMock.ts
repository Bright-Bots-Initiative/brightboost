/**
 * Shared test helper for component tests that assert on user-visible English
 * text. Many of our older tests pre-date the i18n migration and check for
 * literal strings ("Gotcha Gears", "How to Play"). The current components
 * render `t("gameInstructions.gotchaGears.title")` — with a bare
 * `t: (key) => key` mock those tests would see the raw key.
 *
 * `enTranslate(key)` walks the real `en/common.json` to return the English
 * string, falling back to the key when not found. Tests pull this in and
 * use it in their own `vi.mock("react-i18next", …)` so the tested behavior
 * stays user-facing (what an English-speaking student actually sees) and
 * stops asserting on internal i18n keys.
 *
 * For test files that mock react-i18next, import this and use it as the
 * useTranslation backing:
 *
 *   import { enMock } from "@/test/i18nMock";
 *   vi.mock("react-i18next", () => enMock());
 */
import enCommon from "@/locales/en/common.json";

function lookup(path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = enCommon;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function enTranslate(key: string): string {
  return lookup(key) ?? key;
}

/**
 * Factory that returns a full react-i18next mock with English strings
 * resolved via the real locale JSON. Use as the factory argument to
 * `vi.mock("react-i18next", () => enMock())`.
 *
 * Includes the `initReactI18next` / `I18nextProvider` / `Trans` stubs
 * that the chain refers to but the tests don't actually exercise.
 */
export function enMock() {
  return {
    initReactI18next: { type: "3rdParty" as const, init: () => {} },
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    Trans: ({ children }: { children: React.ReactNode }) => children,
    useTranslation: () => ({
      t: enTranslate,
      i18n: {
        language: "en",
        changeLanguage: () => Promise.resolve(),
        on: () => {},
        off: () => {},
      },
    }),
  };
}
