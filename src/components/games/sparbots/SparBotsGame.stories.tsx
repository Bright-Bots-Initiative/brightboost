import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, waitFor } from "@storybook/test";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import SparBotsGame from "./SparBotsGame";
import {
  counter,
  FINISHES,
  parseDraft,
  practiceTell,
  storageKey,
} from "./model";
import { REDUCED_EFFECTS_STORAGE_KEY } from "../shared/useReducedGameEffects";

const english = createInstance(),
  spanish = createInstance();
for (const [instance, lng] of [
  [english, "en"],
  [spanish, "es"],
] as const) {
  void instance.init({
    lng,
    fallbackLng: "en",
    resources: { en: { translation: en }, es: { translation: es } },
    interpolation: { escapeValue: false },
  });
}
const meta: Meta<typeof SparBotsGame> = {
  title: "Games/SparBots",
  component: SparBotsGame,
  parameters: { layout: "padded" },
  decorators: [
    (Story, context) => (
      <I18nextProvider
        i18n={context.parameters.language === "es" ? spanish : english}
      >
        <div
          style={{
            maxWidth: "100%",
            width: context.parameters.mobile ? 320 : 1050,
          }}
        >
          <Story />
        </div>
      </I18nextProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof meta>;

function coachingStory(language: "en" | "es"): Story {
  const copy = language === "es" ? es.sparbots : en.sparbots;
  const scope = `storybook-sparbots-${language}`;
  return {
    args: { storageScope: scope },
    parameters: {
      language,
      mobile: language === "es",
      viewport: { defaultViewport: language === "es" ? "mobile1" : undefined },
    },
    beforeEach: () => {
      const preference = localStorage.getItem(REDUCED_EFFECTS_STORAGE_KEY);
      localStorage.setItem(REDUCED_EFFECTS_STORAGE_KEY, "false");
      localStorage.removeItem(storageKey(scope));
      return () => {
        localStorage.removeItem(storageKey(scope));
        if (preference === null)
          localStorage.removeItem(REDUCED_EFFECTS_STORAGE_KEY);
        else localStorage.setItem(REDUCED_EFFECTS_STORAGE_KEY, preference);
      };
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
      const article = canvasElement.querySelector("article")!;
      const systemReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (!systemReduced) {
        // Sample a real browser animation at two times, without a timing race.
        const body = article.querySelector(".sparbot-body")!;
        const breathing = body.getAnimations()[0];
        await expect(breathing).toBeDefined();
        const idle = article
          .querySelector(".sparbot")!
          .getAnimations({ subtree: true });
        await expect(
          idle.every(
            (a) => Number(a.effect!.getComputedTiming().endTime) <= 8000,
          ),
        ).toBe(true);
        breathing.pause();
        breathing.currentTime = 0;
        const rest = getComputedStyle(body).transform;
        breathing.currentTime = 1800;
        await waitFor(() =>
          expect(getComputedStyle(body).transform).not.toBe(rest),
        );
        breathing.play();
      }
      const start = canvas.getByRole("button", { name: copy.start });
      start.focus();
      await userEvent.keyboard("{Enter}");
      await expect(
        canvas.getByRole("heading", { name: copy.screens.meet }),
      ).toHaveFocus();
      await userEvent.click(
        canvas.getByRole("button", { name: copy.showExamples }),
      );
      for (let i = 0; i < 6; i++) {
        const move = counter(practiceTell(0, 0, i).move);
        await userEvent.click(
          canvas.getByRole("button", {
            name: copy.moves[move],
          }),
        );
        const action = article.querySelector(
          ".sparbots-practice-result .sparbot-motion",
        )!;
        await expect(getComputedStyle(action).animationName).toBe(
          systemReduced ? "none" : `sparbot-${move}`,
        );
        await userEvent.click(
          canvas.getByRole("button", { name: copy.keepCard }),
        );
      }
      await userEvent.click(canvas.getByRole("button", { name: copy.train }));
      await expect(
        canvas.getByRole("button", { name: copy.watchAgain }),
      ).toBeDisabled();
      await expect(
        Array.from(article.querySelectorAll(".sparbots-training svg"), (svg) =>
          svg.getAttribute("data-pose"),
        ),
      ).toEqual(["wide", "low", "wide"]);
      await expect(
        getComputedStyle(article.querySelector(".sparbots-training span")!)
          .animationName,
      ).toBe(systemReduced ? "none" : "sparbot-train-card");
      await userEvent.click(
        canvas.getByRole("button", { name: copy.nextBeat }),
      );
      await expect(canvas.getByText(copy.confidence.all)).toBeVisible();
      await expect(
        canvas.getByRole("meter", { name: copy.yourSparks }),
      ).toHaveAttribute("value", "1");
      await expect(
        canvas.queryByRole("button", { name: copy.moves.tap }),
      ).not.toBeInTheDocument();
      await expect(
        within(
          article.querySelector(".sparbots-arena") as HTMLElement,
        ).getByText(copy.lastBeat.replace("{{number}}", "1")),
      ).toBeVisible();
      await expect(
        getComputedStyle(
          article.querySelector(".sparbots-next-clue .sparbot-body")!,
        ).animationName,
      ).toBe("none");
      const decision = canvas.getByRole("list", { name: copy.decisionPath });
      await expect(
        within(decision)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ).toEqual([
        copy.poses.wide,
        copy.votingCards.replace("{{count}}", "3"),
        copy.moves.tap,
      ]);
      const replay = canvas.getByRole("button", { name: copy.watchAgain });
      replay.focus();
      await userEvent.keyboard("{Enter}");
      const flight = article.querySelector<SVGSVGElement>(
        ".sparbots-spark-flight",
      )!;
      const animation = systemReduced ? undefined : flight.getAnimations()[0];
      animation?.pause();
      await expect(replay).toHaveFocus();
      await expect(
        canvas.getByText(copy.replayBeat.replace("{{number}}", "1")),
      ).toBeVisible();
      await expect(flight.closest("[data-side]")).toHaveAttribute(
        "data-side",
        "bot",
      );
      const slot = flight.parentElement!;
      await expect(slot).toHaveAttribute("data-filled", "true");
      await expect(
        article.querySelectorAll('.sparbots-socket[data-filled="true"]'),
      ).toHaveLength(1);
      if (!systemReduced) {
        // Compare the landing point with its real socket at both viewport widths.
        await expect(animation).toBeDefined();
        const timing = animation!.effect!.getTiming();
        const sample = (fraction: number) => {
          animation!.currentTime =
            Number(timing.delay) + Number(timing.duration) * fraction;
          const { x, y, width, height } = flight.getBoundingClientRect();
          return { x: x + width / 2, y: y + height / 2 };
        };
        const launch = sample(0.22),
          landing = sample(0.82);
        const target = slot.getBoundingClientRect();
        await expect(launch.x).toBeGreaterThan(landing.x + 5);
        await expect(launch.y).toBeLessThan(landing.y - 5);
        await expect(
          Math.abs(landing.x - (target.x + target.width / 2)),
        ).toBeLessThan(1.5);
        await expect(
          Math.abs(landing.y - (target.y + target.height / 2)),
        ).toBeLessThan(1.5);
        animation!.play();
      }
      await expect(article.scrollWidth).toBeLessThanOrEqual(
        article.clientWidth + 1,
      );
      if (!(canvas.getByLabelText(copy.reduced) as HTMLInputElement).checked)
        await userEvent.click(canvas.getByLabelText(copy.reduced));
      await expect(article).toHaveAttribute("data-reduced-effects", "true");
      await waitFor(() =>
        expect(article.getAnimations({ subtree: true })).toHaveLength(0),
      );
      await expect(getComputedStyle(flight).opacity).toBe("0");
      // Less motion still allows the next beat and keeps its result visible.
      await userEvent.click(
        canvas.getByRole("button", { name: copy.nextBeat }),
      );
      await expect(
        canvas.getByRole("meter", { name: copy.yourSparks }),
      ).toHaveAttribute("value", "2");
      await expect(canvas.getByText(copy.confidence.all)).toBeVisible();
      await userEvent.click(canvas.getByRole("button", { name: copy.pause }));
      await expect(
        canvas.getByRole("heading", { name: copy.screens.corner }),
      ).toBeVisible();
      localStorage.removeItem(storageKey(scope));
    },
  };
}
export const EnglishCoaching = coachingStory("en");
export const SpanishMobileCoaching = coachingStory("es");

export const FriendlyFinishes: Story = {
  ...coachingStory("en"),
  play: async (context) => {
    await EnglishCoaching.play!(context);
    const canvas = within(context.canvasElement);
    const copy = en.sparbots;
    await userEvent.click(canvas.getByLabelText(copy.reduced));
    for (let round = 0; round < 2; round++) {
      await userEvent.click(canvas.getByRole("button", { name: copy.train }));
      // Inputs remain available even while the previous move is animating.
      for (let beat = 0; beat < 3; beat++)
        await userEvent.click(
          canvas.getByRole("button", { name: copy.nextBeat }),
        );
      await userEvent.click(
        canvas.getByRole("button", {
          name: round === 0 ? copy.toCorner : copy.showWhy,
        }),
      );
    }
    const systemReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    for (const finish of FINISHES) {
      const button = canvas.getByRole("button", {
        name: copy.finishes[finish],
      });
      await userEvent.click(button);
      const action = context.canvasElement.querySelector(
        ".sparbots-friendly-finish .sparbot-motion",
      )!;
      await expect(getComputedStyle(action).animationName).toBe(
        systemReduced
          ? "none"
          : `sparbot-${finish === "handshake" ? "hello" : finish}`,
      );
      // Selecting the same finish replays it without adding any learning state.
      await userEvent.click(button);
      await expect(
        context.canvasElement.querySelector(
          ".sparbots-friendly-finish .sparbot-motion",
        ),
      ).not.toBe(action);
    }
    await userEvent.click(
      canvas.getByRole("button", {
        name: `${copy.cardNumber.replace("{{number}}", "5")} · ${copy.moves.block}`,
      }),
    );
    await userEvent.click(canvas.getByLabelText(copy.reflections.examples));
    await userEvent.click(
      canvas.getByRole("button", { name: copy.keepDiscovery }),
    );
    await expect(
      parseDraft(localStorage.getItem(storageKey("storybook-sparbots-en"))),
    ).toMatchObject({ cleared: 1, finish: "dance", revisions: 6 });
  },
};
