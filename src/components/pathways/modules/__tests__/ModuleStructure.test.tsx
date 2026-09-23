/**
 * ModuleStructure — section-progress persistence contract.
 *
 * A section's completion flag gates the quiz, module completion, XP and
 * badges server-side. These tests pin that each completed section is sent
 * exactly once, that a failed save is shown to the learner instead of being
 * swallowed, and that Retry re-sends only what is still unsaved.
 */
import { StrictMode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ModuleStructure, { type SectionKey } from "../ModuleStructure";
import type { ModuleContent } from "../cyberLaunchContent";

const celebrateSpy = vi.hoisted(() => vi.fn());
vi.mock("../../gamification/CelebrationContext", () => ({
  useCelebrate: () => ({ celebrate: celebrateSpy }),
}));

const SECTION_URL = "/api/pathways/student/milestones/section";
const HOMEWORK_URL = "/api/pathways/student/milestones/homework";

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
    fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input, init) => {
        const url = String(input);
        if (url === HOMEWORK_URL) return ok();
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

  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));

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
});
