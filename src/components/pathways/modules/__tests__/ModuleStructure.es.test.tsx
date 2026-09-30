/**
 * ModuleStructure — the save-failure notice in Spanish.
 *
 * Unlike ModuleStructure.test.tsx, this file does not mock react-i18next: it
 * builds a real i18next instance from the en and es locale files, merged the
 * way src/i18n.ts merges them, and switches it to es. A key missing from
 * es/pathways.json would fall back to English here and fail the assertions.
 */
import { StrictMode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createInstance, type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import enCommon from "@/locales/en/common.json";
import esCommon from "@/locales/es/common.json";
import enPathways from "@/locales/en/pathways.json";
import esPathways from "@/locales/es/pathways.json";
import ModuleStructure from "../ModuleStructure";
import type { ModuleContent } from "../cyberLaunchContent";

const SECTION_URL = "/api/pathways/student/milestones/section";

const CONTENT: ModuleContent = {
  slug: "test-module",
  title: "Test Module",
  totalMinutes: 10,
  hook: {
    estMinutes: 1,
    title: "Hook title",
    paragraphs: ["Hook body."],
    closer: "Closer.",
  },
  reading: {
    estMinutes: 1,
    sections: [{ heading: "Reading heading", paragraphs: ["Reading body."] }],
    citations: ["A source"],
  },
  lesson: {
    estMinutes: 1,
    intro: "Lesson intro.",
    scenes: [{ title: "Scene one", body: "Scene body." }],
  },
  practice: {
    estMinutes: 1,
    intro: "Practice intro.",
    items: [
      {
        prompt: "Pick one",
        options: [{ label: "Option A", correct: true, feedback: "Right." }],
      },
    ],
  },
  homework: {
    estMinutes: 1,
    title: "Homework title",
    prompt: "Write something.",
    instructions: ["Do the thing."],
    placeholder: "Type here",
  },
};

function reply(status: number): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: () => Promise.resolve({}),
  } as Response);
}

describe("ModuleStructure save-failure notice in Spanish", () => {
  let i18n: I18n;
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  // While true every section PATCH answers 500; after that each one is held
  // until the test releases it. Other requests answer 200.
  let failSections: boolean;
  let held: Array<() => void>;

  beforeAll(async () => {
    i18n = createInstance();
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: { ...enCommon, ...enPathways } },
        es: { translation: { ...esCommon, ...esPathways } },
      },
      lng: "en",
      fallbackLng: "en",
      interpolation: { escapeValue: false },
    });
    await i18n.changeLanguage("es");
  });

  beforeEach(() => {
    failSections = true;
    held = [];
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (String(input) !== SECTION_URL) return reply(200);
      if (failSections) return reply(500);
      return new Promise((resolve) => {
        held.push(() => resolve(reply(200)));
      });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));

  it("names every unsaved section, and offers Retry, in Spanish", async () => {
    render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <ModuleStructure
            content={CONTENT}
            onBack={() => {}}
            onComplete={() => {}}
            renderQuiz={({ onQuizComplete }) => (
              <button type="button" onClick={() => onQuizComplete(80)}>
                Finish quiz
              </button>
            )}
          />
        </I18nextProvider>
      </StrictMode>,
    );

    click("I'm ready →");
    click("Done reading →");
    click("Finish lesson →");
    click("Done with practice →");
    fireEvent.change(screen.getByPlaceholderText("Type here"), {
      target: { value: "Mi respuesta" },
    });
    click("Submit homework →");
    fireEvent.click(await screen.findByRole("button", { name: "Finish quiz" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No se pudo guardar tu progreso de: " +
          "Por Qué Importa, Lectura, Lección, Práctica, Tarea, Quiz",
      ),
    );

    failSections = false;
    click("Reintentar");
    expect(
      screen.getByRole("button", { name: "Reintentando…" }),
    ).toBeDisabled();

    // Retry re-sends all six sections at once; let them succeed.
    expect(held).toHaveLength(6);
    held.forEach((resolve) => resolve());
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
  });
});
