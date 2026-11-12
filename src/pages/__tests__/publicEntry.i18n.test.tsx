/**
 * The public entry pages against the REAL i18n instance.
 *
 * The other suites mock `react-i18next` with an English-returning stub, which
 * proves the keys resolve but cannot prove a Spanish reader sees Spanish, and
 * cannot prove what a Vietnamese reader sees. Those two claims are the whole
 * point of the `<html lang>` and language-control behaviour, so they are
 * exercised here on `src/i18n.ts` itself:
 *
 *  - `es` renders the Spanish keys and announces `lang="es"`;
 *  - `vi` has no keys for these pages, so the page renders English and says
 *    `lang="en"` — while the visitor's saved `vi` preference is left alone and
 *    all four languages stay on offer.
 */
import { render, screen, act, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import i18n, { changeLanguage } from "@/i18n";
import GameShell from "@/components/games/shared/GameShell";
import ForTeachers from "../ForTeachers";
import ForFamilies from "../ForFamilies";
import Index from "../Index";
import Donate from "../Donate";
import FeedbackPage from "../FeedbackPage";

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

/** Every public entry page, with what each language must actually produce. */
const PAGES = [
  {
    name: "homepage",
    entry: "/",
    element: <Index />,
    es: {
      h1: "Un mundo que construyes al aprender.",
      title: "Bright Boost — Un mundo que construyes al aprender",
    },
    en: {
      h1: "A world you build by learning.",
      title: "Bright Boost — A world you build by learning",
    },
  },
  {
    name: "support page",
    entry: "/donate",
    element: <Donate />,
    es: {
      h1: "Apoya a Bright Boost",
      title: "Apoya a Bright Boost — Bright Boost",
    },
    en: {
      h1: "Support Bright Boost",
      title: "Support Bright Boost — Bright Boost",
    },
  },
  {
    name: "feedback page",
    entry: "/feedback",
    element: <FeedbackPage />,
    es: { h1: "Comentarios", title: "Comentarios — Bright Boost" },
    en: { h1: "Feedback", title: "Feedback — Bright Boost" },
  },
] as const;

async function setLanguage(code: string) {
  await act(async () => {
    await changeLanguage(code);
  });
}

function renderTeachers() {
  return render(
    <MemoryRouter initialEntries={["/for-teachers"]}>
      <ForTeachers />
    </MemoryRouter>,
  );
}

/**
 * The homepage now mounts a real game, so the shared game chrome is public
 * copy: its "How to play" summary had no key at all (a `defaultValue` only, so
 * Spanish showed English), and the reduced-effects control and the activity
 * chip were hardcoded English. These are the keys, resolved by the real i18n
 * instance rather than by a stub that returns English whatever you ask it.
 */
describe("the shared game chrome in Spanish", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the how-to-play disclosure, the effects toggle and the chip", async () => {
    await setLanguage("es");
    render(
      <GameShell
        gameKey="i18n-chrome"
        title="Tank Trek"
        briefing={{ title: "¡Misión!", story: "Historia", icon: "🤖" }}
        onComplete={() => {}}
        publicDemo
      >
        {() => <p>jugando</p>}
      </GameShell>,
    );

    // The summary is "❓ Cómo jugar" — emoji and label are separate nodes.
    const summary = screen.getByText(/Cómo jugar/, { selector: "summary" });
    expect(summary.tagName).toBe("SUMMARY");
    expect(screen.getByText(/Menos efectos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.getByRole("button", { name: "No" }),
    ).toHaveAccessibleDescription(/Reduce el movimiento/);
    // The chip beside the title, from ActivityHeader.
    expect(screen.getByText("Juego")).toBeInTheDocument();
    expect(screen.queryByText("Reduced effects")).toBeNull();
    expect(screen.queryByText("Off")).toBeNull();
    // Note: `ControlInstructions` inside this disclosure is still English —
    // its heading, its group labels and its instruction data are hardcoded,
    // and translating that model is not part of this change.
  });
});

describe("public entry pages with the real i18n instance", () => {
  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    localStorage.removeItem("preferredLanguage");
    document.documentElement.removeAttribute("lang");
  });

  it("renders Spanish copy and announces lang=es when the app language is es", async () => {
    await setLanguage("es");
    renderTeachers();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Crea una clase y mira lo que construyen.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Crear una cuenta de maestro" }),
    ).toHaveAttribute("href", "/teacher/signup");
    expect(screen.getByText("Lo primero que haces")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("lang")).toBe("es");
    expect(document.title).toBe("Para maestros — Bright Boost");
  });

  it("renders the Spanish family landing too", async () => {
    await setLanguage("es");
    render(
      <MemoryRouter initialEntries={["/for-families"]}>
        <ForFamilies />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Dos caminos, según dónde esté ya tu hijo.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Crear un grupo de hogar" }),
    ).toHaveAttribute("href", "/teacher/signup?intent=home");
    expect(document.documentElement.getAttribute("lang")).toBe("es");
  });

  it.each(PAGES)(
    "renders the Spanish $name and announces lang=es",
    async (page) => {
      await setLanguage("es");
      render(
        <MemoryRouter initialEntries={[page.entry]}>
          {page.element}
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("heading", { level: 1, name: page.es.h1 }),
      ).toBeInTheDocument();
      expect(document.documentElement.getAttribute("lang")).toBe("es");
      expect(document.title).toBe(page.es.title);
    },
  );

  it.each(PAGES)(
    "falls back to English on the $name for vi, and leaves the saved preference alone",
    async (page) => {
      await setLanguage("vi");
      render(
        <MemoryRouter initialEntries={[page.entry]}>
          {page.element}
        </MemoryRouter>,
      );
      expect(
        screen.getByRole("heading", { level: 1, name: page.en.h1 }),
      ).toBeInTheDocument();
      expect(document.documentElement.getAttribute("lang")).toBe("en");
      expect(document.title).toBe(page.en.title);
      expect(localStorage.getItem("preferredLanguage")).toBe("vi");
    },
  );

  it("falls back to English for vi and announces lang=en", async () => {
    await setLanguage("vi");
    renderTeachers();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Set up a class, then watch what they build.",
      }),
    ).toBeInTheDocument();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.title).toBe("For Teachers — Bright Boost");
  });

  it("names the rendered language on the control without touching the saved preference", async () => {
    const user = userEvent.setup();
    await setLanguage("vi");
    renderTeachers();

    // The trigger names what the reader is looking at (English), not the
    // preference (Tiếng Việt) — which is still exactly what is stored. The
    // verb after the colon stays in the app language, which is the point: a
    // Vietnamese reader is told, in Vietnamese, that the page is in English.
    const trigger = screen.getByRole("button", { name: /^English: / });
    expect(trigger).toHaveTextContent("English");
    expect(localStorage.getItem("preferredLanguage")).toBe("vi");

    // And the menu still offers every supported language — the prop restricts
    // nothing.
    await user.click(trigger);
    const wrapper = trigger.parentElement as HTMLElement;
    const options = within(wrapper)
      .getAllByRole("button")
      .filter((button) => button !== trigger)
      .map((button) => button.textContent);
    expect(options).toEqual(["English", "Español", "Tiếng Việt", "简体中文"]);
    expect(localStorage.getItem("preferredLanguage")).toBe("vi");
  });

  /**
   * A language change re-runs both metadata effects. The failure mode is not a
   * wrong string — it is a second `<title>`, a second description meta or a
   * second canonical left behind by the run that was replaced, and nothing
   * user-visible would reveal it. So the tags are counted, not sampled.
   */
  it("swaps the homepage title and description on a language change without duplicating either", async () => {
    const enMeta = {
      title: "Bright Boost — A world you build by learning",
      description:
        "Explore Bright Boost STEM games. Play a free robot mission, then choose the right starting point for your classroom or family.",
    };
    const esMeta = {
      title: "Bright Boost — Un mundo que construyes al aprender",
      description:
        "Explora los juegos STEM de Bright Boost. Prueba una misión gratuita de robótica y descubre por dónde empezar con tu clase o familia.",
    };
    const readMeta = () => ({
      title: document.title,
      titles: document.querySelectorAll("head > title").length,
      description: document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
      descriptions: document.head.querySelectorAll('meta[name="description"]')
        .length,
      ogTitle: document.head
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content"),
      ogTitles: document.head.querySelectorAll('meta[property="og:title"]')
        .length,
      canonicals: document.head.querySelectorAll('link[rel="canonical"]')
        .length,
      schemas: document.querySelectorAll("#bb-home-schema").length,
    });

    await setLanguage("en");
    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Index />
      </MemoryRouter>,
    );
    expect(readMeta()).toEqual({
      title: enMeta.title,
      titles: 1,
      description: enMeta.description,
      descriptions: 1,
      ogTitle: enMeta.title,
      ogTitles: 1,
      canonicals: 1,
      schemas: 1,
    });

    await setLanguage("es");
    expect(readMeta()).toEqual({
      title: esMeta.title,
      titles: 1,
      description: esMeta.description,
      descriptions: 1,
      ogTitle: esMeta.title,
      ogTitles: 1,
      canonicals: 1,
      schemas: 1,
    });

    unmount();
    expect(
      document.head.querySelectorAll('link[rel="canonical"]'),
    ).toHaveLength(0);
    expect(
      document.head.querySelectorAll('meta[property="og:title"]'),
    ).toHaveLength(0);
    expect(document.getElementById("bb-home-schema")).toBeNull();
  });

  it("restores <html lang> on unmount", async () => {
    document.documentElement.setAttribute("lang", "vi");
    await setLanguage("es");
    const { unmount } = renderTeachers();
    expect(document.documentElement.getAttribute("lang")).toBe("es");
    unmount();
    expect(document.documentElement.getAttribute("lang")).toBe("vi");
  });
});
