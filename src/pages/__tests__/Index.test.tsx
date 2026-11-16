/**
 * `/` — the homepage.
 *
 * The parts that are easy to break silently are asserted directly: the exact
 * destinations, the events that may fire and the ones that may not, the
 * structured data (which is a public claim), the role panel's keyboard and
 * storage behaviour, and the legacy compatibility paths — where the failure
 * modes are a redirect loop, a fragment that does nothing, and a one-shot
 * storage key that is never cleared.
 *
 * `PublicDemo` is stubbed here. The page's job is to mount exactly one of it,
 * in the right place, and to leave the demo's own analytics alone; that the
 * panel really is the shipped Tank Trek, really loads it lazily and really
 * calls nothing is proved against the real game in
 * `src/components/home/__tests__/PublicDemo.test.tsx`.
 */
import * as React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import Index from "../Index";
import { track } from "@/lib/analytics";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

/**
 * The stub reports ready the way the real panel does — once, after it has
 * rendered — because the page's one-shot anchor landing re-runs on that
 * signal. It fires on mount here (a child effect, so before the page's own
 * effects) where the real one fires when the lazy chunk resolves; the page has
 * to land the anchor correctly either way round, and both orders are covered
 * below.
 */
vi.mock("@/components/home/PublicDemo", () => {
  const PublicDemoStub = ({ onReady }: { onReady?: () => void }) => {
    React.useEffect(() => {
      onReady?.();
    }, [onReady]);
    return (
      <div
        data-testid="public-demo"
        role="region"
        aria-label="Tank Trek game area"
      >
        demo panel
      </div>
    );
  };
  return { default: PublicDemoStub };
});

const trackMock = vi.mocked(track);

const LEGACY_KEY = "bb-home-scroll";
const ROLE_KEY = "bb-public-role";

// jsdom does not implement scrollIntoView at all, so it cannot be spied on —
// it has to be installed. The homepage only ever calls it for the legacy
// `plans` handoff, which is exactly what the assertions below pin.
const scrollIntoView = vi.fn();
Object.defineProperty(Element.prototype, "scrollIntoView", {
  value: scrollIntoView,
  writable: true,
  configurable: true,
});

function LocationProbe() {
  const { pathname } = useLocation();
  // `useNavigationType` is the direct read of whether the last navigation
  // replaced the entry or pushed a new one — the difference between a legacy
  // fragment that disappears from history and one a Back press walks into
  // again, which is a redirect loop from the visitor's side.
  const navigationType = useNavigationType();
  return (
    <>
      <div data-testid="location">{pathname}</div>
      <div data-testid="navigation-type">{navigationType}</div>
    </>
  );
}

describe("Index (public / route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let originalTitle: string;
  let originalLang: string | null;

  beforeEach(() => {
    trackMock.mockClear();
    sessionStorage.clear();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    scrollIntoView.mockClear();
    originalTitle = document.title;
    originalLang = document.documentElement.getAttribute("lang");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    sessionStorage.clear();
    document.title = originalTitle;
    if (originalLang === null) document.documentElement.removeAttribute("lang");
    else document.documentElement.setAttribute("lang", originalLang);
  });

  /** Content, hrefs and events: no route matching, so a Link click changes the
   *  location without unmounting the page under test. */
  function renderPage(entry = "/") {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Index />
      </MemoryRouter>,
    );
  }

  /** Legacy compatibility: real routes, so a redirect is observable. */
  function renderRouted(entry = "/") {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/donate" element={<div>donate page</div>} />
          <Route path="/feedback" element={<div>feedback page</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );
  }

  it("renders anonymously, with no fetch, under the approved heading", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /A world you build\s*by learning\./,
      }),
    ).toBeInTheDocument();
    // The tagline is a display line, not the heading.
    expect(screen.getByText("Play. Build. Become.")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Play. Build. Become." }),
    ).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the shipped Homepage nav landmark and the wordmark", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: "Homepage" });
    expect(
      within(nav).getByRole("link", { name: "Bright Boost" }),
    ).toHaveAttribute("href", "/");
  });

  it("carries exactly one game panel, and the mascot is the page's only image", () => {
    renderPage();
    expect(screen.getAllByTestId("public-demo")).toHaveLength(1);
    expect(
      screen.getAllByRole("region", { name: "Tank Trek game area" }),
    ).toHaveLength(1);

    const images = document.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("src")).toBe(
      "/mascots/bright-bot-character.png",
    );
    // Decorative: the header link is already named.
    expect(images[0].getAttribute("alt")).toBe("");
  });

  it("introduces the demo in one sentence, one disclosure and one quiet way out", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(
      screen.getByText(
        "Program Bolt through a real robot mission. Choose a challenge for K–2 or grades 3–5.",
      ),
    ).toBeInTheDocument();

    // The disclosure holds detail, never navigation.
    const summary = screen.getByText("How the demo works");
    expect(summary.tagName).toBe("SUMMARY");
    expect(
      within(summary.closest("details") as HTMLElement).queryByRole("link"),
    ).toBeNull();
    await user.click(summary);
    expect(
      screen.getByText("Three short mazes, played right here on this page."),
    ).toBeVisible();

    expect(
      screen.getByRole("link", { name: "Open in full screen" }),
    ).toHaveAttribute("href", "/try");
    expect(
      screen.getByRole("link", { name: "For teachers and families" }),
    ).toHaveAttribute("href", "#for-adults");
    expect(document.getElementById("for-adults")).not.toBeNull();
  });

  /**
   * Reading order on one column is DOM order, and on a phone the game has to
   * come straight after the sentence that introduces it — Start Mission used
   * to sit 1238px down at 390px because the disclosure and the adult link were
   * in front of it. They are their own grid child now, after the panel, and
   * the `lg:row-start-2` on that child is what puts them back under the intro
   * on two columns.
   */
  it("puts the game straight after the intro, with the adult links below it", () => {
    renderPage();
    const heading = screen.getByRole("heading", { level: 1 });
    const panel = screen.getByTestId("public-demo");
    const disclosure = screen.getByText("How the demo works");
    const adults = screen.getByRole("link", {
      name: "For teachers and families",
    });

    const precedes = (a: Node, b: Node) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    expect(precedes(heading, panel)).toBe(true);
    expect(precedes(panel, disclosure)).toBe(true);
    expect(precedes(disclosure, adults)).toBe(true);

    // On `lg` the same two return to the left column, under the intro — and
    // nothing stretches them down the height of the game beside them.
    const column = adults.closest("div");
    expect(column?.className).toContain("lg:row-start-2");
    expect(column?.className).toContain("lg:self-start");
    expect(column?.className).not.toContain("mt-auto");
  });

  it("no longer carries the removed homepage modules", () => {
    renderPage();
    expect(screen.queryByText(/Early Access Goal/i)).toBeNull();
    expect(screen.queryByText(/join our first 1,000 users/i)).toBeNull();
    expect(screen.queryByText(/See what learning looks like/i)).toBeNull();
    expect(
      screen.queryByText(/Built differently for different ages/i),
    ).toBeNull();
    expect(screen.queryByText(/Rhyme Ride/i)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull(); // the feedback form moved
    expect(screen.queryByRole("button", { name: /\$\d+/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /give monthly/i })).toBeNull();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("presents exactly three honest grade stages, marking 6–8 as coming soon", () => {
    renderPage();
    expect(screen.getByText("Grades K–2")).toBeInTheDocument();
    expect(screen.getByText("Grades 3–5")).toBeInTheDocument();
    expect(screen.getByText("Grades 6–8")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon").length).toBeGreaterThan(0);
  });

  it("fires homepage_viewed once on mount and nothing else", () => {
    renderPage();
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "homepage_viewed" });
  });

  describe("the role panel", () => {
    it("opens on Teachers, as a radio group with one control in the tab order", () => {
      renderPage();
      const group = screen.getByRole("radiogroup", {
        name: "Choose teachers or families",
      });
      const [teachers, families] = within(group).getAllByRole("radio");
      expect(teachers).toHaveTextContent("Teachers");
      expect(teachers).toHaveAttribute("aria-checked", "true");
      expect(families).toHaveAttribute("aria-checked", "false");
      expect(teachers).toHaveAttribute("tabindex", "0");
      expect(families).toHaveAttribute("tabindex", "-1");
    });

    it("moves with the arrow keys, taking the focus with it", async () => {
      const user = userEvent.setup();
      renderPage();
      const group = screen.getByRole("radiogroup");
      const [teachers, families] = within(group).getAllByRole("radio");

      teachers.focus();
      await user.keyboard("{ArrowRight}");
      expect(families).toHaveAttribute("aria-checked", "true");
      expect(families).toHaveFocus();

      await user.keyboard("{ArrowLeft}");
      expect(teachers).toHaveAttribute("aria-checked", "true");
      expect(teachers).toHaveFocus();
    });

    it("gives teachers their three actions, with the existing events", async () => {
      const user = userEvent.setup();
      renderPage();

      const signup = screen.getByRole("link", {
        name: "Create a teacher account",
      });
      expect(signup).toHaveAttribute("href", "/teacher/signup");
      expect(
        screen.getByRole("link", { name: "Sign in as a teacher" }),
      ).toHaveAttribute("href", "/teacher-login");

      trackMock.mockClear();
      await user.click(signup);
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith({
        kind: "signup_clicked",
        audience: "teacher",
      });

      // The tertiary action is a sign-in, and no event kind describes it.
      trackMock.mockClear();
      await user.click(
        screen.getByRole("link", { name: "Sign in as a teacher" }),
      );
      expect(trackMock).not.toHaveBeenCalled();
    });

    it("gives families theirs once Families is selected", async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByRole("radio", { name: "Families" }));

      expect(
        screen.getByRole("link", { name: "Join with a class code" }),
      ).toHaveAttribute("href", "/class-login");
      expect(
        screen.getByRole("link", { name: "Create a home group" }),
      ).toHaveAttribute("href", "/teacher/signup?intent=home");
      expect(
        screen.queryByRole("link", { name: "Create a teacher account" }),
      ).toBeNull();

      // Neither family action has a matching event kind.
      trackMock.mockClear();
      await user.click(
        screen.getByRole("link", { name: "Join with a class code" }),
      );
      await user.click(
        screen.getByRole("link", { name: "Create a home group" }),
      );
      expect(trackMock).not.toHaveBeenCalled();
    });

    it("keeps both landings reachable whichever side is selected", async () => {
      const user = userEvent.setup();
      renderPage();

      const teacherPath = screen.getByRole("link", { name: "Teacher paths" });
      const familyPath = screen.getByRole("link", { name: "Family paths" });
      expect(teacherPath).toHaveAttribute("href", "/for-teachers");
      expect(familyPath).toHaveAttribute("href", "/for-families");

      trackMock.mockClear();
      await user.click(teacherPath);
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith({ kind: "teacher_page_clicked" });

      trackMock.mockClear();
      await user.click(familyPath);
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith({ kind: "parent_page_clicked" });

      // Still both, on the other side of the control.
      await user.click(screen.getByRole("radio", { name: "Families" }));
      expect(
        screen.getByRole("link", { name: "Teacher paths" }),
      ).toHaveAttribute("href", "/for-teachers");
      expect(
        screen.getByRole("link", { name: "Family paths" }),
      ).toHaveAttribute("href", "/for-families");
    });

    it("remembers the choice for the session, and nothing about who made it", async () => {
      const user = userEvent.setup();
      const first = renderPage();
      expect(sessionStorage.getItem(ROLE_KEY)).toBeNull();

      await user.click(screen.getByRole("radio", { name: "Families" }));
      expect(sessionStorage.getItem(ROLE_KEY)).toBe("family");
      first.unmount();

      renderPage();
      expect(screen.getByRole("radio", { name: "Families" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("opens on Teachers when the stored value is anything else", () => {
      sessionStorage.setItem(ROLE_KEY, "../evil");
      renderPage();
      expect(screen.getByRole("radio", { name: "Teachers" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("carries ?source=nonprofit through to both landings, and only that value", () => {
      const nonprofit = renderPage("/?source=nonprofit");
      expect(
        screen.getByRole("link", { name: "Teacher paths" }),
      ).toHaveAttribute("href", "/for-teachers?source=nonprofit");
      expect(
        screen.getByRole("link", { name: "Family paths" }),
      ).toHaveAttribute("href", "/for-families?source=nonprofit");
      nonprofit.unmount();

      for (const search of [
        "?source=nonprofit&utm_campaign=spring",
        "?source=evil",
        "?utm_campaign=spring",
      ]) {
        const view = renderPage(`/${search}`);
        expect(
          screen.getByRole("link", { name: "Teacher paths" }),
        ).toHaveAttribute("href", "/for-teachers");
        expect(
          screen.getByRole("link", { name: "Family paths" }),
        ).toHaveAttribute("href", "/for-families");
        view.unmount();
      }
    });
  });

  it("states current availability and the future 6–8 band without inventing released games", () => {
    renderPage();
    expect(document.getElementById("access")).not.toBeNull();
    expect(
      screen.getByText(
        "Learning experiences for K–2 and grades 3–5 are available now. Grades 6–8 are coming soon. English and Spanish availability varies by activity.",
      ),
    ).toBeInTheDocument();
  });

  it("carries the three plan links inside #plans, each with its own payload", async () => {
    const user = userEvent.setup();
    renderPage();

    const plans = document.getElementById("plans");
    expect(plans).not.toBeNull();

    const expected = [
      ["Learner", "/plans/learner", "learner"],
      ["Classroom", "/plans/classroom", "classroom"],
      ["Organization", "/plans/organization", "organization"],
    ] as const;

    expect(
      within(plans as HTMLElement)
        .getAllByRole("link")
        .map((el) => [el.textContent, el.getAttribute("href")]),
    ).toEqual(expected.map(([label, href]) => [label, href]));

    for (const [label, , slug] of expected) {
      trackMock.mockClear();
      await user.click(screen.getByRole("link", { name: label }));
      expect(trackMock).toHaveBeenCalledTimes(1);
      expect(trackMock).toHaveBeenCalledWith({
        kind: "free_plan_clicked",
        plan: slug,
      });
    }
  });

  it("carries the giving link in the footer, firing donation_clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    const giving = screen.getByRole("link", { name: "Support Bright Boost" });
    expect(giving).toHaveAttribute("href", "/donate");

    trackMock.mockClear();
    await user.click(giving);
    expect(trackMock).toHaveBeenCalledWith({ kind: "donation_clicked" });
  });

  it("carries the footer feedback link, firing feedback_clicked once and carrying no payload", async () => {
    const user = userEvent.setup();
    renderPage();
    const feedback = screen.getByRole("link", { name: "Give feedback" });
    expect(feedback).toHaveAttribute("href", "/feedback");

    trackMock.mockClear();
    await user.click(feedback);
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({ kind: "feedback_clicked" });
  });

  describe("metadata", () => {
    let previousHead: string;
    beforeEach(() => {
      previousHead = document.head.innerHTML;
      const html = readFileSync(
        path.resolve(__dirname, "../../../index.html"),
        "utf8",
      );
      document.head.innerHTML = new DOMParser().parseFromString(
        html,
        "text/html",
      ).head.innerHTML;
    });
    afterEach(() => {
      cleanup();
      document.head.innerHTML = previousHead;
    });

    it("updates the static tags in place and restores them on unmount", () => {
      const staticTags = [
        ...document.head.querySelectorAll("title, meta, link"),
      ];
      const originalMarkup = staticTags.map((node) => node.outerHTML);
      const { unmount } = renderPage("/?utm_campaign=spring");
      expect(document.title).toBe(
        "Bright Boost — A world you build by learning",
      );
      expect(
        document.head
          .querySelector('meta[name="description"]')
          ?.getAttribute("content"),
      ).toBe(
        "Explore Bright Boost STEM games. Play a free robot mission, then choose the right starting point for your classroom or family.",
      );
      expect(
        document.head
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content"),
      ).toBe("Bright Boost — A world you build by learning");
      expect(
        document.head
          .querySelector('link[rel="canonical"]')
          ?.getAttribute("href"),
      ).toBe("https://brightboost.org/");
      expect([...document.head.querySelectorAll("title, meta, link")]).toEqual(
        staticTags,
      );
      expect(
        document.head
          .querySelector('meta[property="og:url"]')
          ?.getAttribute("content"),
      ).toBe("https://brightboost.org/");
      unmount();
      expect(
        [...document.head.querySelectorAll("title, meta, link")].map(
          (node) => node.outerHTML,
        ),
      ).toEqual(originalMarkup);
    });

    it("emits structured data with no education level and no invented nonprofit URL", () => {
      const { unmount } = renderPage();
      const node = document.getElementById("bb-home-schema");
      expect(node).not.toBeNull();

      const data = JSON.parse(node?.textContent ?? "{}");
      expect(data["@type"]).toBe("Organization");
      expect(data.name).toBe("Bright Boost");
      expect(data.parentOrganization).toEqual({
        "@type": "Organization",
        name: "Bright Bots Initiative",
      });
      // The product origin is not the nonprofit's address, and no rating,
      // outcome or grade-level claim rides along.
      expect(data.parentOrganization.url).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain("educationalLevel");
      expect(JSON.stringify(data)).not.toContain("aggregateRating");

      unmount();
      expect(document.getElementById("bb-home-schema")).toBeNull();
    });
  });

  describe("legacy compatibility", () => {
    it.each([
      ["donation", "/donate"],
      ["feedback", "/feedback"],
    ])(
      "sends the stored %s handoff to %s and clears the key",
      async (stored, expected) => {
        sessionStorage.setItem(LEGACY_KEY, stored);
        renderRouted();
        await waitFor(() =>
          expect(screen.getByTestId("location")).toHaveTextContent(expected),
        );
        expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();
        expect(screen.getByTestId("navigation-type")).toHaveTextContent(
          "REPLACE",
        );
      },
    );

    // Two calls, not one: the frame settle, and the one correction the demo
    // panel's ready signal triggers. There is no `document.fonts` in jsdom and
    // the document is already complete, so those two follow-ups do not run
    // here — the bounded-settle block below stubs both and counts all of them.
    it("scrolls #plans into view for the stored plans handoff", async () => {
      sessionStorage.setItem(LEGACY_KEY, "plans");
      renderRouted();
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
      expect(screen.getByTestId("location")).toHaveTextContent("/");
      expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it("ignores an unrecognised stored value but still clears the key", async () => {
      sessionStorage.setItem(LEGACY_KEY, "../evil");
      renderRouted();
      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/"),
      );
      expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it.each([
      ["#donation", "/donate"],
      ["#feedback", "/feedback"],
    ])("sends the legacy %s fragment to %s", async (hash, expected) => {
      renderRouted(`/${hash}`);
      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent(expected),
      );
      // Replaced, not pushed: the entry the visitor came in on is gone, so
      // Back leaves the site instead of bouncing off `/` and redirecting again.
      expect(screen.getByTestId("navigation-type")).toHaveTextContent(
        "REPLACE",
      );
    });

    // A browser can only scroll to a fragment that exists in the document it
    // parsed, and this document is empty until React renders — so a direct
    // load of either in-page anchor is the page's own job.
    it.each([["#plans"], ["#for-adults"]])(
      "scrolls %s into view on a direct load",
      async (hash) => {
        renderRouted(`/${hash}`);
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
        expect(screen.getByTestId("location")).toHaveTextContent("/");
      },
    );

    it("leaves an unknown fragment alone", async () => {
      renderRouted("/#something-else");
      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/"),
      );
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });

  /**
   * The anchor scroll is computed on the first frame, against a layout the
   * web font has not reflowed yet — which is how a `/#plans` load lands a few
   * hundred pixels short. The fix is one more run of the same call when the
   * fonts settle, and the thing that has to be proved is that it is ONE more:
   * a settle loop, an observer or a poll would also make the number go up, and
   * would keep going up.
   *
   * jsdom implements no `document.fonts`, so it is installed here as a promise
   * this test resolves by hand.
   */
  describe("bounded scroll settle", () => {
    let resolveFonts: () => void = () => {};

    beforeEach(() => {
      const ready = new Promise<void>((resolve) => {
        resolveFonts = resolve;
      });
      Object.defineProperty(document, "fonts", {
        value: { ready },
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      delete (document as unknown as Record<string, unknown>).fonts;
      delete (document as unknown as Record<string, unknown>).readyState;
    });

    /**
     * `readyState` is a getter on the document, so it is shadowed by an own
     * property and deleted again afterwards. The value matters: on a reload the
     * document reaches `"interactive"` (~7ms) long before this effect runs, so
     * the `load` follow-up has to be attached for anything short of
     * `"complete"` — testing for `"loading"` attached it never.
     */
    function stubReadyState(value: DocumentReadyState) {
      Object.defineProperty(document, "readyState", {
        value,
        writable: true,
        configurable: true,
      });
    }

    /** Let every already-queued microtask, frame and timer run out. */
    async function quiesce() {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    }

    async function fireLoad() {
      await act(async () => {
        window.dispatchEvent(new Event("load"));
      });
    }

    it.each([["#plans"], ["#for-adults"]])(
      "scrolls %s on the frame, once more when the fonts settle, and never again once the document is complete",
      async (hash) => {
        stubReadyState("complete");
        renderRouted(`/${hash}`);
        // The demo panel reported ready before the page's own effect ran, so
        // its correction is the first of the three, not the last.
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));

        await act(async () => {
          resolveFonts();
        });
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(3));

        // Nothing was listening for `load`, because there was nothing left to
        // load — so a stray `load` event adds no fourth call, and the panel
        // reports ready only once however many times it renders.
        await fireLoad();
        await quiesce();
        expect(scrollIntoView).toHaveBeenCalledTimes(3);
        expect(scrollIntoView).toHaveBeenLastCalledWith({
          behavior: "auto",
          block: "start",
        });
      },
    );

    /**
     * The reload case, and the one the `"loading"` test missed entirely: on a
     * reload of `/#for-adults` at 1440x900 the smooth scroll finished 104px
     * short and stayed there, because the late stylesheet reflow arrived after
     * both earlier follow-ups and no `load` listener had been attached.
     */
    it.each([["#plans"], ["#for-adults"]])(
      "settles %s a final time on load when the document is still interactive at mount",
      async (hash) => {
        stubReadyState("interactive");
        renderRouted(`/${hash}`);
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));

        await act(async () => {
          resolveFonts();
        });
        await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(3));

        await fireLoad();
        expect(scrollIntoView).toHaveBeenCalledTimes(4);

        // `{ once: true }`: a second `load` — and any amount of further time —
        // adds nothing. Four is the ceiling, not a starting point.
        await fireLoad();
        await quiesce();
        expect(scrollIntoView).toHaveBeenCalledTimes(4);
        expect(scrollIntoView).toHaveBeenLastCalledWith({
          behavior: "auto",
          block: "start",
        });
      },
    );

    it("consumes the stored plans handoff once and settles the bounded number of times, no further", async () => {
      stubReadyState("interactive");
      sessionStorage.setItem(LEGACY_KEY, "plans");
      renderRouted();
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(2));
      expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();

      await act(async () => {
        resolveFonts();
      });
      await fireLoad();
      await quiesce();
      expect(scrollIntoView).toHaveBeenCalledTimes(4);
      expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();
    });

    it.each([["#something-else"], ["#donate"], ["#hero"]])(
      "never scrolls for %s, not after the fonts settle and not on load",
      async (hash) => {
        stubReadyState("interactive");
        renderRouted(`/${hash}`);
        await waitFor(() =>
          expect(screen.getByTestId("location")).toHaveTextContent("/"),
        );
        await act(async () => {
          resolveFonts();
        });
        await fireLoad();
        await quiesce();
        expect(scrollIntoView).not.toHaveBeenCalled();
      },
    );

    it("never scrolls for an unrecognised stored value, not after the fonts settle and not on load", async () => {
      stubReadyState("interactive");
      sessionStorage.setItem(LEGACY_KEY, "../evil");
      renderRouted();
      await waitFor(() =>
        expect(screen.getByTestId("location")).toHaveTextContent("/"),
      );
      expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();

      await act(async () => {
        resolveFonts();
      });
      await fireLoad();
      await quiesce();
      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
});
