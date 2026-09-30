/**
 * ModuleStructure — section-progress persistence contract.
 *
 * A section's completion flag gates the quiz, module completion, XP and
 * badges server-side. These tests pin that each completed section is sent
 * exactly once, that a failed save is shown to the learner instead of being
 * swallowed, that Retry re-sends only what is still unsaved, and — with the
 * real ModulePlayer rendered — that the parent's "Module Complete" screen
 * never replaces the shell while a failure and its Retry are showing.
 */
import { StrictMode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ModuleStructure, { type SectionKey } from "../ModuleStructure";
import ModulePlayer from "../../ModulePlayer";
import type { ModuleContent } from "../cyberLaunchContent";

const celebrateSpy = vi.hoisted(() => vi.fn());
vi.mock("../../gamification/CelebrationContext", () => ({
  useCelebrate: () => ({ celebrate: celebrateSpy }),
}));

// English strings from the real locale file, so assertions read as a learner
// sees them. A string second argument is i18next's default value.
vi.mock("react-i18next", async () => {
  const en = (await import("@/locales/en/pathways.json")).default;
  return {
    useTranslation: () => ({
      t: (key: string, opts?: string | Record<string, unknown>) => {
        let value: unknown = en;
        for (const k of key.split("."))
          value = (value as Record<string, unknown> | undefined)?.[k];
        const vars = typeof opts === "object" ? opts : {};
        const text =
          typeof value === "string"
            ? value
            : typeof opts === "string"
              ? opts
              : key;
        return text.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k]));
      },
    }),
  };
});

// ModulePlayer lazy-loads the module router; swap it for the shell over the
// fixture below so the real parent drives completion without real content.
const player = vi.hoisted(() => ({ skipQuiz: false }));
vi.mock("../CyberLaunchModules", async () => {
  const { default: Shell } = await import("../ModuleStructure");
  return {
    default: ({
      onComplete,
      onBack,
    }: {
      onComplete: (score: number) => void;
      onBack: () => void;
    }) => (
      <Shell
        content={{ ...CONTENT, skipQuiz: player.skipQuiz }}
        onBack={onBack}
        onComplete={onComplete}
        renderQuiz={({ onQuizComplete }) => (
          <button type="button" onClick={() => onQuizComplete(80)}>
            Finish quiz
          </button>
        )}
      />
    ),
  };
});

const SECTION_URL = "/api/pathways/student/milestones/section";
const HOMEWORK_URL = "/api/pathways/student/milestones/homework";
const MILESTONE_URL = "/api/pathways/student/milestones";

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

type Reply = () => Promise<Response>;

function jsonReply(status: number, body: unknown): Reply {
  return () =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      statusText: status >= 200 && status < 300 ? "OK" : "Error",
      json: () => Promise.resolve(body),
    } as Response);
}

const ok = jsonReply(200, {
  gamification: { award: null, badges: [], moduleCompleted: false },
});
const serverError = jsonReply(500, { error: "boom" });
const networkError: Reply = () =>
  Promise.reject(new TypeError("Failed to fetch"));
const htmlOn200: Reply = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.reject(new SyntaxError("Unexpected token '<'")),
  } as Response);

describe("ModuleStructure section persistence", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  // Per-section queue of replies; a section with no queued reply succeeds.
  let replies: Partial<Record<SectionKey, Reply[]>>;

  beforeEach(() => {
    celebrateSpy.mockClear();
    replies = {};
    player.skipQuiz = false;
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url !== SECTION_URL) return ok();
        const { section } = JSON.parse(String(init?.body)) as {
          section: SectionKey;
        };
        const next = replies[section]?.shift();
        return (next ?? ok)();
      });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function sectionCalls(): SectionKey[] {
    return fetchSpy.mock.calls
      .filter(([input]) => String(input) === SECTION_URL)
      .map(
        ([, init]) =>
          (JSON.parse(String(init?.body)) as { section: SectionKey }).section,
      );
  }

  // Section PATCHes and ModulePlayer's completion POST, in the order sent.
  function saveOrder(): string[] {
    return fetchSpy.mock.calls.flatMap(([input, init]) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        section?: SectionKey;
        status?: string;
        score?: number;
      };
      if (String(input) === SECTION_URL) return [String(body.section)];
      if (String(input) === MILESTONE_URL && body.status === "completed")
        return [`completed:${body.score}`];
      return [];
    });
  }

  function renderModule(
    props: Partial<React.ComponentProps<typeof ModuleStructure>> = {},
  ) {
    return render(
      <StrictMode>
        <ModuleStructure
          content={CONTENT}
          onBack={() => {}}
          onComplete={() => {}}
          renderQuiz={() => <p>Quiz goes here</p>}
          {...props}
        />
      </StrictMode>,
    );
  }

  // The real completion parent: it replaces the shell with "Module Complete"
  // once onComplete's POST settles.
  function renderPlayer() {
    return render(
      <StrictMode>
        <MemoryRouter
          initialEntries={["/pathways/tracks/cyber-launch/cyber-foundations"]}
        >
          <Routes>
            <Route
              path="/pathways/tracks/:trackSlug/:moduleSlug"
              element={<ModulePlayer />}
            />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );
  }

  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));

  async function completeFirstFive(submit = "Submit homework →") {
    fireEvent.click(await screen.findByRole("button", { name: "I'm ready →" }));
    click("Done reading →");
    click("Finish lesson →");
    click("Done with practice →");
    fireEvent.change(screen.getByPlaceholderText("Type here"), {
      target: { value: "My answer" },
    });
    click(submit);
  }

  it("sends exactly one PATCH per completed section under StrictMode", async () => {
    renderModule();
    click("I'm ready →");
    click("Done reading →");
    click("Finish lesson →");
    await waitFor(() =>
      expect(sectionCalls()).toEqual(["hook", "reading", "lesson"]),
    );
  });

  it("does not re-send a section supplied as complete via initialProgress", async () => {
    renderModule({ initialProgress: { hook: true } });
    click("Continue →");
    click("Done reading →");
    await waitFor(() => expect(sectionCalls()).toEqual(["reading"]));
  });

  it.each([
    ["a non-2xx status", serverError],
    ["a network error", networkError],
    ["a 2xx body that is not JSON", htmlOn200],
  ])(
    "shows a save-failure notice naming the section on %s",
    async (_label, reply) => {
      replies.hook = [reply];
      renderModule();
      click("I'm ready →");
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(
        "Couldn't save your progress for: Why It Matters",
      );
    },
  );

  it("shows no notice on success and still forwards gamification to celebrate", async () => {
    const badge = {
      slug: "reader",
      name: "Reader",
      description: "Read it all",
      icon: "book",
    };
    replies.reading = [
      jsonReply(200, {
        gamification: { award: null, badges: [badge], moduleCompleted: false },
      }),
    ];
    renderModule();
    click("I'm ready →");
    click("Done reading →");
    await waitFor(() =>
      expect(celebrateSpy).toHaveBeenCalledWith([{ type: "badge", ...badge }]),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the section complete, the quiz unlocked, and navigation open after a failure", async () => {
    replies.hook = [serverError];
    renderModule();
    click("I'm ready →");
    click("Done reading →");
    click("Finish lesson →");
    click("Done with practice →");
    fireEvent.change(screen.getByPlaceholderText("Type here"), {
      target: { value: "My answer" },
    });
    click("Submit homework →");
    // The quiz renders only when all five earlier sections are locally complete.
    await screen.findByText("Quiz goes here");
    expect(screen.getByRole("alert")).toHaveTextContent("Why It Matters");
    click("Why It Matters");
    // A completed hook section offers "Continue →" rather than "I'm ready →".
    expect(
      screen.getByRole("button", { name: "Continue →" }),
    ).toBeInTheDocument();
  });

  it("re-sends unsaved sections on Retry, once at a time, and clears the notice", async () => {
    let release!: () => void;
    const held: Reply = () =>
      new Promise((resolve) => (release = () => resolve(ok())));
    replies.hook = [serverError, held];
    renderModule();
    click("I'm ready →");
    await screen.findByRole("alert");

    click("Retry");
    const retrying = screen.getByRole("button", { name: "Retrying…" });
    expect(retrying).toBeDisabled();
    fireEvent.click(retrying);
    expect(sectionCalls()).toEqual(["hook", "hook"]);

    release();
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(sectionCalls()).toEqual(["hook", "hook"]);
  });

  it("does not re-send a section that already succeeded on retry", async () => {
    replies.hook = [serverError];
    replies.reading = [serverError];
    renderModule();
    click("I'm ready →");
    await screen.findByRole("alert");
    click("Retry");
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );

    click("Done reading →");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't save your progress for: Read");
    expect(alert).not.toHaveTextContent("Why It Matters");
    click("Retry");
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(sectionCalls()).toEqual(["hook", "hook", "reading", "reading"]);
  });

  it("hands the parent the score only after the quiz save lands", async () => {
    let release!: () => void;
    replies.quiz = [
      () => new Promise((resolve) => (release = () => resolve(ok()))),
    ];
    renderPlayer();
    await completeFirstFive();
    fireEvent.click(await screen.findByRole("button", { name: "Finish quiz" }));
    await waitFor(() => expect(sectionCalls()).toContain("quiz"));
    expect(saveOrder()).not.toContain("completed:80");

    release();
    expect(await screen.findByText("Module Complete")).toBeInTheDocument();
    expect(saveOrder()).toEqual([
      "hook",
      "reading",
      "lesson",
      "practice",
      "homework",
      "quiz",
      "completed:80",
    ]);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps a failed quiz save visible and retryable instead of showing Module Complete", async () => {
    replies.quiz = [serverError];
    renderPlayer();
    await completeFirstFive();
    fireEvent.click(await screen.findByRole("button", { name: "Finish quiz" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Couldn't save your progress for: Quiz");
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.queryByText("Module Complete")).not.toBeInTheDocument();
    expect(saveOrder()).not.toContain("completed:80");

    click("Retry");
    expect(await screen.findByText("Module Complete")).toBeInTheDocument();
    expect(saveOrder().slice(-3)).toEqual(["quiz", "quiz", "completed:80"]);
  });

  it("holds the capstone's completion while an earlier section is unsaved", async () => {
    player.skipQuiz = true;
    replies.hook = [serverError];
    renderPlayer();
    await completeFirstFive("Submit capstone →");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Couldn't save your progress for: Why It Matters",
    );
    await waitFor(() => expect(sectionCalls()).toContain("homework"));
    expect(screen.queryByText("Module Complete")).not.toBeInTheDocument();
    expect(saveOrder()).not.toContain("completed:100");

    click("Retry");
    expect(await screen.findByText("Module Complete")).toBeInTheDocument();
    expect(saveOrder().slice(-2)).toEqual(["hook", "completed:100"]);
  });
});
