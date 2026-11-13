import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n, { changeLanguage } from "@/i18n";
import PrivacyPolicy from "../PrivacyPolicy";

afterEach(async () => {
  cleanup();
  await act(async () => {
    await changeLanguage("en");
  });
});

describe("privacy provider disclosure", () => {
  it.each(["en", "es", "vi", "zh-CN"])(
    "discloses providers in %s while preserving the owner's policy date",
    async (language) => {
      await act(async () => {
        await changeLanguage(language);
      });
      render(
        <MemoryRouter>
          <PrivacyPolicy />
        </MemoryRouter>,
      );
      const providers = screen.getByRole("region", {
        name: i18n.t("privacy.analytics.title"),
      });
      for (const provider of [
        "PostHog",
        "Google Fonts",
        "Cloudflare Web Analytics",
      ]) {
        expect(within(providers).getByText(new RegExp(provider))).toBeVisible();
      }
      for (const key of [
        "title",
        "posthog",
        "fonts",
        "cloudflare",
        "requests",
      ]) {
        expect(
          i18n.getResource(language, "translation", `privacy.analytics.${key}`),
        ).toBeTruthy();
      }
      expect(screen.getByText("Last updated: February 2026")).toBeVisible();
      expect(
        screen.queryByText(/exclusively for educational progress tracking/),
      ).toBeNull();
    },
  );
});
