import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";
import SparBotsGame from "./SparBotsGame";
import { counter, practiceTell, storageKey } from "./model";

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
            width: context.parameters.mobile ? 390 : 1050,
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
      localStorage.removeItem(storageKey(scope));
    },
    play: async ({ canvasElement }) => {
      const canvas = within(canvasElement);
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
        await userEvent.click(
          canvas.getByRole("button", {
            name: copy.moves[counter(practiceTell(0, 0, i).move)],
          }),
        );
        await userEvent.click(
          canvas.getByRole("button", { name: copy.keepCard }),
        );
      }
      await userEvent.click(canvas.getByRole("button", { name: copy.train }));
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
      const article = canvasElement.querySelector("article")!;
      await expect(article.scrollWidth).toBeLessThanOrEqual(
        article.clientWidth + 1,
      );
      if (!(canvas.getByLabelText(copy.reduced) as HTMLInputElement).checked)
        await userEvent.click(canvas.getByLabelText(copy.reduced));
      await expect(article).toHaveAttribute("data-reduced-effects", "true");
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
