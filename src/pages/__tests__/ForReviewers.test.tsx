import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import i18n, { changeLanguage } from "@/i18n";
import ForReviewers from "../ForReviewers";

afterEach(async () => {
  cleanup();
  await act(async () => {
    await changeLanguage("en");
  });
});

describe("public evaluator access", () => {
  it.each(["en", "es", "vi", "zh-CN"])(
    "offers private access requests without publishing logins in %s",
    async (language) => {
      await act(async () => {
        await changeLanguage(language);
      });
      const { container } = render(
        <MemoryRouter initialEntries={["/for-reviewers"]}>
          <ForReviewers />
        </MemoryRouter>,
      );
      const requests = screen.getAllByRole("link", {
        name: i18n.t("reviewers.explore.requestAccess"),
      });
      expect(requests).toHaveLength(2);
      requests.push(
        screen.getByRole("link", { name: i18n.t("reviewers.ctaTeacher") }),
      );
      for (const link of requests) {
        expect(link).toHaveAttribute("href", "mailto:fenixvisions@gmail.com");
      }
      expect(container.querySelector('a[href="/teacher-login"]')).toBeNull();
      expect(container.querySelector("pre, code, input")).toBeNull();
      // Published account names are absent; the request address is in hrefs.
      expect(container.textContent).not.toMatch(
        /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
      );
      expect(container.textContent).not.toContain("BrightBoost");
      expect(container.textContent).toContain("Bright Boost");
      expect(container.textContent).toContain("PostHog");
      expect(container.querySelector('a[href="/showcase"]')).not.toBeNull();
      expect(
        i18n.getResource(
          language,
          "translation",
          "reviewers.explore.requestAccess",
        ),
      ).toBeTruthy();
    },
  );

  it.each([
    [
      "en",
      "Learning experiences for K–2 and grades 3–5 are available now. Grades 6–8 are coming soon.",
    ],
    [
      "es",
      "Las experiencias de aprendizaje para K–2 y los grados 3–5 ya están disponibles. Los grados 6–8 estarán disponibles próximamente.",
    ],
  ])(
    "states current grade availability in %s",
    async (language, availability) => {
      await act(async () => {
        await changeLanguage(language);
      });
      const { container } = render(
        <MemoryRouter>
          <ForReviewers />
        </MemoryRouter>,
      );
      expect(container.textContent).toContain(availability);
    },
  );
});
